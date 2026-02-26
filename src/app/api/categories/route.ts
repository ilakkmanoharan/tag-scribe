import { NextResponse } from "next/server";
import { getAllCategories, createCategory } from "@/lib/db";

export async function GET() {
  try {
    const categories = getAllCategories();
    return NextResponse.json(categories);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body as { name?: string };
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const id = "cat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
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
