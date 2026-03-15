/**
 * One-off script: merge duplicate accounts (same email, different uids).
 * Uses Firebase Auth as source of truth (listUsers), groups by normalized email,
 * picks primary per group, merges Firestore data and marks secondaries as merged.
 * Usage: npx tsx scripts/merge-duplicate-accounts.ts [--execute]
 * Without --execute: dry run (log only). With --execute: perform merges.
 * Requires: .env.local (or env) with FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS, NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */

import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

import { getAdminAuth } from "../src/lib/firebase-admin";
import {
  mergeUserDataInto,
  setMergedInto,
  updateAppleSubMappingsToPrimary,
} from "../src/lib/firestore";

const EXECUTE = process.argv.includes("--execute");

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

type AuthUser = { uid: string; email: string; providers: string[] };

function getProviders(providerData: { providerId?: string }[]): string[] {
  const set = new Set<string>();
  for (const p of providerData ?? []) {
    const id = p.providerId ?? "";
    if (id === "password") set.add("email");
    else if (id === "apple.com") set.add("apple");
    else if (id) set.add(id);
  }
  return Array.from(set);
}

async function listAllAuthUsers(): Promise<AuthUser[]> {
  const auth = getAdminAuth();
  if (!auth) throw new Error("Firebase Admin Auth not configured");

  const result: AuthUser[] = [];
  let pageToken: string | undefined;
  do {
    const list = await auth.listUsers(1000, pageToken);
    for (const user of list.users) {
      const email = (user.email ?? "").trim();
      if (!email) continue;
      result.push({
        uid: user.uid,
        email,
        providers: getProviders(user.providerData ?? []),
      });
    }
    pageToken = list.pageToken;
  } while (pageToken);

  return result;
}

async function main() {
  const users = await listAllAuthUsers();
  const byEmail = new Map<string, AuthUser[]>();
  for (const u of users) {
    const key = normalizeEmail(u.email);
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(u);
  }

  const toMerge: { email: string; primary: AuthUser; secondaries: AuthUser[] }[] = [];
  for (const [email, list] of Array.from(byEmail)) {
    if (list.length <= 1) continue;
    const withEmail = list.filter((u) => u.providers.includes("email"));
    const primary = withEmail[0] ?? list[0];
    const secondaries = list.filter((u) => u.uid !== primary.uid);
    toMerge.push({ email, primary, secondaries });
  }

  if (toMerge.length === 0) {
    console.log("No duplicate accounts (same email) found.");
    return;
  }

  console.log(`Found ${toMerge.length} email(s) with multiple accounts.`);
  for (const { email, primary, secondaries } of toMerge) {
    console.log(
      `  ${email}: primary=${primary.uid} (${primary.providers.join(",")}), merge into it: ${secondaries.map((s) => s.uid).join(", ")}`
    );
  }

  if (!EXECUTE) {
    console.log("\nDry run. Run with --execute to perform merges.");
    return;
  }

  for (const { email, primary, secondaries } of toMerge) {
    for (const sec of secondaries) {
      console.log(`Merging ${sec.uid} into ${primary.uid} (${email})...`);
      await mergeUserDataInto(sec.uid, primary.uid);
      await setMergedInto(sec.uid, primary.uid, email);
      await updateAppleSubMappingsToPrimary(sec.uid, primary.uid);
      console.log(`  Done.`);
    }
  }
  console.log("Merge script finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
