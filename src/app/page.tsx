import Link from "next/link";
import { getAllItems } from "@/lib/db";
import { ItemCard } from "@/components/ItemCard";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const items = getAllItems();

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-semibold">Library</h1>
        <Link
          href="/archive"
          className="text-sm font-medium text-[var(--accent)] hover:underline"
        >
          Archive
        </Link>
      </div>
      <p className="text-[var(--muted)]">
        All your saved links, highlights, images, and text. Search by tag or
        open a category to organize.
      </p>
      {items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No items yet. Use{" "}
          <Link href="/add" className="font-medium text-[var(--accent)] hover:underline">
            Add
          </Link>{" "}
          to paste or drop a link.
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <ItemCard item={item} showArchive showDelete />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
