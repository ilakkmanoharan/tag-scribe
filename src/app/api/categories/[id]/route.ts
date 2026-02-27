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
    const { name, description } = body as { name?: string; description?: string };
    if (result.uid) {
      const updated = await firestore.updateCategory(result.uid, id, { name, description });
      if (!updated) return NextResponse.json({ error: "Category not found" }, { status: 404 });
      return NextResponse.json(updated);
    }
    const { updateCategory } = await import("@/lib/db");
    const updated = updateCategory(id, { name, description });
    if (!updated) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
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
      const deleted = await firestore.deleteCategory(result.uid, id);
      if (!deleted) return NextResponse.json({ error: "Cannot delete Inbox" }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    const { getCategoryById, deleteCategory } = await import("@/lib/db");
    const category = getCategoryById(id);
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    const deleted = deleteCategory(id);
    if (!deleted) return NextResponse.json({ error: "Cannot delete Inbox" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
