import { NextResponse } from "next/server";
import { getUniqueTags } from "@/lib/db";

export async function GET() {
  try {
    const tags = getUniqueTags();
    return NextResponse.json(tags);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load tags" }, { status: 500 });
  }
}
