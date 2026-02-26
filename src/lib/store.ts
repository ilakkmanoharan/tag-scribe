/**
 * In-memory store for MVP. Replace with DB (SQLite, Postgres, etc.) or file-based persistence later.
 */

import type { Item, Category } from "@/types";

export const categories: Category[] = [
  {
    id: "cat-inbox",
    name: "Inbox",
    description: "Dropped items to process later",
    parentId: null,
    order: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const items: Item[] = [];

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getItemsByCategory(categoryId: string | null): Item[] {
  return items.filter((i) => i.categoryId === categoryId);
}

export function getItemsByTag(tag: string): Item[] {
  const normalized = tag.toLowerCase().trim();
  return items.filter((i) =>
    i.tags.some((t) => t.toLowerCase() === normalized)
  );
}
