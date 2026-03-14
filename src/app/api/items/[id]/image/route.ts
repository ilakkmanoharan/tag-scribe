import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";
import * as firestore from "@/lib/firestore";
import { requireUidOrNull, getEffectiveUidFromRequest, isFirebaseAdminConfigured } from "@/lib/auth-server";
import { getItemImageSignedUrl, uploadItemImage } from "@/lib/storage-server";

export const dynamic = "force-dynamic";

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isFirebaseAdminConfigured()) {
      const uid = await getEffectiveUidFromRequest(request);
      if (!uid) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const item = await firestore.getItemById(uid, id);
      if (!item || item.type !== "image") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const content = item.content;
      if (content.startsWith("http")) {
        return NextResponse.json({ url: content });
      }
      if (content.startsWith("users/")) {
        const url = await getItemImageSignedUrl(content);
        if (url) return NextResponse.json({ url });
      }
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { getItemById } = await import("@/lib/db");
    const item = getItemById(id);
    if (!item || item.type !== "image") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const content = item.content;
    let buffer: Buffer;
    let mime: string;

    if (content.startsWith("uploads/") && !content.includes("..")) {
      const filePath = path.join(process.cwd(), "private", content);
      const ext = path.extname(filePath).slice(1).toLowerCase();
      mime = MIME_BY_EXT[ext] || "image/png";
      buffer = await readFile(filePath);
    } else if (content.startsWith("data:image/")) {
      const match = content.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
      if (!match) return NextResponse.json({ error: "Invalid image" }, { status: 400 });
      mime = match[1].toLowerCase();
      const base64 = match[2];
      buffer = Buffer.from(base64, "base64");
      if (buffer.length === 0) return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    } else {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

/** Replace item image. Accepts multipart/form-data with "image" file. Item must be type "image". */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireUidOrNull(request);
    if ("status" in result && result.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "multipart/form-data with image file required" }, { status: 400 });
    }
    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    if (!imageFile || !imageFile.size || !imageFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }
    const mime = imageFile.type.toLowerCase();
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (result.uid) {
      const item = await firestore.getItemById(result.uid, id);
      if (!item || item.type !== "image") {
        return NextResponse.json({ error: "Item not found or not an image" }, { status: 404 });
      }
      try {
        const contentToStore = await uploadItemImage(result.uid, id, buffer, mime);
        const updated = await firestore.updateItem(result.uid, id, { content: contentToStore });
        if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
        return NextResponse.json(updated);
      } catch (uploadErr) {
        console.error("Image replace upload failed:", uploadErr);
        return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
      }
    }

    const { getItemById, updateItem } = await import("@/lib/db");
    const item = getItemById(id);
    if (!item || item.type !== "image") {
      return NextResponse.json({ error: "Item not found or not an image" }, { status: 404 });
    }
    const ext = MIME_EXT[mime] || "png";
    const dir = path.join(process.cwd(), "private", "uploads", "items");
    const filePath = path.join(dir, `${id}.${ext}`);
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, buffer);
    const st = await stat(filePath);
    if (!st.size) {
      return NextResponse.json({ error: "Image could not be saved" }, { status: 500 });
    }
    const contentToStore = `uploads/items/${id}.${ext}`;
    const updated = updateItem(id, { content: contentToStore });
    if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to replace image" }, { status: 500 });
  }
}
