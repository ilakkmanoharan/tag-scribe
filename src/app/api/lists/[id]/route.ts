import { NextResponse } from "next/server";
import * as firestore from "@/lib/firestore";
import { requireUidOrNull } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

const VALID_PRIORITY = new Set(["low", "medium", "high"]);

function normalizePatch(body: Record<string, unknown>): {
  name?: string;
  dueDate?: string | null;
  priority?: string | null;
} | { error: string } {
  const out: { name?: string; dueDate?: string | null; priority?: string | null } = {};
  if ("name" in body) {
    if (typeof body.name !== "string") return { error: "name must be a string" };
    const trimmed = body.name.trim();
    if (!trimmed) return { error: "name cannot be empty" };
    out.name = trimmed;
  }
  if ("dueDate" in body) {
    const v = body.dueDate;
    if (v === null || v === "") {
      out.dueDate = null;
    } else if (typeof v === "string") {
      const t = v.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return { error: "dueDate must be YYYY-MM-DD or null" };
      out.dueDate = t;
    } else {
      return { error: "dueDate must be a string, null, or empty" };
    }
  }
  if ("priority" in body) {
    const v = body.priority;
    if (v === null || v === "") {
      out.priority = null;
    } else if (typeof v === "string") {
      const p = v.trim().toLowerCase();
      if (!VALID_PRIORITY.has(p)) return { error: "priority must be low, medium, high, or null" };
      out.priority = p;
    } else {
      return { error: "priority must be a string, null, or empty" };
    }
  }
  if (out.name === undefined && out.dueDate === undefined && out.priority === undefined) {
    return { error: "Provide at least one of: name, dueDate, priority" };
  }
  return out;
}

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
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch = normalizePatch(body);
    if ("error" in patch) {
      return NextResponse.json({ error: patch.error }, { status: 400 });
    }
    if (result.uid) {
      const updated = await firestore.updateList(result.uid, id, patch);
      if (!updated) return NextResponse.json({ error: "List not found" }, { status: 404 });
      return NextResponse.json(updated);
    }
    const { updateList } = await import("@/lib/db");
    const updated = updateList(id, patch);
    if (!updated) return NextResponse.json({ error: "List not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update list" }, { status: 500 });
  }
}
