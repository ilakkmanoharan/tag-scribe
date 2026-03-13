/**
 * POST /api/auth/delete-account — Delete current user's account and data.
 * Authorization: Bearer required. Deletes Firestore data and Firebase user.
 */

import { NextResponse } from "next/server";
import { getUidFromRequest } from "@/lib/auth-server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { deleteUserData } from "@/lib/firestore";

export async function POST(request: Request) {
  const uid = await getUidFromRequest(request);
  if (!uid) {
    return NextResponse.json({ error: "Authorization required" }, { status: 401 });
  }

  const auth = getAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
  }

  try {
    await deleteUserData(uid);
    await auth.deleteUser(uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete account failed:", e);
    return NextResponse.json({ error: "Could not delete account" }, { status: 500 });
  }
}
