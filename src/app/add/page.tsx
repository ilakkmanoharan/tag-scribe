import { getAllCategories } from "@/lib/db";
import { AddForm } from "@/components/AddForm";

export const dynamic = "force-dynamic";

export default function AddPage() {
  const categories = getAllCategories();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Add</h1>
      <p className="text-[var(--muted)]">
        Paste or drop a link, a picture, or some text. All are optional—add at
        least one. Optional highlight, tags, and category (defaults to Inbox).
        Saved to your library.
      </p>
      <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <AddForm categories={categories} />
      </div>
    </div>
  );
}
