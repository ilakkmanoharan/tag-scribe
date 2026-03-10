import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – Tag Scribe",
  description: "Tag Scribe privacy policy.",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <h1>Tag Scribe Privacy Policy</h1>
      <p><strong>Last updated:</strong> February 2025</p>

      <h2>Overview</h2>
      <p>
        Tag Scribe (&quot;we&quot;, &quot;our&quot;, or &quot;the app&quot;) helps you organize your personal library with tags and categories. This policy describes what data we collect and how we use it.
      </p>

      <h2>Data We Collect</h2>
      <ul>
        <li><strong>Account information:</strong> When you sign up, we store your email address and a secure account identifier (via Firebase Authentication).</li>
        <li><strong>Library data:</strong> Items you add (titles, tags, categories, links, notes, and any images you upload) are stored and associated with your account so you can access them across devices.</li>
        <li><strong>Usage:</strong> We may collect basic usage information (e.g. to fix errors or improve the service).</li>
      </ul>

      <h2>How We Use Your Data</h2>
      <ul>
        <li>To provide and maintain the app (sign-in, syncing your library, saving shared links).</li>
        <li>To improve the service and fix issues.</li>
        <li>We do not sell your personal data to third parties.</li>
      </ul>

      <h2>Data Storage and Security</h2>
      <p>
        Your data is stored using industry-standard providers (e.g. Firebase / Google Cloud). We use authentication and access controls to protect your account and data. You can sign out at any time from the app. Account and data deletion can be requested by contacting us (see below).
      </p>

      <h2>Third-Party Services</h2>
      <ul>
        <li><strong>Firebase (Google):</strong> We use Firebase for authentication and (optionally) cloud storage. Google&apos;s privacy policy applies: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">https://policies.google.com/privacy</a></li>
        <li><strong>Vercel:</strong> The web app and API are hosted on Vercel. See Vercel&apos;s privacy policy for their practices.</li>
      </ul>

      <h2>Your Rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal data by contacting us at the support URL below.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. The &quot;Last updated&quot; date at the top will change when we do. Continued use of the app after changes means you accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy-related questions or requests, contact us via our support page: <a href="https://tag-scribe.vercel.app">https://tag-scribe.vercel.app</a>
      </p>
    </article>
  );
}
