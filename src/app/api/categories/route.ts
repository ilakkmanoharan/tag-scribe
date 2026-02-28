import { NextResponse } from "next/server";
import * as firestore from "@/lib/firestore";
import { requireUidOrNull } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const result = await requireUidOrNull(request);
    if ("status" in result && result.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const categories = result.uid
      ? await firestore.getAllCategories(result.uid)
      : (await import("@/lib/db")).getAllCategories();
    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const result = await requireUidOrNull(request);
    if ("status" in result && result.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { name } = body as { name?: string };
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const id = "cat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    if (result.uid) {
      const category = await firestore.createCategory(result.uid, {
        id,
        name: trimmed,
        description: undefined,
        parentId: null,
        order: 999,
      });
      return NextResponse.json(category);
    }
    const { createCategory } = await import("@/lib/db");
    const category = createCategory({
      id,
      name: trimmed,
      description: undefined,
      parentId: null,
      order: 999,
    });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
