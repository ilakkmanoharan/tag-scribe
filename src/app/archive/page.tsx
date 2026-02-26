import Link from "next/link";
import { getArchivedItems } from "@/lib/db";
import { ItemCard } from "@/components/ItemCard";

export const dynamic = "force-dynamic";

function formatArchiveDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export default async function ArchivePage() {
  const items = getArchivedItems();
  const byDate = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.archivedAt ? getDateKey(item.archivedAt) : "";
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-semibold">Archive</h1>
        <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--text)]">
          ← Library
        </Link>
      </div>
      <p className="text-[var(--muted)]">
        Archived items are hidden from the Library. They are grouped by the
        date they were archived. Unarchive to bring an item back to the
        Library.
      </p>
      {sortedDates.length === 0 ? (
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-[var(--muted)]">
          No archived items. Use <strong>Archive</strong> on any item in the
          Library or a category to move it here.
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {sortedDates.map((dateKey) => {
            const dayItems = byDate[dateKey];
            const label = dayItems?.[0]?.archivedAt
              ? formatArchiveDate(dayItems[0].archivedAt!)
              : dateKey;
            return (
              <section key={dateKey}>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
                  {label}
                </h2>
                <ul className="space-y-4">
                  {dayItems?.map((item) => (
                    <li key={item.id}>
                      <ItemCard
                        item={item}
                        showUnarchive
                        showDelete
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
