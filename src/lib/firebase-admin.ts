/**
 * Firebase Admin SDK — server only (API routes, getServerSideProps).
 * Uses GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.
 */

import * as admin from "firebase-admin";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import type { Storage } from "firebase-admin/storage";

function getCredential(): admin.credential.Credential | undefined {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return admin.credential.cert(JSON.parse(json) as admin.ServiceAccount);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function getAdminApp(): admin.app.App | null {
  if (typeof window !== "undefined") return null;
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return null;
  try {
    if (admin.apps.length > 0) return admin.apps[0] as admin.app.App;
    const credential = getCredential();
    return admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      ...(credential ? { credential } : {}),
      ...(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
        ? { storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }
        : {}),
    });
  } catch {
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? app.auth() : null;
}

export function getAdminFirestore(): Firestore | null {
  const app = getAdminApp();
  return app ? app.firestore() : null;
}

export function getAdminStorage(): Storage | null {
  const app = getAdminApp();
  return app ? app.storage() : null;
}

/** Verify ID token from client; returns decoded token with uid or null. */
export async function verifyIdToken(idToken: string): Promise<{ uid: string } | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    return decoded?.uid ? { uid: decoded.uid } : null;
  } catch {
    return null;
  }
}

/** Verify ID token and return uid + email (for user-details sync). */
export async function verifyIdTokenWithEmail(
  idToken: string
): Promise<{ uid: string; email: string | null } | null> {
  const auth = getAdminAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    if (!decoded?.uid) return null;
    const email =
      typeof decoded.email === "string" && decoded.email.trim()
        ? decoded.email.trim()
        : null;
    return { uid: decoded.uid, email };
  } catch {
    return null;
  }
}

export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
  );
}
