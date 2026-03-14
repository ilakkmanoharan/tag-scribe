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
      <h1>Support</h1>
      <p>
        Get help with Tag Scribe. This page is public — no sign-in required.
      </p>

      <h2>FAQs</h2>
      <ul>
        <li><strong>How do I save a link?</strong> Use the Share extension on iOS (Share → Tag Scribe) or add links in the app under Add. On the web, use the Add page.</li>
        <li><strong>I forgot my password.</strong> On the app, tap &quot;Forgot password?&quot; on the sign-in screen and enter your email to receive a reset link.</li>
        <li><strong>How do I delete my account?</strong> Sign in on the web or in the app, go to Settings, and use the account deletion option.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        For other questions or issues, email us at{" "}
        <a href="mailto:support@tagnscribe.com">support@tagnscribe.com</a>.
      </p>

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
