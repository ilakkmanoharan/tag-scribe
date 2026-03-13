/**
 * POST /api/auth/merge-accounts — Merge current account with email/password account.
 * Authorization: Bearer <current JWT>. Body: { email, password }.
 * Verifies credentials, migrates data into the email-account uid, sets merge redirect on current.
 */

import { NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/auth-server";
import { signInWithPassword } from "@/lib/firebase-auth-rest";
import { mergeUserDataInto, setMergedInto, getEffectiveUid } from "@/lib/firestore";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  const currentUid = await getUidFromRequest(new Request(request.url, { headers: { authorization: `Bearer ${token}` } }));
  if (!currentUid) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  // Already merged? Resolve to primary so we don't merge again into a secondary.
  const effectiveCurrent = await getEffectiveUid(currentUid);
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
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const primaryUid = result.uid; // email/password account = canonical
  if (primaryUid === effectiveCurrent) {
    return NextResponse.json({ message: "Already the same account" });
  }

  // Current session is secondary (e.g. Apple); primary is the email account.
  // Migrate data from current (secondary) into primary, then set merge redirect on current.
  await mergeUserDataInto(currentUid, primaryUid);
  await setMergedInto(currentUid, primaryUid, email);

  return NextResponse.json({ ok: true, message: "Accounts merged" });
}
