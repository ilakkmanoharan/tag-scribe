import { NextResponse } from "next/server";
import { getAllItems, createItem } from "@/lib/db";
import type { ItemType, SourceHint } from "@/types";

const VALID_SOURCES: SourceHint[] = ["web", "book", "camera", "manual", "social"];

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
    const body = await request.json();
    const { type, content, title, highlight, caption, tags, categoryId, source } = body as {
      type: ItemType;
      content: string;
      title?: string;
      highlight?: string;
      caption?: string;
      tags?: string[];
      categoryId?: string | null;
      source?: string;
    };
    const sourceHint: SourceHint | undefined =
      source && VALID_SOURCES.includes(source as SourceHint) ? (source as SourceHint) : undefined;
    if (!type || !content || typeof content !== "string") {
      return NextResponse.json({ error: "type and content are required" }, { status: 400 });
    }
    const validTypes: ItemType[] = ["link", "image", "text"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    const id = "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    const item = createItem({
      id,
      type,
      content: content.trim(),
      title: title?.trim() || undefined,
      highlight: highlight?.trim() || undefined,
      caption: caption?.trim() || undefined,
      tags: Array.isArray(tags) ? tags.map((t: string) => String(t).trim()).filter(Boolean) : [],
      categoryId: categoryId ?? null,
      source: sourceHint,
    });
    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save item" }, { status: 500 });
  }
}
