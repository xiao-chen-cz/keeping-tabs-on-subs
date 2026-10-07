import Link from "next/link";
import { SettingsForm } from "@/components/settings-form";
import { requireUser } from "@/lib/dal/auth";
import { signOut } from "@/lib/dal/auth-actions";
import { getProfile } from "@/lib/dal/profile";
import { saveSettingsAction } from "./actions";

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const user = await requireUser();
  const [profile, { saved }] = await Promise.all([getProfile(), searchParams]);
  return (
    <main className="flex flex-1 flex-col gap-3">
      <Link href="/" className="link inline-flex min-h-10 items-center text-sm">
        Back to list
      </Link>
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">Settings</h1>
      <SettingsForm
        action={saveSettingsAction}
        alertChannel={profile.alertChannel}
        reminderOffsets={profile.reminderOffsets}
        email={user.email}
        saved={saved === "1"}
      />
      <form action={signOut} className="mt-6 border-t border-line pt-4">
        <button type="submit" className="btn-secondary">
          Sign out
        </button>
      </form>
    </main>
  );
}
