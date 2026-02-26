import { NextResponse } from "next/server";
import { writeFile, mkdir, stat } from "fs/promises";
import path from "path";
import { getAllItems, createItem } from "@/lib/db";
import type { ItemType, SourceHint } from "@/types";

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

export async function GET() {
  try {
    const items = getAllItems();
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load items" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const imageFile = formData.get("image") as File | null;
      if (!imageFile || !imageFile.size) {
        return NextResponse.json({ error: "Image file is required" }, { status: 400 });
      }
      type = "image";
      id = "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
      const mime = (imageFile.type || "image/png").toLowerCase();
      const ext = MIME_EXT[mime] || "png";
      const dir = path.join(process.cwd(), "private", "uploads", "items");
      const filePath = path.join(dir, `${id}.${ext}`);
      await mkdir(dir, { recursive: true });
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);
      const st = await stat(filePath);
      if (!st.size) {
        return NextResponse.json({ error: "Image could not be saved to disk" }, { status: 500 });
      }
      contentToStore = `uploads/items/${id}.${ext}`;
      title = (formData.get("title") as string)?.trim() || undefined;
      caption = (formData.get("caption") as string)?.trim() || undefined;
      const tagsRaw = formData.get("tags");
      tags = tagsRaw ? (typeof tagsRaw === "string" ? JSON.parse(tagsRaw) : tagsRaw) : [];
      categoryId = (formData.get("categoryId") as string) || "cat-inbox";
      sourceHint = "camera";
      highlight = undefined;
    } else {
      const body = await request.json();
      const { type: t, content, title: tit, highlight: hl, caption: cap, tags: tg, categoryId: catId, source } = body as {
        type: ItemType;
        content: string;
        title?: string;
        highlight?: string;
        caption?: string;
        tags?: string[];
        categoryId?: string | null;
        source?: string;
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

      if (type === "image" && contentToStore.startsWith("data:image/")) {
        const parsed = parseImageDataUrl(id, contentToStore);
        if (parsed) {
          await mkdir(parsed.dir, { recursive: true });
          await writeFile(parsed.filePath, parsed.buffer);
          const st = await stat(parsed.filePath).catch(() => null);
          if (st && st.size > 0) {
            contentToStore = parsed.relativePath;
          }
        }
      }
    }

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
    });
    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }
}
