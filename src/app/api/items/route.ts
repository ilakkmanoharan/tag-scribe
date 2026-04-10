import { NextResponse } from "next/server";
import { writeFile, mkdir, stat } from "fs/promises";
import path from "path";
import * as firestore from "@/lib/firestore";
import { requireUidOrNull } from "@/lib/auth-server";
import { uploadItemImage } from "@/lib/storage-server";
import type { ItemType, SourceHint } from "@/types";

export const dynamic = "force-dynamic";

const VALID_SOURCES: SourceHint[] = ["web", "book", "camera", "manual", "social"];

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function parseImageDataUrl(id: string, dataUrl: string): { filePath: string; relativePath: string; buffer: Buffer; dir: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext = MIME_EXT[mime] || "png";
  const base64 = match[2];
  const dir = path.join(process.cwd(), "private", "uploads", "items");
  const filePath = path.join(dir, `${id}.${ext}`);
  const relativePath = `uploads/items/${id}.${ext}`;
  const buffer = Buffer.from(base64, "base64");
  return { filePath, relativePath, buffer, dir };
}

export async function GET(request: Request) {
  try {
    const result = await requireUidOrNull(request);
    if ("status" in result && result.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const archived = searchParams.get("archived") === "true";
    const categoryId = searchParams.get("categoryId");
    const tag = searchParams.get("tag");

    if (result.uid) {
      const items = archived
        ? await firestore.getArchivedItems(result.uid)
        : tag != null
          ? await firestore.getItemsByTag(result.uid, tag)
          : categoryId != null
            ? await firestore.getItemsByCategoryId(result.uid, categoryId)
            : await firestore.getAllItems(result.uid);
      return NextResponse.json(items);
    }
    const { getAllItems, getArchivedItems, getItemsByCategoryId, getItemsByTag } = await import("@/lib/db");
    const items = archived
      ? getArchivedItems()
      : tag != null
        ? getItemsByTag(tag)
        : categoryId != null
          ? getItemsByCategoryId(categoryId)
          : getAllItems();
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireUidOrNull(request);
    if ("status" in result && result.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let id: string;
    let type: ItemType;
    let contentToStore: string;
    let title: string | undefined;
    let highlight: string | undefined;
    let caption: string | undefined;
    let tags: string[];
    let categoryId: string | null;
    let sourceHint: SourceHint | undefined;
    let dueDateForItem: string | null | undefined = undefined;
    let priorityForItem: string | null | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const imageFiles = formData.getAll("image") as File[];
      const validImageFiles = imageFiles.filter((f): f is File => f instanceof File && f.size > 0 && f.type.startsWith("image/"));
      if (validImageFiles.length === 0) {
        return NextResponse.json({ error: "At least one image file is required" }, { status: 400 });
      }
      type = "image";
      id = "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
      const imageUrlsToStore: string[] = [];

      for (let index = 0; index < validImageFiles.length; index++) {
        const imageFile = validImageFiles[index];
        const mime = (imageFile.type || "image/png").toLowerCase();
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (result.uid) {
          try {
            const storagePath = await uploadItemImage(result.uid, id, buffer, mime, index);
            imageUrlsToStore.push(storagePath);
          } catch (uploadErr) {
            console.error("Firebase Storage upload failed:", uploadErr);
            return NextResponse.json(
              { error: "Failed to upload image to storage" },
              { status: 500 }
            );
          }
        } else {
          const ext = MIME_EXT[mime] || "png";
          const dir = path.join(process.cwd(), "private", "uploads", "items");
          const filePath = path.join(dir, `${id}_${index}.${ext}`);
          await mkdir(dir, { recursive: true });
          await writeFile(filePath, buffer);
          const st = await stat(filePath);
          if (!st.size) {
            return NextResponse.json({ error: "Image could not be saved to disk" }, { status: 500 });
          }
          imageUrlsToStore.push(`uploads/items/${id}_${index}.${ext}`);
        }
      }

      contentToStore = imageUrlsToStore[0];
      title = (formData.get("title") as string)?.trim() || undefined;
      caption = (formData.get("caption") as string)?.trim() || undefined;
      const tagsRaw = formData.get("tags");
      tags = tagsRaw ? (typeof tagsRaw === "string" ? JSON.parse(tagsRaw) : tagsRaw) : [];
      categoryId = (formData.get("categoryId") as string) || "cat-inbox";
      sourceHint = "camera";
      highlight = undefined;
      const ddM = formData.get("dueDate");
      if (ddM != null && String(ddM).trim() !== "") {
        dueDateForItem = String(ddM).trim().slice(0, 10);
      }
      const prM = formData.get("priority");
      if (prM != null && String(prM).trim() !== "") {
        priorityForItem = String(prM).trim().toLowerCase();
      }

      if (result.uid) {
        await firestore.ensureInboxCategory(result.uid);
        const item = await firestore.createItem(result.uid, {
          id,
          type,
          content: contentToStore,
          imageUrls: imageUrlsToStore,
          title,
          highlight,
          caption,
          tags,
          categoryId,
          source: sourceHint,
          dueDate: dueDateForItem ?? null,
          priority: priorityForItem ?? null,
        });
        return NextResponse.json(item);
      }
      const { createItem } = await import("@/lib/db");
      const item = createItem({
        id,
        type,
        content: contentToStore,
        imageUrls: imageUrlsToStore,
        title,
        highlight,
        caption,
        tags,
        categoryId,
        source: sourceHint,
        dueDate: dueDateForItem ?? null,
        priority: priorityForItem ?? null,
      });
      return NextResponse.json(item);
    } else {
      const body = await request.json();
      const {
        type: t,
        content,
        title: tit,
        highlight: hl,
        caption: cap,
        tags: tg,
        categoryId: catId,
        source,
        dueDate: dueD,
        priority: pri,
      } = body as {
        type: ItemType;
        content: string;
        title?: string;
        highlight?: string;
        caption?: string;
        tags?: string[];
        categoryId?: string | null;
        source?: string;
        dueDate?: string | null;
        priority?: string | null;
      };
      sourceHint = source && VALID_SOURCES.includes(source as SourceHint) ? (source as SourceHint) : undefined;
      if (!t || !content || typeof content !== "string") {
        return NextResponse.json({ error: "type and content are required" }, { status: 400 });
      }
      const validTypes: ItemType[] = ["link", "image", "text", "video"];
      if (!validTypes.includes(t)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
      type = t;
      id = "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
      contentToStore = content.trim();
      title = tit?.trim() || undefined;
      highlight = hl?.trim() || undefined;
      caption = cap?.trim() || undefined;
      tags = Array.isArray(tg) ? tg.map((x: string) => String(x).trim()).filter(Boolean) : [];
      categoryId = catId ?? "cat-inbox";
      if (dueD !== undefined) {
        dueDateForItem =
          dueD === null || dueD === ""
            ? null
            : String(dueD)
                .trim()
                .slice(0, 10) || null;
      }
      if (pri !== undefined) {
        priorityForItem =
          pri === null || pri === ""
            ? null
            : String(pri)
                .trim()
                .toLowerCase() || null;
      }

      if (type === "image" && contentToStore.startsWith("data:image/")) {
        const parsed = parseImageDataUrl(id, contentToStore);
        if (parsed) {
          if (result.uid) {
            try {
              const mime = contentToStore.match(/^data:(image\/[a-z]+);/i)?.[1] || "image/png";
              contentToStore = await uploadItemImage(result.uid, id, parsed.buffer, mime);
            } catch (uploadErr) {
              console.error("Firebase Storage upload failed (data URL):", uploadErr);
              return NextResponse.json(
                { error: "Failed to upload image to storage" },
                { status: 500 }
              );
            }
          } else {
            await mkdir(parsed.dir, { recursive: true });
            await writeFile(parsed.filePath, parsed.buffer);
            const st = await stat(parsed.filePath).catch(() => null);
            if (st && st.size > 0) {
              contentToStore = parsed.relativePath;
            }
          }
        }
      }
    }

    if (result.uid) {
      await firestore.ensureInboxCategory(result.uid);
      const item = await firestore.createItem(result.uid, {
        id,
        type,
        content: contentToStore,
        title,
        highlight,
        caption,
        tags,
        categoryId,
        source: sourceHint,
        dueDate: dueDateForItem ?? null,
        priority: priorityForItem ?? null,
      });
      return NextResponse.json(item);
    }
    const { createItem } = await import("@/lib/db");
    const item = createItem({
      id,
      type,
      content: contentToStore,
      title,
      highlight,
      caption,
      tags,
      categoryId,
      source: sourceHint,
      dueDate: dueDateForItem ?? null,
      priority: priorityForItem ?? null,
    });
    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }
}
