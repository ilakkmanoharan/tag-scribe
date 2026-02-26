import Link from "next/link";
import { getCategoryById, getItemsByCategoryId } from "@/lib/db";
import { notFound } from "next/navigation";
import { ItemCard } from "@/components/ItemCard";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = getCategoryById(id);
  if (!category) notFound();
  const items = getItemsByCategoryId(id);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/categories" className="hover:text-[var(--text)]">
          Categories
        </Link>
        <span>/</span>
        <span className="text-[var(--text)]">{category.name}</span>
      </div>
      <h1 className="mb-2 text-2xl font-semibold">{category.name}</h1>
      {category.description && (
        <p className="mb-4 text-[var(--muted)]">{category.description}</p>
      )}
      {items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No items in this category.{" "}
          <Link href="/add" className="font-medium text-[var(--accent)] hover:underline">
            Add
          </Link>{" "}
          a link and choose this category.
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
