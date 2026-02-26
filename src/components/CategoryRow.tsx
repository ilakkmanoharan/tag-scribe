"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type CategoryRowProps = {
  id: string;
  name: string;
  count: number;
  isInbox: boolean;
};

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

export function CategoryRow({ id, name, count, isInbox }: CategoryRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setEditName(name);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditing(false);
      setEditName(trimmed);
      router.refresh();
    } catch {
      setEditName(name);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${name}"? Items in this category will move to Inbox.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") {
                setEditName(name);
                setEditing(false);
              }
            }}
            className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !editName.trim()}
            className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => { setEditName(name); setEditing(false); }}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text)] hover:bg-[var(--border)]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <Link
            href={`/categories/${id}`}
            className="flex min-w-0 flex-1 items-center gap-2 py-1 font-medium text-[var(--text)] hover:text-[var(--accent)] hover:underline"
          >
            <span>{name}</span>
            <span className="text-sm font-normal text-[var(--muted)]">
              — {count} {count === 1 ? "item" : "items"} saved
            </span>
          </Link>
          <div
            className="flex shrink-0 items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--text)]"
              title="Edit category"
              aria-label="Edit category"
            >
              <PencilIcon />
            </button>
            {!isInbox && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={deleting}
                className="rounded p-1.5 text-[var(--muted)] hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
                title="Delete category"
                aria-label="Delete category"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        </>
      )}
    </li>
  );
}
