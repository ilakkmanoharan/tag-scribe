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

/** Server-to-server notification event from Apple (events claim is stringified JSON). */
export type AppleNotificationEvent = {
  type: "consent-revoked" | "account-delete" | "email-enabled" | "email-disabled";
  sub: string;
  email?: string;
  is_private_email?: string;
  event_time?: number;
};

/** Verify Sign in with Apple server-to-server notification JWT. Returns parsed event or null. */
export async function verifyAppleNotificationPayload(signedPayload: string): Promise<AppleNotificationEvent | null> {
  return new Promise((resolve) => {
    jwt.verify(
      signedPayload,
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
        const eventsRaw = payload.events;
        if (typeof eventsRaw !== "string") {
          resolve(null);
          return;
        }
        try {
          const event = JSON.parse(eventsRaw) as Record<string, unknown>;
          const type = event.type as string | undefined;
          const sub = event.sub as string | undefined;
          if (!sub || !type) {
            resolve(null);
            return;
          }
          if (
            type !== "consent-revoked" &&
            type !== "account-delete" &&
            type !== "email-enabled" &&
            type !== "email-disabled"
          ) {
            resolve(null);
            return;
          }
          resolve({
            type,
            sub,
            email: event.email as string | undefined,
            is_private_email: event.is_private_email as string | undefined,
            event_time: event.event_time as number | undefined,
          });
        } catch {
          resolve(null);
        }
      }
    );
  });
}
