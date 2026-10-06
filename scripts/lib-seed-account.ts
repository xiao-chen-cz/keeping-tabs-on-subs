// Shared helpers for create-account.ts and reset-account.ts. Local scripts only (secret key).
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlainDate, todayIn } from "../src/lib/dates/plain-date";
import { buildSeed, SEED_CATEGORIES, SEED_PAYMENT_METHODS, type SeedSet } from "../src/lib/seed/build-seed";
import { buildSeedProposals } from "../src/lib/seed/proposals";
import { seedCaptureToInsert, seedProposalToInsert, seedRowToInsert } from "../src/lib/seed/to-db";
import type { Database } from "../src/lib/supabase/database.types";

export type Db = SupabaseClient<Database>;

export type Args = { email: string; set: SeedSet; today: string; out: string | null };

export function parseArgs(argv: string[], usage: string): Args {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : (argv[i + 1] ?? null);
  };
  const email = get("--email");
  const set = get("--set");
  const today = get("--today") ?? todayIn("Europe/Berlin", new Date());
  if (!email || (set !== "starter" && set !== "full") || !isPlainDate(today)) {
    console.error(`Usage: ${usage}`);
    process.exit(1);
  }
  return { email: email.trim().toLowerCase(), set, today, out: get("--out") };
}

export function randomPassword(): string {
  return randomBytes(18).toString("base64url"); // 24 chars
}

export async function findUserId(db: Db, email: string): Promise<string | null> {
  for (let page = 1; page < 100; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

export type SeedCounts = { subscriptions: number; proposals: number };

/** Deletes a user's capture files, then rows in dependency order (events, proposals, captures, subscriptions, lookups). */
export async function clearUserData(db: Db, userId: string): Promise<void> {
  for (;;) {
    const files = await db.storage.from("captures").list(userId, { limit: 100 });
    if (files.error) throw files.error;
    if (files.data.length === 0) break;
    const removed = await db.storage.from("captures").remove(files.data.map((f) => `${userId}/${f.name}`));
    if (removed.error) throw removed.error;
  }
  for (const table of [
    "subscription_events",
    "proposals",
    "captures",
    "subscriptions",
    "categories",
    "payment_methods",
  ] as const) {
    const res = await db.from(table).delete().eq("user_id", userId);
    if (res.error) throw res.error;
  }
}

/** Inserts lookups, seed rows, captures and proposals for a user. Assumes the user has no data. */
export async function insertSeed(db: Db, userId: string, set: SeedSet, today: string): Promise<SeedCounts> {
  const cats = await db
    .from("categories")
    .insert(SEED_CATEGORIES.map((name) => ({ user_id: userId, name })))
    .select("id, name");
  if (cats.error) throw cats.error;
  const pms = await db
    .from("payment_methods")
    .insert(SEED_PAYMENT_METHODS.map((name) => ({ user_id: userId, name })))
    .select("id, name");
  if (pms.error) throw pms.error;
  const catIds = new Map(cats.data.map((c) => [c.name, c.id]));
  const pmIds = new Map(pms.data.map((p) => [p.name, p.id]));
  const seedRows = buildSeed(set, today);
  const rows = seedRows.map((r) => seedRowToInsert(r, userId, catIds, pmIds));
  const subs = await db.from("subscriptions").insert(rows).select("id, name");
  if (subs.error) throw subs.error;
  const subIdByName = new Map(subs.data.map((s) => [s.name, s.id]));

  const proposals = buildSeedProposals(set, today);
  for (const p of proposals) {
    const cap = await db
      .from("captures")
      .insert(seedCaptureToInsert(p.capture, p.captureDate, userId))
      .select("id")
      .single();
    if (cap.error) throw cap.error;
    let updatesId: string | null = null;
    if (p.updatesSeedKey !== null) {
      const target = seedRows.find((r) => r.key === p.updatesSeedKey);
      updatesId = (target && subIdByName.get(target.name)) ?? null;
      if (updatesId === null) throw new Error(`Proposal ${p.key} updates seed #${p.updatesSeedKey}, which is not in this set`);
    }
    const ins = await db
      .from("proposals")
      .insert(seedProposalToInsert(p, userId, cap.data.id, updatesId, catIds, pmIds));
    if (ins.error) throw ins.error;
  }
  return { subscriptions: rows.length, proposals: proposals.length };
}

export function saveCredentials(out: string | null, entry: { email: string; password: string; set: SeedSet }) {
  if (out) appendFileSync(out, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
}
