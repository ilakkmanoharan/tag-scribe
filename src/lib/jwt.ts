/**
 * Our own JWT for iOS (and other non-Firebase clients).
 * Signed with JWT_SECRET; payload includes sub (Firebase uid) and optional email.
 */

import * as jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = "30d";

export type OurJwtPayload = {
  sub: string; // Firebase uid
  email?: string;
  provider?: "apple" | "email"; // for display: "(Apple Id)" vs "(Email)"
  iat?: number;
  exp?: number;
};

export function signOurJwt(payload: Omit<OurJwtPayload, "iat" | "exp">): string | null {
  if (!SECRET) return null;
  const claims: Record<string, unknown> = { sub: payload.sub };
  if (payload.email != null && payload.email !== "") claims.email = payload.email;
  if (payload.provider != null) claims.provider = payload.provider;
  return jwt.sign(claims, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyOurJwt(token: string): OurJwtPayload | null {
  if (!SECRET) return null;
  try {
    const decoded = jwt.verify(token, SECRET) as OurJwtPayload;
    return decoded?.sub ? decoded : null;
  } catch {
    return null;
  }
}

export function isOurJwtConfigured(): boolean {
  return !!SECRET;
}
