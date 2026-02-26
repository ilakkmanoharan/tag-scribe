"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Item } from "@/types";

type ItemCardProps = {
  item: Item;
  /** Show Archive button (Library and Category views). */
  showArchive?: boolean;
  /** Show Unarchive button (Archive view). */
  showUnarchive?: boolean;
  /** Show Delete button. */
  showDelete?: boolean;
};

function ArchiveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="20" height="5" x="2" y="3" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
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

function OutboxIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

export function ItemCard({ item, showArchive, showUnarchive, showDelete = true }: ItemCardProps) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } finally {
      setArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    setArchiving(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const actions = (
    <div className="mt-2 flex items-center gap-1 border-t border-[var(--border)] pt-2">
      {showArchive && (
        <button
          type="button"
          onClick={handleArchive}
          disabled={archiving}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--text)] disabled:opacity-50"
          title="Archive"
        >
          <ArchiveIcon />
          Archive
        </button>
      )}
      {showUnarchive && (
        <button
          type="button"
          onClick={handleUnarchive}
          disabled={archiving}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--text)] disabled:opacity-50"
          title="Unarchive"
        >
          <OutboxIcon />
          Unarchive
        </button>
      )}
      {showDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-red-500/20 hover:text-red-400 disabled:opacity-50"
          title="Delete"
        >
          <TrashIcon />
          Delete
        </button>
      )}
    </div>
  );

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      {item.type === "link" && (
        <>
          <a
            href={item.content}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--accent)] hover:underline"
          >
            {item.title || item.content}
          </a>
          {item.highlight && (
            <p className="mt-2 text-sm text-[var(--muted)] italic">{item.highlight}</p>
          )}
          {item.tags.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-[var(--muted)]">
              {item.tags.map((t) => (
                <span key={t} className="rounded bg-[var(--border)] px-2 py-0.5">
                  {t}
                </span>
              ))}
            </p>
          )}
        </>
      )}
      {item.type === "image" && (
        <>
          <p className="text-sm font-medium text-[var(--text)]">Image</p>
          {item.caption && (
            <p className="mt-1 text-sm text-[var(--muted)]">{item.caption}</p>
          )}
          {item.tags.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-[var(--muted)]">
              {item.tags.map((t) => (
                <span key={t} className="rounded bg-[var(--border)] px-2 py-0.5">
                  {t}
                </span>
              ))}
            </p>
          )}
        </>
      )}
      {item.type === "text" && (
        <>
          <p className="text-sm text-[var(--text)] whitespace-pre-wrap">
            {item.content.slice(0, 200)}
            {item.content.length > 200 ? "…" : ""}
          </p>
          {item.caption && (
            <p className="mt-1 text-sm text-[var(--muted)]">{item.caption}</p>
          )}
          {item.tags.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-[var(--muted)]">
              {item.tags.map((t) => (
                <span key={t} className="rounded bg-[var(--border)] px-2 py-0.5">
                  {t}
                </span>
              ))}
            </p>
          )}
        </>
      )}
      {(showArchive || showUnarchive || showDelete) && actions}
    </div>
  );
}
