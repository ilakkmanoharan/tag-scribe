/**
 * POST /api/auth/signup — Create account (for iOS via API; no direct Firebase).
 * Body: { email, password }. Returns { token }. If email exists, 409 "User already exists, please Login".
 */

import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { ensureUserDetails } from "@/lib/firestore";
import { signOurJwt } from "@/lib/jwt";

export async function POST(request: Request) {
  if (!process.env.JWT_SECRET) {
    return NextResponse.json({ error: "Server auth not configured" }, { status: 500 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  try {
    const user = await auth.createUser({
      email,
      password,
      emailVerified: false,
    });
    await ensureUserDetails(user.uid, { email, provider: "email" });
    const token = signOurJwt({ sub: user.uid, email, provider: "email" });
    if (!token) {
      return NextResponse.json({ error: "Could not issue token" }, { status: 500 });
    }
    return NextResponse.json({ token });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "auth/email-already-exists" || err.code === "auth/email-already-in-use") {
      return NextResponse.json(
        { error: "User already exists, please Login" },
        { status: 409 }
      );
    }
    console.error("Signup failed:", e);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
