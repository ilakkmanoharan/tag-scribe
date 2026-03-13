/**
 * Verify Apple Sign in identity token (JWT from Apple).
 * Returns sub (Apple user ID) and email (if provided by Apple).
 */

import * as jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const APPLE_ISS = "https://appleid.apple.com";
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";

// iOS app bundle ID — must match the app that requested the token
const APPLE_CLIENT_ID = process.env.APPLE_BUNDLE_ID ?? process.env.APPLE_CLIENT_ID ?? "app.tagscribe.ios";

const client = jwksClient({
  jwksUri: APPLE_KEYS_URL,
  cache: true,
  cacheMaxAge: 600000,
});

function getAppleSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  if (!header.kid) {
    callback(new Error("No kid in token header"));
    return;
  }
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    if (!key) {
      callback(new Error("No signing key found"));
      return;
    }
    const pubKey = key.getPublicKey();
    callback(null, pubKey);
  });
}

export type AppleTokenPayload = {
  sub: string;   // Apple user identifier (stable per app-user)
  email?: string;
  email_verified?: boolean;
};

export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleTokenPayload | null> {
  return new Promise((resolve) => {
    jwt.verify(
      identityToken,
      getAppleSigningKey,
      {
        algorithms: ["RS256"],
        issuer: APPLE_ISS,
        audience: APPLE_CLIENT_ID,
      },
      (err, decoded) => {
        if (err || !decoded || typeof decoded !== "object") {
          resolve(null);
          return;
        }
        const payload = decoded as Record<string, unknown>;
        const sub = payload.sub as string | undefined;
        if (!sub) {
          resolve(null);
          return;
        }
        resolve({
          sub,
          email: payload.email as string | undefined,
          email_verified: payload.email_verified as boolean | undefined,
        });
      }
    );
  });
}
