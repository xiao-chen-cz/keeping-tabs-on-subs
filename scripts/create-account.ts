// Create an invite-only account with a seed set (fictional data).
//   pnpm create-account --email x@example.com --set starter|full [--today YYYY-MM-DD] [--out /local-data/accounts.jsonl]
// Prints the generated password once. Refuses if the user exists (use reset-account).
import { createAdminClient } from "../src/lib/supabase/admin";
import { findUserId, insertSeed, parseArgs, randomPassword, saveCredentials } from "./lib-seed-account";

async function main() {
  const { email, set, today, out } = parseArgs(
    process.argv.slice(2),
    "create-account --email x --set starter|full [--today YYYY-MM-DD] [--out path]",
  );
  const db = createAdminClient();
  if ((await findUserId(db, email)) !== null) {
    console.error(`User ${email} already exists. Use reset-account to reseed it.`);
    process.exit(1);
  }
  const password = randomPassword();
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("createUser returned no user");
  const userId = created.data.user.id;
  try {
    const profile = await db.from("profiles").insert({ user_id: userId });
    if (profile.error) throw profile.error;
    const n = await insertSeed(db, userId, set, today);
    console.log(`Created ${email} with the ${set} set (${n} subscriptions, today = ${today}).`);
  } catch (err) {
    await db.auth.admin.deleteUser(userId); // cascades to any rows already written
    throw err;
  }
  saveCredentials(out, { email, password, set });
  console.log(`Password (shown once): ${password}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
