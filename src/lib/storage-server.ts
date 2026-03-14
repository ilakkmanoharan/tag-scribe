/**
 * Firebase Storage helpers (server) — upload item images and get signed URLs.
 */

import { getAdminStorage } from "./firebase-admin";

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Storage path for an item image: users/{uid}/items/{itemId}/image.{ext} or /{index}.{ext} for multi-image */
export function getItemImageStoragePath(uid: string, itemId: string, mimeType: string, index?: number): string {
  const ext = MIME_EXT[mimeType.toLowerCase()] || "png";
  const name = index !== undefined && index >= 0 ? String(index) : "image";
  return `users/${uid}/items/${itemId}/${name}.${ext}`;
}

/**
 * Upload an image buffer to Firebase Storage and return the storage path.
 * Path format: users/{uid}/items/{itemId}/image.{ext}
 */
function getStorageBucket() {
  const storage = getAdminStorage();
  if (!storage) return null;
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return bucketName ? storage.bucket(bucketName) : storage.bucket();
}

export async function uploadItemImage(
  uid: string,
  itemId: string,
  buffer: Buffer,
  mimeType: string,
  index?: number
): Promise<string> {
  const bucket = getStorageBucket();
  if (!bucket) throw new Error("Firebase Storage not configured");
  const path = getItemImageStoragePath(uid, itemId, mimeType, index);
  const file = bucket.file(path);
  await file.save(buffer, {
    metadata: { contentType: mimeType },
    resumable: false,
  });
  return path;
}

/** Default signed URL expiry: 1 hour */
const SIGNED_URL_EXPIRY_MS = 60 * 60 * 1000;

/**
 * Get a signed URL for reading an item image from Storage.
 * @param storagePath - Path returned from uploadItemImage (e.g. users/uid/items/itemId/image.png)
 */
export async function getItemImageSignedUrl(storagePath: string): Promise<string | null> {
  const bucket = getStorageBucket();
  if (!bucket) return null;
  const file = bucket.file(storagePath);
  try {
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: new Date(Date.now() + SIGNED_URL_EXPIRY_MS),
    });
    return url ?? null;
  } catch {
    return null;
  }
}
