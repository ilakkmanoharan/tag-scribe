"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { LibraryContent } from "@/components/LibraryContent";

export function HomeOrLibrary() {
  const { user, loading, isFirebaseEnabled } = useAuth();

  if (loading) {
    return <div className="text-[var(--muted)]">Loading…</div>;
  }

  if (isFirebaseEnabled && !user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Tag Scribe</h1>
        <p className="text-[var(--muted)]">
          Capture, tag, and organize links, quotes, and ideas. Save from anywhere and find everything instantly.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/signin"
            className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Sign in
          </Link>
          <Link
            href="/about"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            About
          </Link>
          <Link
            href="/support"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Support
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            Privacy
          </Link>
        </div>
      </div>
    );
  }

  return <LibraryContent />;
}
