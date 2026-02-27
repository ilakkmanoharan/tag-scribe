import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import * as firestore from "@/lib/firestore";
import { getUidFromRequest, isFirebaseAdminConfigured } from "@/lib/auth-server";

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
      const uid = await getUidFromRequest(request);
      if (!uid) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const item = await firestore.getItemById(uid, id);
      if (!item || item.type !== "image") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const content = item.content;
      if (content.startsWith("http")) {
        return NextResponse.redirect(content);
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
