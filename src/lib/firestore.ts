/**
 * Firestore access layer — per-user collections.
 * users/{uid}/categories/{categoryId}, users/{uid}/items/{itemId}
 * Used from API routes only (server); requires uid from verified token.
 */

import { getAdminFirestore } from "./firebase-admin";
import type { Item, Category } from "@/types";

function userCategories(uid: string) {
  const db = getAdminFirestore();
  if (!db) return null;
  return db.collection("users").doc(uid).collection("categories");
}

function userItems(uid: string) {
  const db = getAdminFirestore();
  if (!db) return null;
  return db.collection("users").doc(uid).collection("items");
}

function docToCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    name: (data.name as string) ?? "",
    description: (data.description as string | undefined) ?? undefined,
    parentId: (data.parentId as string | null) ?? null,
    order: (data.order as number) ?? 0,
    createdAt: (data.createdAt as string) ?? "",
    updatedAt: (data.updatedAt as string) ?? "",
  };
}

function docToItem(id: string, data: Record<string, unknown>): Item {
  return {
    id,
    type: (data.type as Item["type"]) ?? "text",
    content: (data.content as string) ?? "",
    title: (data.title as string | undefined) ?? undefined,
    highlight: (data.highlight as string | undefined) ?? undefined,
    caption: (data.caption as string | undefined) ?? undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    categoryId: (data.categoryId as string | null) ?? null,
    source: (data.source as Item["source"]) ?? undefined,
    createdAt: (data.createdAt as string) ?? "",
    updatedAt: (data.updatedAt as string) ?? "",
    archivedAt: (data.archivedAt as string | null | undefined) ?? undefined,
  };
}

