import { NextResponse } from "next/server";
import { verifyAppleNotificationPayload } from "@/lib/apple-auth";
import { getAdminAuth } from "@/lib/firebase-admin";
import { getUidByAppleSub, deleteAppleSubMapping } from "@/lib/firestore";

/**
 * Sign in with Apple server-to-server notification endpoint.
 * Register this URL in Apple Developer: Sign In with Apple → Server-to-Server Notification Endpoint
 * e.g. https://tag-scribe.vercel.app/api/auth/apple/notifications
 *
 * Handles: consent-revoked, account-delete (delete Firebase user + mapping),
 *          email-enabled, email-disabled (update user email in Firebase).
 */
export async function POST(request: Request) {
  let body: { payload?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const signedPayload = typeof body.payload === "string" ? body.payload.trim() : undefined;
  if (!signedPayload) {
    return NextResponse.json({ error: "payload is required" }, { status: 400 });
  }

  const event = await verifyAppleNotificationPayload(signedPayload);
  if (!event) {
    return NextResponse.json({ error: "Invalid or expired notification" }, { status: 401 });
  }

  const uid = await getUidByAppleSub(event.sub);
  const auth = getAdminAuth();

  if (event.type === "consent-revoked" || event.type === "account-delete") {
    if (uid && auth) {
      try {
        await auth.deleteUser(uid);
      } catch (e) {
        console.error("[Apple notifications] deleteUser failed:", e);
      }
    }
    await deleteAppleSubMapping(event.sub);
    return NextResponse.json({ ok: true });
  }

  if ((event.type === "email-enabled" || event.type === "email-disabled") && event.email && uid && auth) {
    try {
      await auth.updateUser(uid, { email: event.email, emailVerified: true });
    } catch (e) {
      console.error("[Apple notifications] updateUser email failed:", e);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
