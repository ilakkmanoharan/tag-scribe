/**
 * POST /api/auth/login — Email + password login for iOS (no direct Firebase).
 * Body: { email, password }. Returns { token } (our JWT).
 */

import { NextResponse } from "next/server";
import { signInWithPassword } from "@/lib/firebase-auth-rest";
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

  const result = await signInWithPassword(email, password);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error === "INVALID_LOGIN_CREDENTIALS" ? "Invalid email or password" : result.error },
      { status: 401 }
    );
  }

  const token = signOurJwt({ sub: result.uid, email: result.email });
  if (!token) {
    return NextResponse.json({ error: "Could not issue token" }, { status: 500 });
  }

  return NextResponse.json({ token });
}
