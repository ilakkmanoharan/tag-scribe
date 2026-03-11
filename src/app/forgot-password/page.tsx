"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function ForgotPasswordPage() {
  const { sendPasswordReset, isFirebaseEnabled } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isFirebaseEnabled) {
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
    setSuccess(false);
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h1 className="text-xl font-semibold text-[var(--text)]">Check your email</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          If an account exists for <strong>{email}</strong>, we’ve sent a link to reset your password.
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Not in your inbox? Check spam or junk, then try <Link href="/forgot-password" className="text-[var(--accent)] hover:underline">sending again</Link>.
        </p>
        <Link href="/signin" className="mt-4 inline-block text-[var(--accent)] hover:underline">Back to Sign in</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-xl font-semibold text-[var(--text)]">Reset password</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Enter your email and we’ll send a link to reset your password.</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm text-[var(--muted)]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--accent)] py-2 text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        <Link href="/signin" className="text-[var(--accent)] hover:underline">Back to Sign in</Link>
      </p>
    </div>
  );
}
