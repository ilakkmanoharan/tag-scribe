import { NextResponse } from "next/server";
import { verifyAppleIdentityToken } from "@/lib/apple-auth";
import { signOurJwt } from "@/lib/jwt";
import { getAdminAuth } from "@/lib/firebase-admin";
import { setAppleSubToUid, getUidByAppleSub, ensureUserDetails } from "@/lib/firestore";
import type { AppleTokenPayload } from "@/lib/apple-auth";

function randomPassword(): string {
  const bytes = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Returns uid: existing user (by email or Apple ID) or newly created. Same email = link Apple to existing account. */
async function getOrCreateFirebaseUserFromApple(
  payload: AppleTokenPayload
): Promise<{ uid: string } | null> {
  const auth = getAdminAuth();
  if (!auth) return null;

  const email = payload.email?.trim() || `${payload.sub}@privaterelay.appleid.com`;

  // 1. Apple sub already linked (e.g. Private Relay returning user)
  const existingUidByApple = await getUidByAppleSub(payload.sub);
  if (existingUidByApple) {
    return { uid: existingUidByApple };
  }

  // 2. Existing user with same email → link Apple to this account (no 409)
  try {
    const existing = await auth.getUserByEmail(email);
    return { uid: existing.uid };
  } catch {
    // User does not exist
  }

  // 3. New user
  try {
    const user = await auth.createUser({
      email,
      emailVerified: true,
      password: randomPassword(),
    });
    return { uid: user.uid };
  } catch (e) {
    console.error("Firebase createUser (Apple) failed:", e);
    return null;
  }
}

export async function POST(request: Request) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json({ error: "Server auth not configured" }, { status: 500 });
  }

  let body: { identityToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const identityToken = typeof body.identityToken === "string" ? body.identityToken.trim() : undefined;
  if (!identityToken) {
    return NextResponse.json({ error: "identityToken is required" }, { status: 400 });
  }

  const applePayload = await verifyAppleIdentityToken(identityToken);
  if (!applePayload) {
    return NextResponse.json({ error: "Invalid or expired Apple token" }, { status: 401 });
  }

  const result = await getOrCreateFirebaseUserFromApple(applePayload);
  if (!result || !("uid" in result)) {
    return NextResponse.json({ error: "Could not create or find user" }, { status: 500 });
  }
  const uid = result.uid;
  await setAppleSubToUid(applePayload.sub, uid);
  const appleEmail = applePayload.email?.trim() || `${applePayload.sub}@privaterelay.appleid.com`;
  await ensureUserDetails(uid, { email: appleEmail, provider: "apple" });

  // Omit email from JWT when it's a private relay so client shows "Signed in with Apple" instead
  const isPrivateRelay = appleEmail.endsWith("@privaterelay.appleid.com");
  const token = signOurJwt({
    sub: uid,
    email: isPrivateRelay ? undefined : applePayload.email?.trim(),
    provider: "apple",
  });
  if (!token) {
    return NextResponse.json({ error: "Could not issue token" }, { status: 500 });
  }

  return NextResponse.json({ token });
}
