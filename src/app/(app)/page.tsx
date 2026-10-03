import { requireUser } from "@/lib/dal/auth";

export default async function Home() {
  const user = await requireUser();
  return <main className="flex flex-1 flex-col gap-2">
    <h1 className="text-2xl font-semibold tracking-tight">Your subscriptions</h1>
    <p className="text-zinc-600 dark:text-zinc-400">Signed in as {user.email ?? user.id}</p>
  </main>;
}
