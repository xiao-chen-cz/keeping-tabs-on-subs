import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // /login is outside the proxy matcher, so a signed-in visitor is redirected here.
  if (await getUser()) redirect("/");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-primary-ink">Keeping Tabs on Subs</h1>
        <p className="text-mid">Private demo. Sign in to continue.</p>
      </div>
      <LoginForm />
      <p className="border-t border-line pt-4 text-sm text-mid">
        No account?{" "}
        <Link href="/demo" className="link">
          Look around the demo with sample data
        </Link>
        , no sign-in needed.
      </p>
    </main>
  );
}