export async function getAllCategories(uid: string): Promise<Category[]> {
  const col = userCategories(uid);
  if (!col) return [];
  const snap = await col.get();
  return snap.docs
    .map((d) => docToCategory(d.id, d.data()))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export async function getCategoryById(uid: string, id: string): Promise<Category | undefined> {
  const col = userCategories(uid);
  if (!col) return undefined;
  const doc = await col.doc(id).get();
  if (!doc.exists) return undefined;
  return docToCategory(doc.id, doc.data()!);
}

export async function getItemById(uid: string, id: string): Promise<Item | undefined> {
  const col = userItems(uid);
  if (!col) return undefined;
  const doc = await col.doc(id).get();
  if (!doc.exists) return undefined;
  return docToItem(doc.id, doc.data()!);
}

export async function getAllItems(uid: string): Promise<Item[]> {
  const col = userItems(uid);
  if (!col) return [];
  const snap = await col.get();
  return snap.docs
    .map((d) => docToItem(d.id, d.data()))
    .filter((i) => i.archivedAt == null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAllItemsIncludingArchived(uid: string): Promise<Item[]> {
  const col = userItems(uid);
  if (!col) return [];
  const snap = await col.orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => docToItem(d.id, d.data()));
}

export async function getItemsByCategoryId(uid: string, categoryId: string | null): Promise<Item[]> {
  const items = await getAllItems(uid);
  if (categoryId === null) return items.filter((i) => i.categoryId === null);
  return items.filter((i) => i.categoryId === categoryId);
}

export async function getArchivedItems(uid: string): Promise<Item[]> {
  const col = userItems(uid);
  if (!col) return [];
  const snap = await col.get();
  const items = snap.docs
    .map((d) => docToItem(d.id, d.data()))
    .filter((i) => i.archivedAt != null)
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
  return items;
}

export async function getItemsByTag(uid: string, tag: string): Promise<Item[]> {
  const items = await getAllItems(uid);
  const normalized = tag.toLowerCase().trim();
  return items.filter((i) => i.tags.some((t) => t.toLowerCase() === normalized));
}

export async function getUniqueTags(uid: string): Promise<string[]> {
  const items = await getAllItems(uid);
  const set = new Set<string>();
  for (const item of items) {
    for (const t of item.tags) {
      if (t.trim()) set.add(t.trim());
    }
  }
  return Array.from(set).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

const now = () => new Date().toISOString();

export async function createCategory(uid: string, category: Omit<Category, "createdAt" | "updatedAt">): Promise<Category> {
  const col = userCategories(uid);
  if (!col) throw new Error("Firestore not configured");
  const createdAt = now();
  const updatedAt = createdAt;
  await col.doc(category.id).set({
    name: category.name,
    description: category.description ?? null,
    parentId: category.parentId ?? null,
    order: category.order ?? 0,
    createdAt,
    updatedAt,
  });
  return { ...category, createdAt, updatedAt };
}

export async function updateCategory(
  uid: string,
  id: string,
  updates: { name?: string; description?: string }
): Promise<Category | undefined> {
  const existing = await getCategoryById(uid, id);
  if (!existing) return undefined;
  const name = updates.name?.trim() ?? existing.name;
  const description = updates.description !== undefined ? updates.description : existing.description;
  const updatedAt = now();
  const col = userCategories(uid);
  if (!col) return undefined;
  await col.doc(id).update({ name, description, updatedAt });
  return { ...existing, name, description, updatedAt };
}

export async function deleteCategory(uid: string, id: string): Promise<boolean> {
  if (id === "cat-inbox") return false;
  const col = userCategories(uid);
  const itemsCol = userItems(uid);
  if (!col || !itemsCol) return false;
  const items = await getItemsByCategoryId(uid, id);
  const batch = getAdminFirestore()!.batch();
  for (const item of items) {
    batch.update(itemsCol.doc(item.id), { categoryId: "cat-inbox" });
  }
  batch.delete(col.doc(id));
  await batch.commit();
  return true;
}

export async function createItem(uid: string, item: Omit<Item, "createdAt" | "updatedAt">): Promise<Item> {
  const col = userItems(uid);
  if (!col) throw new Error("Firestore not configured");
  const createdAt = now();
  const updatedAt = createdAt;
  await col.doc(item.id).set({
    type: item.type,
    content: item.content,
    title: item.title ?? null,
    highlight: item.highlight ?? null,
    caption: item.caption ?? null,
    tags: item.tags ?? [],
    categoryId: item.categoryId ?? null,
    source: item.source ?? null,
    createdAt,
    updatedAt,
    archivedAt: null,
  });
  return { ...item, createdAt, updatedAt };
}

export async function setItemArchived(uid: string, id: string, archived: boolean): Promise<Item | undefined> {
  const existing = await getItemById(uid, id);
  if (!existing) return undefined;
  const archivedAt = archived ? now() : null;
  const updatedAt = now();
  const col = userItems(uid);
  if (!col) return undefined;
  await col.doc(id).update({ archivedAt, updatedAt });
  return { ...existing, archivedAt: archivedAt ?? undefined, updatedAt };
}

export async function updateItemCategory(uid: string, id: string, categoryId: string): Promise<Item | undefined> {
  const existing = await getItemById(uid, id);
  if (!existing) return undefined;
  const updatedAt = now();
  const col = userItems(uid);
  if (!col) return undefined;
  await col.doc(id).update({ categoryId, updatedAt });
  return { ...existing, categoryId, updatedAt };
}

export async function updateItemTags(uid: string, id: string, tags: string[]): Promise<Item | undefined> {
  const existing = await getItemById(uid, id);
  if (!existing) return undefined;
  const normalized = tags.map((t) => t.trim()).filter(Boolean);
  const updatedAt = now();
  const col = userItems(uid);
  if (!col) return undefined;
  await col.doc(id).update({ tags: normalized, updatedAt });
  return { ...existing, tags: normalized, updatedAt };
}

export type ItemUpdateFields = Partial<Pick<Item, "title" | "content" | "highlight" | "caption" | "categoryId" | "tags">> & { archived?: boolean };

export async function updateItem(uid: string, id: string, fields: ItemUpdateFields): Promise<Item | undefined> {
  const existing = await getItemById(uid, id);
  if (!existing) return undefined;
  const col = userItems(uid);
  if (!col) return undefined;
  const updatedAt = now();
  const updates: Record<string, unknown> = { updatedAt };
  if (fields.title !== undefined) updates.title = fields.title ?? null;
  if (fields.content !== undefined) updates.content = fields.content ?? "";
  if (fields.highlight !== undefined) updates.highlight = fields.highlight ?? null;
  if (fields.caption !== undefined) updates.caption = fields.caption ?? null;
  if (fields.categoryId !== undefined) updates.categoryId = fields.categoryId ?? null;
  if (Array.isArray(fields.tags)) {
    updates.tags = fields.tags.map((t) => t.trim()).filter(Boolean);
  }
  if (typeof fields.archived === "boolean") {
    updates.archivedAt = fields.archived ? updatedAt : null;
  }
  await col.doc(id).update(updates);
  const merged: Item = {
    ...existing,
    ...(fields.title !== undefined && { title: fields.title ?? undefined }),
    ...(fields.content !== undefined && { content: fields.content ?? "" }),
    ...(fields.highlight !== undefined && { highlight: fields.highlight ?? undefined }),
    ...(fields.caption !== undefined && { caption: fields.caption ?? undefined }),
    ...(fields.categoryId !== undefined && { categoryId: fields.categoryId }),
    ...(Array.isArray(fields.tags) && { tags: fields.tags.map((t) => t.trim()).filter(Boolean) }),
    ...(typeof fields.archived === "boolean" && { archivedAt: fields.archived ? updatedAt : undefined }),
    updatedAt,
  };
  return merged;
}

export async function deleteItem(uid: string, id: string): Promise<boolean> {
  const col = userItems(uid);
  if (!col) return false;
  await col.doc(id).delete();
  return true;
}

/** Ensure default Inbox category exists for user. */
export async function ensureInboxCategory(uid: string): Promise<void> {
  const col = userCategories(uid);
  if (!col) return;
  const inbox = await col.doc("cat-inbox").get();
  if (inbox.exists) return;
  await createCategory(uid, {
    id: "cat-inbox",
    name: "Inbox",
    description: "Dropped items to process later",
    parentId: null,
    order: 0,
  });
}

const APPLE_UID_COLLECTION = "apple_uid_mapping";

const USER_DETAILS_PROVIDERS = "providers";

/** Ensure users/{uid} document exists with email and provider; merge provider into existing. */
export async function ensureUserDetails(
  uid: string,
  params: { email: string; provider: "email" | "apple" }
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const ref = db.collection("users").doc(uid);
  const existing = await ref.get();
  const now = new Date().toISOString();
  if (!existing.exists) {
    await ref.set({
      email: params.email,
      [USER_DETAILS_PROVIDERS]: [params.provider],
      createdAt: now,
      updatedAt: now,
    });
    return;
  }
  const data = existing.data() ?? {};
  const providers: string[] = Array.isArray(data[USER_DETAILS_PROVIDERS])
    ? (data[USER_DETAILS_PROVIDERS] as string[])
    : [];
  if (!providers.includes(params.provider)) {
    providers.push(params.provider);
  }
  await ref.set(
    {
      email: params.email,
      [USER_DETAILS_PROVIDERS]: providers,
      updatedAt: now,
    },
    { merge: true }
  );
}

/** Save Apple sub -> Firebase uid for server-to-server notification handling. */
export async function setAppleSubToUid(appleSub: string, firebaseUid: string): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  await db.collection(APPLE_UID_COLLECTION).doc(appleSub).set({ firebaseUid });
}

/** Get Firebase uid for an Apple sub (for notifications). */
export async function getUidByAppleSub(appleSub: string): Promise<string | null> {
  const db = getAdminFirestore();
  if (!db) return null;
  const doc = await db.collection(APPLE_UID_COLLECTION).doc(appleSub).get();
  const data = doc.data();
  return (data?.firebaseUid as string) ?? null;
}

/** Remove Apple sub mapping (after user delete). */
export async function deleteAppleSubMapping(appleSub: string): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  await db.collection(APPLE_UID_COLLECTION).doc(appleSub).delete();
}

const MERGED = "merged";
const MERGED_INTO_UID = "mergedIntoUid";
const MERGED_AT = "mergedAt";
const MERGED_ACCOUNT_EMAIL = "mergedAccountEmail";

/** List all user-detail docs for merge script. Returns primary uids only (skips merged/secondary). */
export async function getAllUserDetailsForMerge(): Promise<
  { uid: string; email: string; providers: string[]; merged: boolean }[]
> {
  const db = getAdminFirestore();
  if (!db) return [];
  const snap = await db.collection("users").get();
  const out: { uid: string; email: string; providers: string[]; merged: boolean }[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const merged = data[MERGED] === true;
    const email = typeof data.email === "string" ? data.email.trim() : "";
    const providers = Array.isArray(data[USER_DETAILS_PROVIDERS])
      ? (data[USER_DETAILS_PROVIDERS] as string[])
      : [];
    out.push({ uid: doc.id, email, providers, merged });
  }
  return out;
}

/** Resolve effective uid for data access (follow merge redirect). */
export async function getEffectiveUid(tokenUid: string): Promise<string> {
  const db = getAdminFirestore();
  if (!db) return tokenUid;
  const ref = db.collection("users").doc(tokenUid);
  const doc = await ref.get();
  if (!doc.exists) return tokenUid;
  const data = doc.data() ?? {};
  if (data[MERGED] === true && typeof data[MERGED_INTO_UID] === "string") {
    return data[MERGED_INTO_UID] as string;
  }
  return tokenUid;
}

/** Set merge redirect on secondary account (after data migrated). */
export async function setMergedInto(
  secondaryUid: string,
  primaryUid: string,
  primaryEmail: string
): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const now = new Date().toISOString();
  await db
    .collection("users")
    .doc(secondaryUid)
    .set(
      {
        [MERGED]: true,
        [MERGED_INTO_UID]: primaryUid,
        [MERGED_AT]: now,
        [MERGED_ACCOUNT_EMAIL]: primaryEmail,
        updatedAt: now,
      },
      { merge: true }
    );
}

