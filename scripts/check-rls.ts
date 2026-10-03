// Row-level isolation check against the hosted project. Run after every migration:
//   pnpm check-rls            (reads .env.local; accounts from RLS_* env vars or --accounts <json>)
// Accounts JSON (keep it in /local-data/, gitignored):
//   {"a":{"email":"...","password":"..."},"b":{"email":"...","password":"..."}}
// Both accounts need at least one subscription and one category (a `starter` seed does).
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../src/lib/supabase/admin";
import type { Database } from "../src/lib/supabase/database.types";

type Db = SupabaseClient<Database>;
type Creds = { email: string; password: string };
const TABLES = ["profiles", "categories", "payment_methods", "subscriptions"] as const;

let failures = 0;
function report(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : detail ? `  (${detail})` : ""}`);
}

function loadAccounts(): { a: Creds; b: Creds } {
  const i = process.argv.indexOf("--accounts");
  if (i !== -1) {
    const path = process.argv[i + 1];
    if (!path) throw new Error("--accounts needs a path");
    return JSON.parse(readFileSync(path, "utf8"));
  }
  const e = process.env;
  const need = ["RLS_A_EMAIL", "RLS_A_PASSWORD", "RLS_B_EMAIL", "RLS_B_PASSWORD"];
  const missing = need.filter((k) => !e[k]);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(", ")} (or use --accounts)`);
  return {
    a: { email: e.RLS_A_EMAIL!, password: e.RLS_A_PASSWORD! },
    b: { email: e.RLS_B_EMAIL!, password: e.RLS_B_PASSWORD! },
  };
}

function publicClient(): Db {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function userIdOf(admin: Db, email: string): Promise<string> {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if (data.users.length < 200) break;
  }
  throw new Error(`No user with email ${email}`);
}

async function main() {
  const { a, b } = loadAccounts();
  const admin = createAdminClient();
  const bId = await userIdOf(admin, b.email);
  const aId = await userIdOf(admin, a.email);

  const { data: bSubs, error: bSubErr } = await admin.from("subscriptions").select("id").eq("user_id", bId).limit(1);
  const { data: bCats, error: bCatErr } = await admin.from("categories").select("id").eq("user_id", bId).limit(1);
  if (bSubErr || bCatErr || !bSubs?.length || !bCats?.length) {
    throw new Error("Account B needs at least one subscription and one category");
  }
  const bSubId = bSubs[0].id;
  const bCatId = bCats[0].id;

  const { data: aCats } = await admin.from("categories").select("id").eq("user_id", aId).limit(1);
  const aCatId = aCats?.[0]?.id ?? null;
  const { data: aSubs } = await admin.from("subscriptions").select("id").eq("user_id", aId).limit(1);
  const aSubId = aSubs?.[0]?.id ?? null;

  // Anything the checks create is removed in `finally` (admin bypasses RLS).
  const createdIds: string[] = [];

  try {
    const client = publicClient();
    const { error: signInErr } = await client.auth.signInWithPassword(a);
    if (signInErr) throw new Error(`Sign-in as A failed: ${signInErr.message}`);

    for (const t of TABLES) {
      const { data, error } = await client.from(t).select("*");
      const ownOnly = !error && !!data && data.every((r) => r.user_id === aId);
      report(`A sees only own rows in ${t}`, ownOnly, error?.message ?? "foreign rows returned");
    }

    {
      const { data, error } = await client.from("subscriptions").select("id").eq("id", bSubId);
      report("A cannot read B's subscription by id", !error && data?.length === 0, error?.message ?? `${data?.length} rows`);
    }
    {
      const { data, error } = await client.from("profiles").select("user_id").eq("user_id", bId);
      report("A cannot read B's profile", !error && data?.length === 0, error?.message ?? `${data?.length} rows`);
    }
    {
      const { data, error } = await client
        .from("subscriptions")
        .insert({ name: "rls-check", user_id: bId })
        .select("id");
      if (data?.length) createdIds.push(...data.map((r) => r.id));
      report("A cannot insert a subscription with user_id = B", !!error && !(data as unknown[] | null)?.length, "insert succeeded");
    }

    if (aSubId) {
      {
        const { data, error } = await client
          .from("subscriptions")
          .update({ user_id: bId })
          .eq("id", aSubId)
          .select("id");
        report("A cannot move own subscription to user_id = B", !!error || data?.length === 0, "update succeeded");
      }
      {
        const { data, error } = await client
          .from("subscriptions")
          .update({ category_id: bCatId })
          .eq("id", aSubId)
          .select("id");
        report("A cannot set own subscription's category_id to B's category", !!error || data?.length === 0, "update succeeded");
      }
    } else {
      report("A has a subscription for the update checks", false, "seed account A first");
    }
    {
      const { data, error } = await client
        .from("subscriptions")
        .insert({ name: "rls-check", category_id: bCatId })
        .select("id");
      if (data?.length) createdIds.push(...data.map((r) => r.id));
      report("A cannot insert a subscription with B's category_id", !!error && !(data as unknown[] | null)?.length, "insert succeeded");
    }
    {
      // Control: the same insert with A's own category must work, so the denials above are meaningful.
      if (aCatId) {
        const { data, error } = await client
          .from("subscriptions")
          .insert({ name: "rls-check-control", category_id: aCatId })
          .select("id");
        if (data?.length) createdIds.push(...data.map((r) => r.id));
        report("Control: A can insert with own category_id", !error && data?.length === 1, error?.message ?? "");
      }
    }

    const anon = publicClient();
    for (const t of TABLES) {
      const { data, error } = await anon.from(t).select("*");
      report(`anon gets no rows from ${t}`, !!error || (data?.length ?? 0) === 0, `${data?.length} rows`);
    }
  } finally {
    if (createdIds.length) await admin.from("subscriptions").delete().in("id", createdIds);
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
