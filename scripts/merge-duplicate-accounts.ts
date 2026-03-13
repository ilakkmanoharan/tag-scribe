/**
 * One-off script: merge duplicate accounts (same email, different uids).
 * Groups users by normalized email, picks primary per group, merges others into it.
 * Usage: npx tsx scripts/merge-duplicate-accounts.ts [--execute]
 * Without --execute: dry run (log only). With --execute: perform merges.
 * Requires: FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS, NEXT_PUBLIC_FIREBASE_PROJECT_ID
 */

import {
  getAllUserDetailsForMerge,
  mergeUserDataInto,
  setMergedInto,
} from "../src/lib/firestore";

const EXECUTE = process.argv.includes("--execute");

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function main() {
  const users = await getAllUserDetailsForMerge();
  const primaryOnly = users.filter((u) => !u.merged);
  const byEmail = new Map<string, typeof primaryOnly>();
  for (const u of primaryOnly) {
    if (!u.email) continue;
    const key = normalizeEmail(u.email);
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key)!.push(u);
  }

  const toMerge: { email: string; primary: (typeof primaryOnly)[0]; secondaries: (typeof primaryOnly)[0][] }[] = [];
  for (const [email, list] of byEmail) {
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
    console.log(`  ${email}: primary=${primary.uid}, merge into it: ${secondaries.map((s) => s.uid).join(", ")}`);
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
      console.log(`  Done.`);
    }
  }
  console.log("Merge script finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
