// Reset an existing account to a seed set: deletes events, proposals, captures, subscriptions, then lookups, and reseeds.
//   pnpm reset-account --email x@example.com --set starter|full [--today YYYY-MM-DD]
import { createAdminClient } from "../src/lib/supabase/admin";
import { clearUserData, findUserId, insertSeed, parseArgs } from "./lib-seed-account";

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
  await clearUserData(db, userId);
  const profile = await db.from("profiles").upsert({ user_id: userId });
  if (profile.error) throw profile.error;
  const counts = await insertSeed(db, userId, set, today);
  console.log(`Reset ${email} to the ${set} set (${counts.subscriptions} subscriptions, ${counts.proposals} proposals, today = ${today}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
