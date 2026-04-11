import { NextResponse } from "next/server";
import * as firestore from "@/lib/firestore";
import { requireUidOrNull } from "@/lib/auth-server";
import type { SavedList } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const result = await requireUidOrNull(request);
    if ("status" in result && result.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const lists = result.uid
      ? await firestore.getAllLists(result.uid)
      : (await import("@/lib/db")).getAllLists();
    return NextResponse.json(lists);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load lists" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireUidOrNull(request);
    if ("status" in result && result.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { name, itemIds } = body as { name?: string; itemIds?: unknown };
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const ids = Array.isArray(itemIds)
      ? Array.from(new Set(itemIds.map((x) => String(x).trim()).filter(Boolean)))
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "itemIds must be a non-empty array" }, { status: 400 });
    }
    const id = "list-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    const payload: Omit<SavedList, "createdAt" | "updatedAt"> = {
      id,
      name: trimmed,
      itemIds: ids,
    };
    if (result.uid) {
      const list = await firestore.createList(result.uid, payload);
      return NextResponse.json(list);
    }
    const { createList } = await import("@/lib/db");
    const list = createList(payload);
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create list" }, { status: 500 });
  }
}
