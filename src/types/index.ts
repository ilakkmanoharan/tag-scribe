/**
 * Tag Scribe — core data types
 * See docs/PRODUCT.md for the full product vision.
 */

export type ItemType = "link" | "image" | "text" | "video";

export type SourceHint = "web" | "book" | "camera" | "manual" | "social";

export interface Item {
  id: string;
  type: ItemType;
  /** For link: URL. For image: file path or blob ref. For text: raw text. */
  content: string;
  /** Optional display title (e.g. page title for links). */
  title?: string;
  /** For links: highlighted sentence(s) from the article. */
  highlight?: string;
  /** For images/text: caption or quote. */
  caption?: string;
  tags: string[];
  categoryId: string | null;
  source?: SourceHint;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  /** When set, item is archived (hidden from Library); used for grouping in Archive by date. */
  archivedAt?: string | null; // ISO
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId: string | null; // for nested folders later
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  name: string; // normalized, e.g. lowercase
  itemIds?: string[]; // optional for quick lookup
}
