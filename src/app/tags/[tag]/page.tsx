import Link from "next/link";
import { getItemsByTag } from "@/lib/db";
import { ItemCard } from "@/components/ItemCard";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: tagEncoded } = await params;
  const tag = decodeURIComponent(tagEncoded);
  const items = getItemsByTag(tag);

  if (items.length === 0 && tag.trim() === "") {
    notFound();
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/tags" className="hover:text-[var(--text)]">
          Tags
        </Link>
        <span>/</span>
        <span className="text-[var(--text)]">{tag}</span>
      </div>
      <h1 className="mb-2 text-2xl font-semibold">Tag: {tag}</h1>
      <p className="mb-4 text-[var(--muted)]">
        {items.length} {items.length === 1 ? "item" : "items"} with this tag.
      </p>
      {items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No items with this tag.{" "}
          <Link href="/add" className="font-medium text-[var(--accent)] hover:underline">
            Add
          </Link>{" "}
          a link and use the tag &quot;{tag}&quot; to see it here.
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
