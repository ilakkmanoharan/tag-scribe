/**
 * Firebase Auth REST API (server-only).
 * Used for email/password sign-in and verification when iOS uses API only.
 */

const SIGN_IN_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

export type SignInWithPasswordResult =
  | { ok: true; uid: string; email: string; idToken: string }
  | { ok: false; error: string };

/** Verify email + password via Firebase Auth REST; returns uid and email on success. */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<SignInWithPasswordResult> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return { ok: false, error: "Firebase not configured" };

  const res = await fetch(`${SIGN_IN_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim(),
      password,
      returnSecureToken: true,
    }),
  });

  const data = (await res.json()) as {
    localId?: string;
    email?: string;
    idToken?: string;
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = data.error?.message ?? "Invalid email or password";
    return { ok: false, error: msg };
  }

  if (!data.localId || !data.idToken) {
    return { ok: false, error: "Invalid response from auth" };
  }

  return {
    ok: true,
    uid: data.localId,
    email: (data.email ?? email).trim(),
    idToken: data.idToken,
  };
}
