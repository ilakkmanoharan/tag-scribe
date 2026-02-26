import { getAllCategories, getAllItems } from "@/lib/db";
import { CategoryRow } from "@/components/CategoryRow";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function CategoriesPage() {
  const categories = getAllCategories();
  const items = getAllItems();
  const itemCountByCategory = items.reduce<Record<string, number>>(
    (acc, item) => {
      const id = item.categoryId ?? "_none";
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Categories</h1>
      <p className="text-[var(--muted)]">
        Create folders like &quot;Leaves&quot;, &quot;To process&quot;, or
        &quot;Book highlights&quot;. Drop links, images, and text into them,
        then open a category to reorganize.
      </p>
      {categories.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No categories yet. Create one when you{" "}
          <Link href="/add" className="font-medium text-[var(--accent)] hover:underline">
            Add
          </Link>{" "}
          a link and choose &quot;+ Add new category&quot;.
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {categories.map((cat) => (
            <CategoryRow
              key={cat.id}
              id={cat.id}
              name={cat.name}
              count={itemCountByCategory[cat.id] ?? 0}
              isInbox={cat.id === "cat-inbox"}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
