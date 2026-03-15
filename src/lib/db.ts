import Database from "better-sqlite3";
import path from "path";
import type { Item, Category } from "@/types";

const DB_PATH = path.join(process.cwd(), "private", "tag-scribe.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      parent_id TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('link', 'image', 'text')),
      content TEXT NOT NULL,
      title TEXT,
      highlight TEXT,
      caption TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      category_id TEXT,
      source TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);
  try {
    database.exec("ALTER TABLE items ADD COLUMN archived_at TEXT");
  } catch {
    // column already exists
  }
  // Allow type 'video': migrate items table if it still has old CHECK
  try {
    database.exec(
      "INSERT INTO items (id, type, content, created_at, updated_at, tags) VALUES ('_v', 'video', '', datetime('now'), datetime('now'), '[]')"
    );
    database.exec("DELETE FROM items WHERE id = '_v'");
  } catch {
    database.exec(`
      CREATE TABLE items_new (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        title TEXT,
        highlight TEXT,
        caption TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        category_id TEXT,
        source TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );
      INSERT INTO items_new SELECT id, type, content, title, highlight, caption, tags, category_id, source, created_at, updated_at, archived_at FROM items;
      DROP TABLE items;
      ALTER TABLE items_new RENAME TO items;
    `);
  }
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT OR IGNORE INTO categories (id, name, description, parent_id, "order", created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run("cat-inbox", "Inbox", "Dropped items to process later", null, 0, now, now);
  try {
    database.exec("ALTER TABLE items ADD COLUMN image_urls TEXT");
  } catch {
    // column already exists
  }
}

