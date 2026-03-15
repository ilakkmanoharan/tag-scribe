/**
 * POST /api/auth/signup — Create account or add email/password to existing (one user per email).
 * Body: { email, password }. Returns { token }.
 * If email already exists (e.g. Apple-only): sets password on that account and returns token (same user).
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
      try {
        const existing = await auth.getUserByEmail(email);
        await auth.updateUser(existing.uid, { password });
        await ensureUserDetails(existing.uid, { email, provider: "email" });
        const token = signOurJwt({ sub: existing.uid, email, provider: "email" });
        if (!token) {
          return NextResponse.json({ error: "Could not issue token" }, { status: 500 });
        }
        return NextResponse.json({ token });
      } catch (linkErr) {
        console.error("Failed to add password to existing account:", linkErr);
        return NextResponse.json(
          { error: "Account exists but could not add password; try signing in" },
          { status: 500 }
        );
      }
    }
    console.error("Signup failed:", e);
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