/** Delete all user data (categories, items, user doc) for the given uid. */
export async function deleteUserData(uid: string): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;
  const userRef = db.collection("users").doc(uid);
  const catCol = userRef.collection("categories");
  const itemCol = userRef.collection("items");

  const catSnap = await catCol.get();
  for (const d of catSnap.docs) await d.ref.delete();
  const itemSnap = await itemCol.get();
  for (const d of itemSnap.docs) await d.ref.delete();
  await userRef.delete();
}

/** Copy all categories and items from fromUid into toUid (merge; ids prefixed to avoid collisions). */
export async function mergeUserDataInto(fromUid: string, toUid: string): Promise<void> {
  const db = getAdminFirestore();
  if (!db) throw new Error("Firestore not configured");
  const prefix = "merge-" + Date.now() + "-";
  const catColFrom = db.collection("users").doc(fromUid).collection("categories");
  const catColTo = db.collection("users").doc(toUid).collection("categories");
  const itemColFrom = db.collection("users").doc(fromUid).collection("items");
  const itemColTo = db.collection("users").doc(toUid).collection("items");

  const catSnap = await catColFrom.get();
  const categoryIdMap: Record<string, string> = { "cat-inbox": "cat-inbox" }; // oldId -> newId
  await ensureInboxCategory(toUid);
  for (const d of catSnap.docs) {
    const oldId = d.id;
    if (oldId === "cat-inbox") continue; // target already has inbox
    const newId = prefix + "cat-" + oldId;
    categoryIdMap[oldId] = newId;
    const data = d.data();
    await catColTo.doc(newId).set({
      ...data,
      name: data.name ?? "",
      description: data.description ?? null,
      parentId: data.parentId ? categoryIdMap[data.parentId as string] ?? "cat-inbox" : null,
      order: data.order ?? 0,
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    });
  }

  const itemSnap = await itemColFrom.get();
  for (const d of itemSnap.docs) {
    const newId = prefix + d.id;
    const data = d.data();
    const categoryId = (data.categoryId as string) || null;
    const mappedCategoryId = categoryId ? categoryIdMap[categoryId] ?? "cat-inbox" : null;
    await itemColTo.doc(newId).set({
      ...data,
      categoryId: mappedCategoryId,
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      archivedAt: data.archivedAt ?? null,
    });
  }
}
