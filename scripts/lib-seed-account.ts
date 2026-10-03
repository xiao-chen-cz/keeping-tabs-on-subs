// Shared helpers for create-account.ts and reset-account.ts. Local scripts only (secret key).
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlainDate, todayIn } from "../src/lib/dates/plain-date";
import { buildSeed, SEED_CATEGORIES, SEED_PAYMENT_METHODS, type SeedSet } from "../src/lib/seed/build-seed";
import { seedRowToInsert } from "../src/lib/seed/to-db";
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

/** Inserts lookups and seed rows for a user. Assumes the user has no lookups or subscriptions. */
export async function insertSeed(db: Db, userId: string, set: SeedSet, today: string): Promise<number> {
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
  const rows = buildSeed(set, today).map((r) => seedRowToInsert(r, userId, catIds, pmIds));
  const subs = await db.from("subscriptions").insert(rows);
  if (subs.error) throw subs.error;
  return rows.length;
}

export function saveCredentials(out: string | null, entry: { email: string; password: string; set: SeedSet }) {
  if (out) appendFileSync(out, `${JSON.stringify(entry)}\n`, { mode: 0o600 });
}
