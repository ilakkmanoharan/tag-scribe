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
  iat?: number;
  exp?: number;
};

export function signOurJwt(payload: Omit<OurJwtPayload, "iat" | "exp">): string | null {
  if (!SECRET) return null;
  return jwt.sign(
    { sub: payload.sub, email: payload.email },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
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
