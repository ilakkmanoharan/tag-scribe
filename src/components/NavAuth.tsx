"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export function NavAuth() {
  const { user, loading, signOut, isFirebaseEnabled } = useAuth();

  if (!isFirebaseEnabled) return null;
  if (loading) return <span className="text-sm text-[var(--muted)]">…</span>;
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--muted)] truncate max-w-[160px]" title={user.email ?? undefined}>
          {user.email ?? user.uid}
        </span>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
        >
          Sign out
        </button>
      </div>
    );
  }
  return (
    <Link href="/signin" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
      Sign in
    </Link>
  );
}
