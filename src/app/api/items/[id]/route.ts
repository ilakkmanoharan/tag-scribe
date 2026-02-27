import { NextResponse } from "next/server";
import * as firestore from "@/lib/firestore";
import { requireUidOrNull } from "@/lib/auth-server";

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
    const { archived, categoryId, tags } = body as { archived?: boolean; categoryId?: string; tags?: string[] };
    if (result.uid) {
      if (typeof categoryId === "string" && categoryId.trim()) {
        const item = await firestore.updateItemCategory(result.uid, id, categoryId.trim());
        if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
        return NextResponse.json(item);
      }
      if (Array.isArray(tags)) {
        const item = await firestore.updateItemTags(result.uid, id, tags);
        if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
        return NextResponse.json(item);
      }
      if (typeof archived === "boolean") {
        const item = await firestore.setItemArchived(result.uid, id, archived);
        if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
        return NextResponse.json(item);
      }
      return NextResponse.json({ error: "Provide archived (boolean), categoryId (string), or tags (string[])" }, { status: 400 });
    }
    const { setItemArchived, updateItemCategory, updateItemTags } = await import("@/lib/db");
    if (typeof categoryId === "string" && categoryId.trim()) {
      const item = updateItemCategory(id, categoryId.trim());
      if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      return NextResponse.json(item);
    }
    if (Array.isArray(tags)) {
      const item = updateItemTags(id, tags);
      if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      return NextResponse.json(item);
    }
    if (typeof archived === "boolean") {
      const item = setItemArchived(id, archived);
      if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      return NextResponse.json(item);
    }
    return NextResponse.json({ error: "Provide archived (boolean), categoryId (string), or tags (string[])" }, { status: 400 });
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
