"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type Category = { id: string; name: string };

export function AddForm({ categories: initialCategories }: { categories: Category[] }) {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [highlight, setHighlight] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [categoryId, setCategoryId] = useState<string>("cat-inbox");
  const [imageDataUrls, setImageDataUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const normalizeUrl = useCallback((raw: string) => {
    const value = raw.trim();
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (/^[^\s]+\.[^\s]+/.test(value)) return `https://${value}`;
    return value;
  }, []);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    let cancelled = false;
    getAuthHeaders().then((headers) => fetch("/api/tags", { headers }))
      .then((r) => (r && r.ok ? r.json() : []))
      .then((tags: string[]) => { if (!cancelled) setExistingTags(Array.isArray(tags) ? tags : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [getAuthHeaders]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text").trim();
      const normalized = normalizeUrl(text);
      if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
        e.preventDefault();
        setUrl(normalized);
      }
    },
    [normalizeUrl]
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files?.length) {
      const imageFiles: File[] = [];
      let videoFile: File | null = null;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.type.startsWith("image/")) imageFiles.push(f);
        else if (f.type.startsWith("video/")) videoFile = f;
      }
      if (imageFiles.length) {
        imageFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onload = () =>
            setImageDataUrls((prev) => [...prev, reader.result as string]);
          reader.readAsDataURL(file);
        });
      }
      if (videoFile && !videoDataUrl && !videoUrl) {
        const reader = new FileReader();
        reader.onload = () => setVideoDataUrl(reader.result as string);
        reader.readAsDataURL(videoFile);
      }
      if (imageFiles.length || videoFile) return;
    }
    const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text");
    if (text) {
      const trimmed = normalizeUrl(text);
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        if (trimmed.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) {
          setVideoUrl(trimmed);
        } else {
          setUrl(trimmed);
        }
      }
    }
  }, [normalizeUrl, videoDataUrl, videoUrl]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handlePasteImage = useCallback((e: React.ClipboardEvent) => {
    const file = e.clipboardData.files?.[0];
    if (file?.type.startsWith("image/")) {
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () =>
        setImageDataUrls((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImageDataUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addTag = useCallback((tag: string) => {
    const t = tag.trim();
    if (!t) return;
    setSelectedTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setTagInput("");
  }, []);

  const removeTag = useCallback((tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    setError("");
    try {
      const headers = { "Content-Type": "application/json", ...await getAuthHeaders() };
      const res = await fetch("/api/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create category");
      }
      const newCat = await res.json();
      setCategories((prev) => [...prev, newCat]);
      setCategoryId(newCat.id);
      setNewCategoryName("");
      setShowNewCategoryInput(false);
      setCategoryOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category.");
    } finally {
      setAddingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const link = normalizeUrl(url);
    const normalizedVideoUrl = normalizeUrl(videoUrl);
    const hasLink = link && (link.startsWith("http://") || link.startsWith("https://"));
    const hasImages = imageDataUrls.length > 0;
    const hasVideo = !!(normalizedVideoUrl || videoDataUrl);
    const hasHighlight = !!highlight.trim();
    const titleVal = title.trim() || undefined;

    if (!hasLink && !hasImages && !hasVideo && !hasHighlight) {
      setError("Add at least a link, a picture, a video, or some text.");
      return;
    }
    if (link && !hasLink) {
      setError("Link must start with http:// or https://");
      return;
    }
    if (normalizedVideoUrl && !normalizedVideoUrl.startsWith("http://") && !normalizedVideoUrl.startsWith("https://")) {
      setError("Video link must start with http:// or https://");
      return;
    }
    setSaving(true);
    try {
      const catId = categoryId || "cat-inbox";
      const tags = selectedTags;
      const caption = highlight.trim() || undefined;

      for (const dataUrl of imageDataUrls) {
        const formData = new FormData();
        const blob = await (await fetch(dataUrl)).blob();
        const ext = dataUrl.startsWith("data:image/png") ? "png" : dataUrl.startsWith("data:image/webp") ? "webp" : dataUrl.startsWith("data:image/gif") ? "gif" : "jpg";
        formData.append("image", blob, `image.${ext}`);
        if (titleVal) formData.append("title", titleVal);
        if (caption) formData.append("caption", caption);
        formData.append("tags", JSON.stringify(tags));
        formData.append("categoryId", catId);
        const authH = await getAuthHeaders();
        const res = await fetch("/api/items", {
          method: "POST",
          headers: authH,
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save image");
        }
      }
      if (hasVideo) {
        const videoContent = videoDataUrl || normalizedVideoUrl;
        const headers = { "Content-Type": "application/json", ...await getAuthHeaders() };
        const res = await fetch("/api/items", {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "video",
            content: videoContent,
            title: titleVal,
            caption,
            tags,
            categoryId: catId,
            source: "camera",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save");
        }
      }
      if (hasLink) {
        const headers = { "Content-Type": "application/json", ...await getAuthHeaders() };
        const res = await fetch("/api/items", {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "link",
            content: link,
            title: titleVal,
            highlight: caption,
            tags,
            categoryId: catId,
            source: "web",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save");
        }
      }
      if (!hasLink && !hasImages && !hasVideo && hasHighlight) {
        const headers = { "Content-Type": "application/json", ...await getAuthHeaders() };
        const res = await fetch("/api/items", {
          method: "POST",
          headers,
          body: JSON.stringify({
            type: "text",
            content: highlight.trim(),
            title: titleVal,
            tags,
            categoryId: catId,
            source: "manual",
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save");
        }
      }
      setTitle("");
      setUrl("");
      setHighlight("");
      setImageDataUrls([]);
      setVideoUrl("");
      setVideoDataUrl(null);
      setSelectedTags([]);
      setTagInput("");
      setCategoryId("cat-inbox");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6" onPaste={handlePasteImage}>
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-[var(--text)]">
          Title (optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Display title for this item"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>

      <div>
        <label htmlFor="url" className="mb-1 block text-sm font-medium text-[var(--text)]">
          Link (optional)
        </label>
        <input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(normalizeUrl(e.target.value))}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          placeholder="Paste or drop a link here (e.g. https://...)"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          autoComplete="url"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text)]">
          Pictures (optional) — add multiple
        </label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="min-h-[100px] rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-4"
        >
          {imageDataUrls.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {imageDataUrls.map((dataUrl, index) => (
                <div key={index} className="relative">
                  <img
                    src={dataUrl}
                    alt={`Preview ${index + 1}`}
                    className="h-24 w-24 rounded object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
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
            Paste or drop pictures here
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text)]">
          Video (optional)
        </label>
        <input
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(normalizeUrl(e.target.value))}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          placeholder="Paste or drop a video URL (e.g. https://...mp4)"
          className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        {videoDataUrl ? (
          <div className="relative inline-block">
            <video src={videoDataUrl} controls className="max-h-40 rounded" />
            <button
              type="button"
              onClick={() => setVideoDataUrl(null)}
              className="absolute right-1 top-1 rounded bg-[var(--border)] px-2 py-0.5 text-sm text-[var(--text)] hover:bg-red-500/20 hover:text-red-400"
            >
              Remove video
            </button>
          </div>
        ) : null}
      </div>

      <div>
        <label htmlFor="highlight" className="mb-1 block text-sm font-medium text-[var(--text)]">
          Highlight (optional)
        </label>
        <textarea
          id="highlight"
          value={highlight}
          onChange={(e) => setHighlight(e.target.value)}
          placeholder="Paste a sentence or quote from the article"
          rows={2}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
      </div>

      {/* Tags: chips + input + "+" and existing tags below */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text)]">
          Tags (optional)
        </label>
        <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2">
          {selectedTags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded bg-[var(--border)] px-2 py-1 text-sm"
            >
              {t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="text-[var(--muted)] hover:text-[var(--text)]"
                aria-label={`Remove ${t}`}
              >
                ×
              </button>
            </span>
          ))}
          <div className="flex flex-1 items-center gap-1 min-w-[120px]">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="New tag"
              className="min-w-0 flex-1 rounded border-0 bg-transparent px-2 py-1 text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-0"
            />
            <button
              type="button"
              onClick={() => addTag(tagInput)}
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
              {existingTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addTag(t)}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category: selector + list below + "+" to add new */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--text)]">
          Category (optional)
        </label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setCategoryOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <span>{selectedCategory?.name ?? "Inbox"}</span>
            <span className="text-[var(--muted)]" aria-hidden>{categoryOpen ? "▲" : "▼"}</span>
          </button>
          {categoryOpen && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(c.id);
                    setCategoryOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-[var(--text)] hover:bg-[var(--border)]"
                >
                  {c.name}
                </button>
              ))}
              <div className="border-t border-[var(--border)] px-2 py-2">
                {!showNewCategoryInput ? (
                  <button
                    type="button"
                    onClick={() => setShowNewCategoryInput(true)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-[var(--accent)] hover:bg-[var(--border)]"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent)] text-white">+</span>
                    Add new category
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategory();
                        }
                        if (e.key === "Escape") {
                          setShowNewCategoryInput(false);
                          setNewCategoryName("");
                        }
                      }}
                      placeholder="Category name"
                      className="flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={addingCategory || !newCategoryName.trim()}
                      className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {addingCategory ? "…" : "Add"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-[var(--muted)]">Available categories:</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`rounded px-2 py-1 text-sm ${categoryId === c.id ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)]"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[var(--accent)] px-6 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save to library"}
      </button>
    </form>
  );
}
