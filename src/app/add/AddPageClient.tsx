"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AddForm } from "@/components/AddForm";

type Category = { id: string; name: string };

export function AddPageClient() {
  const { getAuthHeaders, isFirebaseEnabled, user, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseEnabled && !loading && !user) {
      router.replace("/signin");
      return;
    }
    let cancelled = false;
    getAuthHeaders()
      .then((headers) => fetch("/api/categories", { headers }))
      .then((r) => (r && r.ok ? r.json() : []))
      .then((data: Category[]) => {
        if (!cancelled) {
          setCategories(Array.isArray(data) ? data : []);
          setCategoriesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => { cancelled = true; };
  }, [getAuthHeaders, isFirebaseEnabled, user, loading, router]);

  if (isFirebaseEnabled && (loading || !user)) {
    return <div className="text-[var(--muted)]">Loading…</div>;
  }

  if (categoriesLoading && categories.length === 0) {
    return <div className="text-[var(--muted)]">Loading categories…</div>;
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Add</h1>
      <p className="text-[var(--muted)]">
        Paste or drop a link, a picture, or some text. All are optional except
        the title. Optional highlight, tags, and category (defaults to Inbox).
        Saved to your library.
      </p>
      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <AddForm categories={categories} />
      </div>
    </div>
  );
}
