/**
 * POST /api/auth/forgot-password — Generate password reset link (for iOS via API).
 * Body: { email }. Returns { link } for client to open in browser.
 */

import { NextResponse } from "next/server";
import { generatePasswordResetLink } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const link = await generatePasswordResetLink(email);
  if (!link) {
    return NextResponse.json(
      { error: "Could not generate reset link. Check that the account exists." },
      { status: 400 }
    );
  }

  return NextResponse.json({ link });
}
