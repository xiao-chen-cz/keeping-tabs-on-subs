// Reset an existing account to a seed set: deletes subscriptions, then lookups, then reseeds.
//   pnpm reset-account --email x@example.com --set starter|full [--today YYYY-MM-DD]
import { createAdminClient } from "../src/lib/supabase/admin";
import { findUserId, insertSeed, parseArgs } from "./lib-seed-account";

async function main() {
  const { email, set, today } = parseArgs(
    process.argv.slice(2),
    "reset-account --email x --set starter|full [--today YYYY-MM-DD]",
  );
  const db = createAdminClient();
  const userId = await findUserId(db, email);
  if (userId === null) {
    console.error(`No user ${email}. Use create-account first.`);
    process.exit(1);
  }
  for (const table of ["subscriptions", "categories", "payment_methods"] as const) {
    const res = await db.from(table).delete().eq("user_id", userId);
    if (res.error) throw res.error;
  }
  const profile = await db.from("profiles").upsert({ user_id: userId });
  if (profile.error) throw profile.error;
  const n = await insertSeed(db, userId, set, today);
  console.log(`Reset ${email} to the ${set} set (${n} subscriptions, today = ${today}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
