import Link from "next/link";
import { getUniqueTags } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function TagsPage() {
  const tags = getUniqueTags();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Tags</h1>
      <p className="text-[var(--muted)]">
        Search by tag across all links, images, and text. Click a tag to see
        everything saved with that tag.
      </p>
      {tags.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No tags yet. When you{" "}
          <Link href="/add" className="font-medium text-[var(--accent)] hover:underline">
            Add
          </Link>{" "}
          a link and add tags, they will show up here.
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--border)] hover:text-[var(--accent)]"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
