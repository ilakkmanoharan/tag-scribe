"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ItemCard } from "@/components/ItemCard";
import type { Item } from "@/types";

export function TagDetailContent() {
  const params = useParams();
  const tagEncoded = params?.tag as string | undefined;
  const tag = tagEncoded ? decodeURIComponent(tagEncoded) : "";
  const { getAuthHeaders, isFirebaseEnabled, user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isFirebaseEnabled && !loading && !user) {
      router.replace("/signin");
      return;
    }
    if (!tag.trim()) return;
    let cancelled = false;
    getAuthHeaders()
      .then((headers) => fetch(`/api/items?tag=${encodeURIComponent(tag)}`, { headers }))
      .then((res) => {
        if (res.status === 401) {
          if (!cancelled) router.replace("/signin");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load");
      });
    return () => { cancelled = true; };
  }, [tag, getAuthHeaders, isFirebaseEnabled, user, loading, router]);

  if (isFirebaseEnabled && (loading || !user)) {
    return <div className="text-[var(--muted)]">Loading…</div>;
  }
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/tags" className="hover:text-[var(--text)]">
          Tags
        </Link>
        <span>/</span>
        <span className="text-[var(--text)]">{tag}</span>
      </div>
      <h1 className="mb-2 text-2xl font-semibold">Tag: {tag}</h1>
      <p className="mb-4 text-[var(--muted)]">
        {items.length} {items.length === 1 ? "item" : "items"} with this tag.
      </p>
      {items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No items with this tag.{" "}
          <Link href="/add" className="font-medium text-[var(--accent)] hover:underline">
            Add
          </Link>{" "}
          a link and use the tag &quot;{tag}&quot; to see it here.
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} showArchive showDelete />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
