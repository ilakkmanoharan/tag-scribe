"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };

export function AddForm({ categories: initialCategories }: { categories: Category[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [highlight, setHighlight] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [categoryId, setCategoryId] = useState<string>("cat-inbox");
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.ok ? r.json() : [])
      .then((tags: string[]) => setExistingTags(tags))
      .catch(() => {});
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      const text = e.clipboardData.getData("text").trim();
      if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
        e.preventDefault();
        setUrl(text);
      }
    },
    []
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text");
    if (text) {
      const trimmed = text.trim();
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        setUrl(trimmed);
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "link";
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
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    const link = url.trim();
    if (!link) {
      setError("Please enter or paste a link.");
      return;
    }
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      setError("Link must start with http:// or https://");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "link",
          content: link,
          title: undefined,
          highlight: highlight.trim() || undefined,
          tags: selectedTags,
          categoryId: categoryId || null,
          source: "web",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      setUrl("");
      setHighlight("");
      setSelectedTags([]);
      setTagInput("");
      setCategoryId("cat-inbox");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      <div>
        <label htmlFor="url" className="mb-1 block text-sm font-medium text-[var(--text)]">
          Link
        </label>
        <input
          id="url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          placeholder="Paste or drop a link here (e.g. https://...)"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          autoComplete="url"
        />
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
          Category
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
