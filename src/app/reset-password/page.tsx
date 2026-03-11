"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import { confirmPasswordReset } from "firebase/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const mode = searchParams.get("mode");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const isResetMode = mode === "resetPassword";

  useEffect(() => {
    if (!oobCode || !isResetMode) {
      setError("Invalid or expired link. Request a new password reset.");
    }
  }, [oobCode, isResetMode]);

  if (!isFirebaseConfigured()) {
    return (
      <div className="mx-auto max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-[var(--muted)]">Firebase is not configured.</p>
        <Link href="/signin" className="mt-4 inline-block text-[var(--accent)] hover:underline">Back to Sign in</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!oobCode) {
      setError("Invalid or expired link.");
      return;
    }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase not configured");
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
      setTimeout(() => router.push("/signin?reset=success"), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password. The link may have expired.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="text-xl font-semibold text-[var(--text)]">Password reset</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Your password has been updated. Redirecting to sign in…</p>
        <Link href="/signin" className="mt-4 inline-block text-[var(--accent)] hover:underline">Go to Sign in</Link>
      </div>
    );
  }

  if (!oobCode || !isResetMode) {
    return (
      <div className="mx-auto max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="text-xl font-semibold text-[var(--text)]">Invalid link</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{error || "This link is invalid or has expired. Request a new password reset."}</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-[var(--accent)] hover:underline">Request new reset link</Link>
        <span className="mx-2 text-[var(--muted)]">|</span>
        <Link href="/signin" className="text-[var(--accent)] hover:underline">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-xl font-semibold text-[var(--text)]">Set new password</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Enter your new password below.</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm text-[var(--muted)]">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--muted)]">Confirm password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--accent)] py-2 text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Resetting…" : "Reset password"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        <Link href="/signin" className="text-[var(--accent)] hover:underline">Back to Sign in</Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-[var(--muted)]">Loading…</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
