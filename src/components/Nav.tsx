import Link from "next/link";

const links = [
  { href: "/", label: "Library" },
  { href: "/archive", label: "Archive" },
  { href: "/categories", label: "Categories" },
  { href: "/tags", label: "Tags" },
  { href: "/add", label: "Add" },
];

export function Nav() {
  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center gap-6">
        <Link
          href="/"
          className="text-lg font-semibold text-[var(--accent)]"
        >
          Tag Scribe
        </Link>
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="text-sm text-[var(--muted)] hover:text-[var(--text)]"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
