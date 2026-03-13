/**
 * Server-side auth: get uid from request.
 * Accepts either Firebase ID token (web) or our JWT (iOS).
 */

import { verifyIdToken, isFirebaseAdminConfigured } from "./firebase-admin";
import { verifyOurJwt, isOurJwtConfigured } from "./jwt";

export { isFirebaseAdminConfigured };

export async function getUidFromRequest(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  // 1. Try Firebase ID token (web)
  if (isFirebaseAdminConfigured()) {
    const decoded = await verifyIdToken(token);
    if (decoded?.uid) return decoded.uid;
  }

  // 2. Try our JWT (iOS)
  if (isOurJwtConfigured()) {
    const payload = verifyOurJwt(token);
    if (payload?.sub) return payload.sub;
  }

  return null;
}

/** When auth is configured (Firebase or our JWT), returns 401 if no valid uid. Otherwise returns null (use SQLite). */
export async function requireUidOrNull(request: Request): Promise<{ uid: string } | { uid: null; status: 401 } | { uid: null; status: null }> {
  const hasAuth = isFirebaseAdminConfigured() || isOurJwtConfigured();
  if (!hasAuth) return { uid: null, status: null };
  const uid = await getUidFromRequest(request);
  if (uid) return { uid };
  return { uid: null, status: 401 };
}
