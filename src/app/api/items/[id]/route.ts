import { NextResponse } from "next/server";
import * as firestore from "@/lib/firestore";
import { requireUidOrNull } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireUidOrNull(request);
    if ("status" in result && result.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const {
      archived,
      categoryId,
      tags,
      title,
      content,
      highlight,
      caption,
      imageUrls,
    } = body as {
      archived?: boolean;
      categoryId?: string;
      tags?: string[];
      title?: string;
      content?: string;
      highlight?: string;
      caption?: string;
      imageUrls?: string[];
    };
    const updateFields: firestore.ItemUpdateFields = {};
    if (typeof archived === "boolean") updateFields.archived = archived;
    if (typeof categoryId === "string") updateFields.categoryId = categoryId.trim() || null;
    if (Array.isArray(tags)) updateFields.tags = tags;
    if (title !== undefined) updateFields.title = typeof title === "string" ? title : undefined;
    if (content !== undefined) updateFields.content = typeof content === "string" ? content : "";
    if (highlight !== undefined) updateFields.highlight = typeof highlight === "string" ? highlight : undefined;
    if (caption !== undefined) updateFields.caption = typeof caption === "string" ? caption : undefined;
    if (Array.isArray(imageUrls)) updateFields.imageUrls = imageUrls;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { error: "Provide at least one of: archived, categoryId, tags, title, content, highlight, caption, imageUrls" },
        { status: 400 }
      );
    }

    if (result.uid) {
      const item = await firestore.updateItem(result.uid, id, updateFields);
      if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      return NextResponse.json(item);
    }
    const { updateItem } = await import("@/lib/db");
    const item = updateItem(id, updateFields);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await requireUidOrNull(request);
    if ("status" in result && result.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (result.uid) {
      const deleted = await firestore.deleteItem(result.uid, id);
      if (!deleted) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    const { deleteItem } = await import("@/lib/db");
    const deleted = deleteItem(id);
    if (!deleted) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
