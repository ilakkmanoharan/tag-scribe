"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const { user, signOut, getAuthHeaders, isFirebaseEnabled } = useAuth();
  const router = useRouter();
  const [mergeEmail, setMergeEmail] = useState("");
  const [mergePassword, setMergePassword] = useState("");
  const [mergeMessage, setMergeMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [mergeLoading, setMergeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  if (!isFirebaseEnabled) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-[var(--muted)]">Firebase is not configured.</p>
        <Link href="/" className="mt-4 inline-block text-[var(--accent)] hover:underline">Back to Library</Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <p className="text-[var(--muted)]">Sign in to view settings.</p>
        <Link href="/signin" className="mt-4 inline-block text-[var(--accent)] hover:underline">Sign in</Link>
      </div>
    );
  }

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    setMergeMessage(null);
    setMergeLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/auth/merge-accounts", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ email: mergeEmail.trim(), password: mergePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setMergeMessage({ type: "ok", text: data.message ?? "Accounts merged. You can sign in with either account and see the same data." });
        setMergeEmail("");
        setMergePassword("");
      } else {
        setMergeMessage({ type: "error", text: data.error ?? "Merge failed" });
      }
    } catch {
      setMergeMessage({ type: "error", text: "Network error" });
    } finally {
      setMergeLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleteLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { ...headers },
      });
      if (res.ok) {
        await signOut();
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setMergeMessage({ type: "error", text: data.error ?? "Could not delete account" });
      }
    } catch {
      setMergeMessage({ type: "error", text: "Network error" });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <h1 className="text-xl font-semibold text-[var(--text)]">Settings</h1>

      <section>
        <h2 className="text-sm font-medium text-[var(--muted)]">Account</h2>
        <p className="mt-1 text-sm text-[var(--text)]">{user.email ?? user.uid}</p>
        <button
          type="button"
          onClick={() => signOut()}
          className="mt-3 text-sm text-[var(--muted)] hover:text-[var(--text)] underline"
        >
          Sign out
        </button>
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--muted)]">Merge accounts</h2>
        <p className="mt-1 text-sm text-[var(--text)]">
          Enter the email and password of the account you want to merge with. Both accounts will then see the same data.
        </p>
        <form onSubmit={handleMerge} className="mt-3 space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={mergeEmail}
            onChange={(e) => setMergeEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          />
          <input
            type="password"
            placeholder="Password"
            value={mergePassword}
            onChange={(e) => setMergePassword(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          />
          <button
            type="submit"
            disabled={mergeLoading}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {mergeLoading ? "Merging…" : "Merge accounts"}
          </button>
        </form>
        {mergeMessage && (
          <p className={`mt-2 text-sm ${mergeMessage.type === "ok" ? "text-green-600 dark:text-green-400" : "text-red-400"}`}>
            {mergeMessage.text}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-[var(--muted)]">Delete account</h2>
        <p className="mt-1 text-sm text-[var(--text)]">
          Permanently delete your account and all data. This cannot be undone.
        </p>
        <div className="mt-3 space-y-2">
          <input
            type="text"
            placeholder='Type DELETE to confirm'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)]"
          />
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteConfirm !== "DELETE" || deleteLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {deleteLoading ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </section>
    </div>
  );
}
