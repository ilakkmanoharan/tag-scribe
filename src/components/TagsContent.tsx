"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function TagsContent() {
  const { getAuthHeaders, isFirebaseEnabled, user, loading } = useAuth();
  const router = useRouter();
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isFirebaseEnabled && !loading && !user) {
      router.replace("/signin");
      return;
    }
    let cancelled = false;
    getAuthHeaders()
      .then((headers) => fetch("/api/tags", { headers }))
      .then((res) => {
        if (res.status === 401) {
          if (!cancelled) router.replace("/signin");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setTags(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load");
      });
    return () => { cancelled = true; };
  }, [getAuthHeaders, isFirebaseEnabled, user, loading, router]);

  if (isFirebaseEnabled && (loading || !user)) {
    return <div className="text-[var(--muted)]">Loading…</div>;
  }
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Tags</h1>
      <p className="text-[var(--muted)]">
        Search by tag across all links, images, and text. Click a tag to see
        everything saved with that tag.
      </p>
      {tags.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No tags yet. When you{" "}
          <Link href="/add" className="font-medium text-[var(--accent)] hover:underline">
            Add
          </Link>{" "}
          a link and add tags, they will show up here.
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--border)] hover:text-[var(--accent)]"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
