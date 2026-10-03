import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // /login is outside the proxy matcher, so a signed-in visitor is redirected here.
  if (await getUser()) redirect("/");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Keeping Tabs</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Private demo. Sign in to continue.</p>
      </div>
      <LoginForm />
    </main>
  );
}
