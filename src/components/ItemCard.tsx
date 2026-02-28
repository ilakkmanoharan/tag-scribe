"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { Item } from "@/types";

type Category = { id: string; name: string };

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

function MoveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

export function ItemCard({ item, showArchive, showUnarchive, showDelete = true }: ItemCardProps) {
  const router = useRouter();
  const { getAuthHeaders, isFirebaseEnabled } = useAuth();
  const moveMenuRef = useRef<HTMLDivElement>(null);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [moving, setMoving] = useState(false);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAuthHeaders().then((headers) => {
      if (cancelled) return;
      return fetch("/api/categories", { headers });
    }).then((r) => (r && r.ok ? r.json() : [])).then((data: Category[]) => {
      if (!cancelled) setCategories(Array.isArray(data) ? data : []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [getAuthHeaders]);
  useEffect(() => {
    let cancelled = false;
    getAuthHeaders().then((headers) => {
      if (cancelled) return;
      return fetch("/api/tags", { headers });
    }).then((r) => (r && r.ok ? r.json() : [])).then((data: string[]) => {
      if (!cancelled) setExistingTags(Array.isArray(data) ? data : []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [getAuthHeaders]);

  useEffect(() => {
    if (item.type !== "image" || !isFirebaseEnabled) return;
    let cancelled = false;
    getAuthHeaders()
      .then((headers) => fetch(`/api/items/${item.id}/image`, { headers }))
      .then((r) => (r?.ok ? r.json() : null))
      .then((data: { url?: string } | null) => {
        if (!cancelled && data?.url) setImageSrc(data.url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item.id, item.type, isFirebaseEnabled, getAuthHeaders]);

  const authHeaders = () => getAuthHeaders();

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const headers = { "Content-Type": "application/json", ...await authHeaders() };
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers,
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
      const headers = { "Content-Type": "application/json", ...await authHeaders() };
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers,
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
      const res = await fetch(`/api/items/${item.id}`, { method: "DELETE", headers: await authHeaders() });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async (categoryId: string) => {
    setMoving(true);
    setMoveOpen(false);
    try {
      const headers = { "Content-Type": "application/json", ...await authHeaders() };
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ categoryId }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } finally {
      setMoving(false);
    }
  };

  const saveTags = async (newTags: string[]) => {
    setSavingTags(true);
    try {
      const headers = { "Content-Type": "application/json", ...await authHeaders() };
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ tags: newTags }),
      });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } finally {
      setSavingTags(false);
    }
  };

  const addTag = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed || item.tags.some((x) => x.toLowerCase() === trimmed.toLowerCase())) return;
    saveTags([...item.tags, trimmed]);
    setTagInput("");
    setAddingTag(false);
  };

  const removeTag = (t: string) => {
    saveTags(item.tags.filter((x) => x !== t));
  };

  const actions = (
    <div className="mt-2 flex items-center flex-wrap gap-1 border-t border-[var(--border)] pt-2">
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
      <div className="relative" ref={moveMenuRef}>
        <button
          type="button"
          onClick={() => setMoveOpen((o) => !o)}
          disabled={moving}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--border)] hover:text-[var(--text)] disabled:opacity-50"
          title="Move to category"
        >
          <MoveIcon />
          Move
        </button>
        {moveOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              aria-hidden
              onClick={() => setMoveOpen(false)}
            />
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
              <p className="px-3 py-1.5 text-xs font-medium text-[var(--muted)]">Move to category</p>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleMove(cat.id)}
                  disabled={moving || cat.id === item.categoryId}
                  className="block w-full px-3 py-1.5 text-left text-sm text-[var(--text)] hover:bg-[var(--border)] disabled:opacity-50"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
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

  const tagsSection = (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      {item.tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded bg-[var(--border)] px-2 py-0.5 text-[var(--muted)]"
        >
          {t}
          <button
            type="button"
            onClick={() => removeTag(t)}
            disabled={savingTags}
            className="text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-50"
            aria-label={`Remove tag ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      {addingTag ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(tagInput);
              }
              if (e.key === "Escape") setAddingTag(false);
            }}
            placeholder="New tag"
            className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => addTag(tagInput)}
            disabled={savingTags}
            className="rounded bg-[var(--accent)] px-2 py-0.5 text-white hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAddingTag(false); setTagInput(""); }}
            className="text-[var(--muted)] hover:text-[var(--text)]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingTag(true)}
          className="rounded border border-dashed border-[var(--border)] px-2 py-0.5 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          + Add tag
        </button>
      )}
      {addingTag && existingTags.length > 0 && (
        <div className="w-full mt-1">
          <p className="mb-1 text-[var(--muted)]">Existing: </p>
          <div className="flex flex-wrap gap-1">
            {existingTags
              .filter((t) => !item.tags.some((x) => x.toLowerCase() === t.toLowerCase()))
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addTag(t)}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {t}
                </button>
              ))}
          </div>
        </div>
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
        </>
      )}
      {item.type === "image" && (
        <>
          <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)]/30">
            {imageError ? (
              <div className="flex max-h-56 min-h-[120px] flex-col items-center justify-center gap-2 py-6 text-center text-sm text-[var(--muted)]">
                <p>Image couldn’t be loaded.</p>
                <p>Delete this card and add the image again from Add to restore it.</p>
              </div>
            ) : (
              <img
                src={imageSrc ?? `/api/items/${item.id}/image`}
                alt={item.title || item.caption || "Saved image"}
                className="block max-h-56 min-h-[120px] w-auto max-w-full object-contain"
                onError={() => setImageError(true)}
              />
            )}
          </div>
          {item.title && (
            <p className="mt-2 text-sm font-medium text-[var(--text)]">{item.title}</p>
          )}
          {!item.title && (
            <p className="mt-2 text-sm font-medium text-[var(--text)]">Image</p>
          )}
          {item.caption && (
            <p className="mt-1 text-sm text-[var(--muted)]">{item.caption}</p>
          )}
        </>
      )}
      {item.type === "video" && (
        <>
          {item.title && (
            <p className="text-sm font-medium text-[var(--text)]">{item.title}</p>
          )}
          {!item.title && <p className="text-sm font-medium text-[var(--text)]">Video</p>}
          {item.content.startsWith("data:") ? (
            <video src={item.content} controls className="mt-1 max-h-48 rounded" />
          ) : (
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm text-[var(--accent)] hover:underline"
            >
              {item.content.slice(0, 60)}…
            </a>
          )}
          {item.caption && (
            <p className="mt-1 text-sm text-[var(--muted)]">{item.caption}</p>
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
        </>
      )}
      {tagsSection}
      {(showArchive || showUnarchive || showDelete) && actions}
    </div>
  );
}
