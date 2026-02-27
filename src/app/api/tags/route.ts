import { NextResponse } from "next/server";
import * as firestore from "@/lib/firestore";
import { requireUidOrNull } from "@/lib/auth-server";

export async function GET(request: Request) {
  try {
    const result = await requireUidOrNull(request);
    if ("status" in result && result.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tags = result.uid
      ? await firestore.getUniqueTags(result.uid)
      : (await import("@/lib/db")).getUniqueTags();
    return NextResponse.json(tags);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load tags" }, { status: 500 });
  }
}
