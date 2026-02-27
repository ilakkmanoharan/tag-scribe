"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ItemCard } from "@/components/ItemCard";
import type { Item } from "@/types";

export function LibraryContent() {
  const { user, loading, getToken, isFirebaseEnabled } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isFirebaseEnabled && !loading && !user) {
      router.replace("/signin");
      return;
    }
    let cancelled = false;
    async function fetchItems() {
      const token = isFirebaseEnabled && user ? await getToken() : null;
      const res = await fetch("/api/items", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        if (!cancelled) router.replace("/signin");
        return;
      }
      if (!res.ok) {
        if (!cancelled) setError("Failed to load items");
        return;
      }
      const data = await res.json();
      if (!cancelled) setItems(data);
    }
    if (!loading && (!isFirebaseEnabled || user)) {
      fetchItems();
    }
    return () => {
      cancelled = true;
    };
  }, [loading, user, isFirebaseEnabled, getToken, router]);

  if (loading || (isFirebaseEnabled && !user) || (items === null && !error)) {
    return (
      <div className="text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-red-400">
        {error}
      </div>
    );
  }

  const list = items ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-semibold">Library</h1>
        <Link
          href="/archive"
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Archive
        </Link>
      </div>
      <p className="text-[var(--muted)]">
        All your saved links, highlights, images, and text. Search by tag or
        open a category to organize.
      </p>
      {list.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No items yet. Use{" "}
          <Link href="/add" className="font-medium text-[var(--accent)] hover:underline">
            Add
          </Link>{" "}
          to paste or drop a link.
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {list.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} showArchive showDelete />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