function rowToItem(row: Record<string, unknown>): Item {
  const imageUrlsRaw = row.image_urls;
  const imageUrls =
    imageUrlsRaw != null && imageUrlsRaw !== ""
      ? (JSON.parse(String(imageUrlsRaw)) as string[])
      : undefined;
  return {
    id: row.id as string,
    type: row.type as Item["type"],
    content: row.content as string,
    imageUrls: Array.isArray(imageUrls) ? imageUrls : undefined,
    title: (row.title as string) ?? undefined,
    highlight: (row.highlight as string) ?? undefined,
    caption: (row.caption as string) ?? undefined,
    tags: JSON.parse((row.tags as string) || "[]") as string[],
    categoryId: (row.category_id as string) ?? null,
    source: (row.source as Item["source"]) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    archivedAt: (row.archived_at as string) ?? undefined,
  };
}

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? undefined,
    parentId: (row.parent_id as string) ?? null,
    order: (row.order as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function getAllCategories(): Category[] {
  const database = getDb();
  const rows = database.prepare("SELECT * FROM categories ORDER BY \"order\", name").all() as Record<string, unknown>[];
  return rows.map(rowToCategory);
}

export function getCategoryById(id: string): Category | undefined {
  const database = getDb();
  const row = database.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToCategory(row) : undefined;
}

export function getItemById(id: string): Item | undefined {
  const database = getDb();
  const row = database.prepare("SELECT * FROM items WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToItem(row) : undefined;
}

/** Returns non-archived items (for Library and category views). */
export function getAllItems(): Item[] {
  const database = getDb();
  const rows = database
    .prepare("SELECT * FROM items WHERE archived_at IS NULL ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToItem);
}

/** Returns all items including archived (e.g. for counts). */
export function getAllItemsIncludingArchived(): Item[] {
  const database = getDb();
  const rows = database.prepare("SELECT * FROM items ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(rowToItem);
}

export function getItemsByCategoryId(categoryId: string | null): Item[] {
  const database = getDb();
  const rows = database
    .prepare("SELECT * FROM items WHERE category_id IS ? AND archived_at IS NULL ORDER BY created_at DESC")
    .all(categoryId ?? null) as Record<string, unknown>[];
  return rows.map(rowToItem);
}

/** Returns archived items only, newest first (by archived_at). */
export function getArchivedItems(): Item[] {
  const database = getDb();
  const rows = database
    .prepare("SELECT * FROM items WHERE archived_at IS NOT NULL ORDER BY archived_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToItem);
}

export function setItemArchived(id: string, archived: boolean): Item | undefined {
  const database = getDb();
  const row = database.prepare("SELECT * FROM items WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  const now = new Date().toISOString();
  database.prepare("UPDATE items SET archived_at = ?, updated_at = ? WHERE id = ?").run(archived ? now : null, now, id);
  return rowToItem({ ...row, archived_at: archived ? now : null, updated_at: now });
}

export function updateItemCategory(id: string, categoryId: string): Item | undefined {
  const database = getDb();
  const row = database.prepare("SELECT * FROM items WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  const now = new Date().toISOString();
  database.prepare("UPDATE items SET category_id = ?, updated_at = ? WHERE id = ?").run(categoryId, now, id);
  return rowToItem({ ...row, category_id: categoryId, updated_at: now });
}

export function updateItemTags(id: string, tags: string[]): Item | undefined {
  const database = getDb();
  const row = database.prepare("SELECT * FROM items WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  const normalized = tags.map((t) => t.trim()).filter(Boolean);
  const now = new Date().toISOString();
  database.prepare("UPDATE items SET tags = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(normalized), now, id);
  return rowToItem({ ...row, tags: JSON.stringify(normalized), updated_at: now });
}

export type ItemUpdateFields = Partial<
  Pick<Item, "title" | "content" | "highlight" | "caption" | "categoryId" | "tags" | "imageUrls" | "type">
> & { archived?: boolean };

export function updateItem(id: string, fields: ItemUpdateFields): Item | undefined {
  const database = getDb();
  const row = database.prepare("SELECT * FROM items WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { ...row, updated_at: now };
  if (fields.title !== undefined) updates.title = fields.title ?? null;
  if (fields.content !== undefined) updates.content = fields.content ?? "";
  if (fields.highlight !== undefined) updates.highlight = fields.highlight ?? null;
  if (fields.caption !== undefined) updates.caption = fields.caption ?? null;
  if (fields.categoryId !== undefined) updates.category_id = fields.categoryId ?? null;
  if (Array.isArray(fields.imageUrls)) updates.image_urls = JSON.stringify(fields.imageUrls);
  if (fields.type !== undefined) updates.type = fields.type;
  if (Array.isArray(fields.tags)) {
    const normalized = fields.tags.map((t) => t.trim()).filter(Boolean);
    updates.tags = JSON.stringify(normalized);
  }
  if (typeof fields.archived === "boolean") {
    updates.archived_at = fields.archived ? now : null;
  }
  database
    .prepare(
      `UPDATE items SET
        title = ?, content = ?, highlight = ?, caption = ?,
        type = ?, tags = ?, category_id = ?, image_urls = ?, updated_at = ?, archived_at = ?
      WHERE id = ?`
    )
    .run(
      updates.title ?? row.title,
      updates.content ?? row.content,
      updates.highlight ?? row.highlight,
      updates.caption ?? row.caption,
      updates.type ?? row.type,
      updates.tags ?? row.tags,
      updates.category_id ?? row.category_id,
      updates.image_urls ?? row.image_urls ?? "[]",
      now,
      updates.archived_at ?? row.archived_at,
      id
    );
  return rowToItem({ ...row, ...updates, updated_at: now });
}

export function deleteItem(id: string): boolean {
  const database = getDb();
  const result = database.prepare("DELETE FROM items WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getItemsByTag(tag: string): Item[] {
  const database = getDb();
  const all = getAllItems();
  const normalized = tag.toLowerCase().trim();
  return all.filter((i) => i.tags.some((t) => t.toLowerCase() === normalized));
}

export function createCategory(category: Omit<Category, "createdAt" | "updatedAt">): Category {
  const database = getDb();
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO categories (id, name, description, parent_id, "order", created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      category.id,
      category.name,
      category.description ?? null,
      category.parentId ?? null,
      category.order ?? 0,
      now,
      now
    );
  return { ...category, createdAt: now, updatedAt: now };
}

export function updateCategory(
  id: string,
  updates: { name?: string; description?: string }
): Category | undefined {
  const database = getDb();
  const existing = getCategoryById(id);
  if (!existing) return undefined;
  const name = updates.name?.trim() ?? existing.name;
  const description = updates.description !== undefined ? updates.description : existing.description;
  const now = new Date().toISOString();
  database
    .prepare("UPDATE categories SET name = ?, description = ?, updated_at = ? WHERE id = ?")
    .run(name, description ?? null, now, id);
  return { ...existing, name, description, updatedAt: now };
}

export function deleteCategory(id: string): boolean {
  if (id === "cat-inbox") return false; // cannot delete Inbox
  const database = getDb();
  database.prepare("UPDATE items SET category_id = ? WHERE category_id = ?").run("cat-inbox", id);
  database.prepare("DELETE FROM categories WHERE id = ?").run(id);
  return true;
}

export function getUniqueTags(): string[] {
  const items = getAllItems();
  const set = new Set<string>();
  for (const item of items) {
    for (const t of item.tags) {
      if (t.trim()) set.add(t.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

export function createItem(item: Omit<Item, "createdAt" | "updatedAt">): Item {
  const database = getDb();
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO items (id, type, content, image_urls, title, highlight, caption, tags, category_id, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      item.id,
      item.type,
      item.content,
      Array.isArray(item.imageUrls) ? JSON.stringify(item.imageUrls) : "[]",
      item.title ?? null,
      item.highlight ?? null,
      item.caption ?? null,
      JSON.stringify(item.tags),
      item.categoryId ?? null,
      item.source ?? null,
      now,
      now
    );
  return { ...item, createdAt: now, updatedAt: now };
}
