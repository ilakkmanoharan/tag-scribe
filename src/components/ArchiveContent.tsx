"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ItemCard } from "@/components/ItemCard";
import type { Item } from "@/types";

function formatArchiveDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function ArchiveContent() {
  const { getAuthHeaders, isFirebaseEnabled, user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isFirebaseEnabled && !loading && !user) {
      router.replace("/signin");
      return;
    }
    let cancelled = false;
    getAuthHeaders()
      .then((headers) => fetch("/api/items?archived=true", { headers }))
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
  }, [getAuthHeaders, isFirebaseEnabled, user, loading, router]);

  const byDate = items.reduce<Record<string, Item[]>>((acc, item) => {
    const key = item.archivedAt ? getDateKey(item.archivedAt) : "";
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  if (isFirebaseEnabled && (loading || !user)) {
    return <div className="text-[var(--muted)]">Loading…</div>;
  }
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-semibold">Archive</h1>
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
          ← Library
        </Link>
      </div>
      <p className="text-[var(--muted)]">
        Archived items are hidden from the Library. They are grouped by the
        date they were archived. Unarchive to bring an item back to the
        Library.
      </p>
      {sortedDates.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No archived items. Use <strong>Archive</strong> on any item in the
          Library or a category to move it here.
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {sortedDates.map((dateKey) => {
            const dayItems = byDate[dateKey];
            const label = dayItems?.[0]?.archivedAt
              ? formatArchiveDate(dayItems[0].archivedAt!)
              : dateKey;
            return (
              <section key={dateKey}>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
                  {label}
                </h2>
                <ul className="space-y-4">
                  {dayItems?.map((item) => (
                    <li key={item.id}>
                      <ItemCard item={item} showUnarchive showDelete />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
