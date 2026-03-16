import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support – Tag Scribe",
  description: "Tag Scribe support and help.",
};

export const dynamic = "force-static";

export default function SupportPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <h1>TagScribe Support</h1>
      <p>
        TagScribe lets you save and organize links, highlights, notes, and references using tags and categories.
      </p>

      <h2>Help</h2>

      <h3>Saving content</h3>
      <p>Use the Share Extension from Safari or other apps to save links to TagScribe.</p>

      <h3>Edit or delete items</h3>
      <p>Open the saved item → tap <strong>Edit</strong> to update tags or notes → tap <strong>Delete</strong> to remove it.</p>

      <h3>Login issues</h3>
      <p>Sign in using the method you registered with (Email or Sign in with Apple). If both use the same email, either method should work.</p>

      <h3>Privacy</h3>
      <p>Your saved content is private and visible only to your account.</p>

      <h2>Contact Support</h2>
      <p>
        Email: <a href="mailto:ilakkmanoharan@gmail.com">ilakkmanoharan@gmail.com</a>
      </p>
      <p>When reporting an issue, please include:</p>
      <ul>
        <li>Device model</li>
        <li>iOS version</li>
        <li>Steps to reproduce the issue</li>
      </ul>
      <p>Response time is typically <strong>24–48 hours</strong>.</p>

      <p className="text-[var(--muted)]">
        <Link href="/">Tag Scribe</Link>
        {" · "}
        <Link href="/privacy">Privacy Policy</Link>
        {" · "}
        <Link href="/signin">Sign in</Link>
      </p>
    </article>
  );
}
