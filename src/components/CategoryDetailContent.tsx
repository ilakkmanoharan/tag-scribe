"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ItemCard } from "@/components/ItemCard";
import type { Category, Item } from "@/types";

export function CategoryDetailContent() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { getAuthHeaders, isFirebaseEnabled, user, loading } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isFirebaseEnabled && !loading && !user) {
      router.replace("/signin");
      return;
    }
    if (!id) return;
    let cancelled = false;
    const headers = () => getAuthHeaders();
    headers()
      .then((h) => fetch("/api/categories", { headers: h }))
      .then((res) => {
        if (res.status === 401) {
          if (!cancelled) router.replace("/signin");
          return null;
        }
        return res.json();
      })
      .then((cats) => {
        if (cancelled || !cats) return;
        const cat = (Array.isArray(cats) ? cats : []).find((c: Category) => c.id === id);
        if (!cat) {
          setNotFound(true);
          return;
        }
        setCategory(cat);
        return headers().then((h) => fetch(`/api/items?categoryId=${encodeURIComponent(id)}`, { headers: h }));
      })
      .then((res) => {
        if (cancelled || !res) return;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load");
      });
    return () => { cancelled = true; };
  }, [id, getAuthHeaders, isFirebaseEnabled, user, loading, router]);

  if (isFirebaseEnabled && (loading || !user)) {
    return <div className="text-[var(--muted)]">Loading…</div>;
  }
  if (notFound) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
        Category not found. <Link href="/categories" className="text-[var(--accent)] hover:underline">Back to Categories</Link>
      </div>
    );
  }
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }
  if (!category) {
    return <div className="text-[var(--muted)]">Loading…</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/categories" className="hover:text-[var(--text)]">
          Categories
        </Link>
        <span>/</span>
        <span className="text-[var(--text)]">{category.name}</span>
      </div>
      <h1 className="mb-2 text-2xl font-semibold">{category.name}</h1>
      {category.description && (
        <p className="mb-4 text-[var(--muted)]">{category.description}</p>
      )}
      {items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No items in this category.{" "}
          <Link href="/add" className="font-medium text-[var(--accent)] hover:underline">
            Add
          </Link>{" "}
          a link and choose this category.
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
