/**
 * Sync user details to Firestore after web sign-up.
 * Expects Firebase ID token (Bearer). Writes users/{uid} with email and provider "email".
 */

import { NextResponse } from "next/server";
import { verifyIdTokenWithEmail } from "@/lib/firebase-admin";
import { ensureUserDetails } from "@/lib/firestore";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization" }, { status: 401 });
  }

  const decoded = await verifyIdTokenWithEmail(token);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const email = decoded.email ?? "";
  if (!email) {
    return NextResponse.json({ error: "Email not available from token" }, { status: 400 });
  }

  await ensureUserDetails(decoded.uid, { email, provider: "email" });
  return NextResponse.json({ ok: true });
}
