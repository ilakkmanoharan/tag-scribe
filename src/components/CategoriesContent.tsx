"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryRow } from "@/components/CategoryRow";
import type { Category, Item } from "@/types";

export function CategoriesContent() {
  const { getAuthHeaders, isFirebaseEnabled, user, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isFirebaseEnabled && !loading && !user) {
      router.replace("/signin");
      return;
    }
    let cancelled = false;
    const headers = () => getAuthHeaders();
    Promise.all([
      headers().then((h) => fetch("/api/categories", { headers: h })),
      headers().then((h) => fetch("/api/items", { headers: h })),
    ])
      .then(([catRes, itemsRes]) => {
        if (catRes.status === 401 || itemsRes.status === 401) {
          if (!cancelled) router.replace("/signin");
          return;
        }
        return Promise.all([catRes.json(), itemsRes.json()]);
      })
      .then((data) => {
        if (cancelled || !data) return;
        const [cats, itemList] = data as [Category[], Item[]];
        setCategories(Array.isArray(cats) ? cats : []);
        setItems(Array.isArray(itemList) ? itemList : []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load");
      });
    return () => { cancelled = true; };
  }, [getAuthHeaders, isFirebaseEnabled, user, loading, router]);

  const itemCountByCategory = items.reduce<Record<string, number>>((acc, item) => {
    const id = item.categoryId ?? "_none";
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});

  if (isFirebaseEnabled && (loading || !user)) {
    return <div className="text-[var(--muted)]">Loading…</div>;
  }
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Categories</h1>
      <p className="text-[var(--muted)]">
        Create folders like &quot;Leaves&quot;, &quot;To process&quot;, or
        &quot;Book highlights&quot;. Drop links, images, and text into them,
        then open a category to reorganize.
      </p>
      {categories.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No categories yet. Create one when you{" "}
          <Link href="/add" className="font-medium text-[var(--accent)] hover:underline">
            Add
          </Link>{" "}
          a link and choose &quot;+ Add new category&quot;.
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {categories.map((cat) => (
            <CategoryRow
              key={cat.id}
              id={cat.id}
              name={cat.name}
              count={itemCountByCategory[cat.id] ?? 0}
              isInbox={cat.id === "cat-inbox"}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
