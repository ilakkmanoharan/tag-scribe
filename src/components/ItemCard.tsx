"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editHighlight, setEditHighlight] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editImageDataUrls, setEditImageDataUrls] = useState<string[]>([]);
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);

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

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const authH = await authHeaders();
      if (item.type === "image" && editImageDataUrls.length > 0) {
        const dataUrl = editImageDataUrls[0];
        const blob = await (await fetch(dataUrl)).blob();
        const ext = dataUrl.startsWith("data:image/png") ? "png" : dataUrl.startsWith("data:image/webp") ? "webp" : dataUrl.startsWith("data:image/gif") ? "gif" : "jpg";
        const formData = new FormData();
        formData.append("image", blob, `image.${ext}`);
        const putRes = await fetch(`/api/items/${item.id}/image`, {
          method: "PUT",
          headers: authH,
          body: formData,
        });
        if (!putRes.ok) throw new Error("Failed to replace image");
      }
      const contentVal =
        item.type === "video"
          ? editVideoUrl.trim()
          : item.type === "link" || item.type === "text"
            ? editContent.trim()
            : undefined;
      const body: Record<string, unknown> = {
        title: editTitle.trim() || undefined,
        highlight: editHighlight.trim() || undefined,
        caption: editCaption.trim() || undefined,
        tags: editTags,
        categoryId: editCategoryId ?? undefined,
      };
      if (contentVal !== undefined) body.content = contentVal || "";
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      setEditOpen(false);
      router.refresh();
    } finally {
      setSavingEdit(false);
    }
  };

  const addEditTag = (t: string) => {
    const trimmed = t.trim();
    if (!trimmed || editTags.some((x) => x.toLowerCase() === trimmed.toLowerCase())) return;
    setEditTags([...editTags, trimmed]);
  };

  const removeEditTag = (t: string) => setEditTags(editTags.filter((x) => x !== t));

  const handleEditDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    const imageFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type.startsWith("image/")) imageFiles.push(f);
    }
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () =>
        setEditImageDataUrls((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  }, []);

  const handleEditDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleEditPasteImage = useCallback((e: React.ClipboardEvent) => {
    const file = e.clipboardData.files?.[0];
    if (file?.type.startsWith("image/")) {
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () =>
        setEditImageDataUrls((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
  }, []);

  const removeEditImage = (index: number) => {
    setEditImageDataUrls((prev) => prev.filter((_, i) => i !== index));
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
        <>
          <button
            type="button"
            onClick={() => setAddingTag(true)}
            className="rounded border border-dashed border-[var(--border)] px-2 py-0.5 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            + Add tag
          </button>
          <button
            type="button"
            onClick={() => {
              setEditTitle(item.title ?? "");
              setEditContent(item.content ?? "");
              setEditHighlight(item.highlight ?? "");
              setEditCaption(item.caption ?? "");
              setEditTags([...item.tags]);
              setEditCategoryId(item.categoryId);
              setEditImageDataUrls([]);
              setEditVideoUrl(item.type === "video" ? item.content : "");
              setCategoryOpen(false);
              setEditOpen(true);
            }}
            className="rounded border border-[var(--border)] px-2 py-0.5 text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            title="Edit item"
          >
            Edit
          </button>
        </>
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
    <>
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
    {editOpen && (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 overflow-y-auto"
        onClick={() => { if (!savingEdit) { setCategoryOpen(false); setEditOpen(false); } }}
        role="presentation"
      >
        <div
          className="w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl my-4"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-labelledby="edit-item-title"
          onPaste={handleEditPasteImage}
        >
          <h2 id="edit-item-title" className="text-xl font-semibold text-[var(--text)] mb-1">Edit item</h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            Edit title, link, pictures, video, highlight, tags, and category. All optional.
          </p>
          <div className="space-y-6">
            <div>
              <label htmlFor="edit-title" className="mb-1 block text-sm font-medium text-[var(--text)]">Title</label>
              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Display title for this item"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            {item.type === "image" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">Pictures (optional) — replace</label>
              <div
                onDrop={handleEditDrop}
                onDragOver={handleEditDragOver}
                className="min-h-[100px] rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-4"
              >
                {!editImageDataUrls.length && (
                  <div className="flex flex-wrap gap-3 mb-2">
                    <div className="relative">
                      <img
                        src={imageSrc ?? `/api/items/${item.id}/image`}
                        alt="Current"
                        className="h-24 w-24 rounded object-cover"
                      />
                      <span className="absolute bottom-0 left-0 right-0 text-center text-xs text-[var(--muted)] bg-black/50 rounded-b">Current</span>
                    </div>
                  </div>
                )}
                {editImageDataUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {editImageDataUrls.map((dataUrl, index) => (
                      <div key={index} className="relative">
                        <img src={dataUrl} alt={`New ${index + 1}`} className="h-24 w-24 rounded object-cover" />
                        <button
                          type="button"
                          onClick={() => removeEditImage(index)}
                          className="absolute -right-1 -top-1 rounded-full bg-[var(--border)] p-0.5 text-[var(--text)] hover:bg-red-500/20 hover:text-red-400"
                          aria-label={`Remove picture ${index + 1}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="mt-2 text-center text-sm text-[var(--muted)]">
                  Paste or drop pictures here to replace
                </p>
              </div>
            </div>
            )}
            <div style={{ display: item.type === "video" ? undefined : "none" }}>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">Video (optional)</label>
              <input
                type="url"
                value={editVideoUrl}
                onChange={(e) => setEditVideoUrl(e.target.value)}
                placeholder="Paste or drop a video URL (e.g. https://...mp4)"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            {(item.type === "link" || item.type === "text") && (
              <div>
                <label htmlFor="edit-content" className="mb-1 block text-sm font-medium text-[var(--text)]">
                  {item.type === "link" ? "Link" : "Content"}
                </label>
                <input
                  id="edit-content"
                  type={item.type === "link" ? "url" : "text"}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder={item.type === "link" ? "https://..." : "Text content"}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            )}
            <div>
              <label htmlFor="edit-highlight" className="mb-1 block text-sm font-medium text-[var(--text)]">Highlight (optional)</label>
              <textarea
                id="edit-highlight"
                value={editHighlight}
                onChange={(e) => setEditHighlight(e.target.value)}
                placeholder="Paste a sentence or quote from the article"
                rows={2}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            {(item.type === "image" || item.type === "video" || item.type === "text") && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--text)]">Caption (optional)</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Caption"
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">Tags (optional)</label>
              <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
                {editTags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded bg-[var(--border)] px-2 py-1 text-sm">
                    {t}
                    <button type="button" onClick={() => removeEditTag(t)} className="text-[var(--muted)] hover:text-[var(--text)]" aria-label={`Remove ${t}`}>×</button>
                  </span>
                ))}
                <div className="flex flex-1 items-center gap-1 min-w-[120px]">
                  <input
                    id="edit-new-tag"
                    type="text"
                    placeholder="New tag"
                    className="min-w-0 flex-1 rounded border-0 bg-transparent px-2 py-1 text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEditTag((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("edit-new-tag") as HTMLInputElement | null;
                      if (el) { addEditTag(el.value); el.value = ""; }
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--accent)] text-white hover:opacity-90"
                    title="Add tag"
                    aria-label="Add tag"
                  >
                    +
                  </button>
                </div>
              </div>
              {existingTags.length > 0 && (
                <div className="mt-2">
                  <p className="mb-1.5 text-xs text-[var(--muted)]">Existing tags — click to add:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {existingTags.filter((t) => !editTags.some((x) => x.toLowerCase() === t.toLowerCase())).map((t) => (
                      <button key={t} type="button" onClick={() => addEditTag(t)} className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text)]">Category (optional)</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCategoryOpen((o) => !o)}
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <span>{categories.find((c) => c.id === (editCategoryId ?? "cat-inbox"))?.name ?? "Inbox"}</span>
                  <span className="text-[var(--muted)]" aria-hidden>{categoryOpen ? "▲" : "▼"}</span>
                </button>
                {categoryOpen && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setEditCategoryId(c.id); setCategoryOpen(false); }}
                        className="block w-full px-4 py-2 text-left text-[var(--text)] hover:bg-[var(--border)]"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-[var(--muted)]">Available categories:</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setEditCategoryId(c.id)}
                    className={`rounded px-2 py-1 text-sm ${(editCategoryId ?? "cat-inbox") === c.id ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              disabled={savingEdit}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-[var(--text)] hover:bg-[var(--border)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={savingEdit}
              className="rounded-lg bg-[var(--accent)] px-6 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {savingEdit ? "Saving…" : "Save to library"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
