import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About – Tag Scribe",
  description: "About Tag Scribe.",
};

export const dynamic = "force-static";

export default function AboutPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <h1>About Tag Scribe</h1>
      <p>
        Tag Scribe is a minimal tool for capturing and organizing what matters — links, highlights, notes, and ideas — in one place.
      </p>
      <p>
        No sign-in required to view this page.
      </p>
      <h2>Quick links</h2>
      <ul>
        <li><Link href="/support">Support</Link> — FAQs and contact</li>
        <li><Link href="/privacy">Privacy Policy</Link></li>
        <li><Link href="/signin">Sign in</Link></li>
      </ul>
    </article>
  );
}
