"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function SignInPage() {
  const { signIn, isFirebaseEnabled } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isFirebaseEnabled) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-[var(--muted)]">Firebase is not configured. Use the app without signing in.</p>
        <Link href="/" className="mt-4 inline-block text-[var(--accent)] hover:underline">Back to Library</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-xl font-semibold text-[var(--text)]">Sign in</h1>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm text-[var(--muted)]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm text-[var(--muted)]">Password</label>
            <Link href="/forgot-password" className="text-sm text-[var(--accent)] hover:underline">Forgot password?</Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--accent)] py-2 text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[var(--muted)]">
        No account? <Link href="/signup" className="text-[var(--accent)] hover:underline">Sign up</Link>
      </p>
    </div>
  );
}
