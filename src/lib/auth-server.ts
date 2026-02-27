/**
 * Server-side auth: get uid from Firebase ID token in request.
 * Use in API routes when Firebase is configured.
 */

import { verifyIdToken, isFirebaseAdminConfigured } from "./firebase-admin";

export { isFirebaseAdminConfigured };

export async function getUidFromRequest(request: Request): Promise<string | null> {
  if (!isFirebaseAdminConfigured()) return null;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const decoded = await verifyIdToken(token);
  return decoded?.uid ?? null;
}

/** When Firebase is configured, returns 401 if no valid uid. Otherwise returns null (use SQLite). */
export async function requireUidOrNull(request: Request): Promise<{ uid: string } | { uid: null; status: 401 } | { uid: null; status: null }> {
  if (!isFirebaseAdminConfigured()) return { uid: null, status: null };
  const uid = await getUidFromRequest(request);
  if (uid) return { uid };
  return { uid: null, status: 401 };
}
