import Link from "next/link";
import { SettingsForm } from "@/components/settings-form";
import { AppTour } from "@/components/tour";
import { requireUser } from "@/lib/dal/auth";
import { getProfile } from "@/lib/dal/profile";
import { markTourDoneAction } from "../tour-actions";
import { saveSettingsAction } from "./actions";

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const user = await requireUser();
  const [profile, { saved, tour }] = await Promise.all([getProfile(), searchParams]);
  return (
    <main className="flex flex-1 flex-col gap-3">
      {/* The tour's Settings stops (?tour=<stop>), reached from the list. */}
      {typeof tour === "string" && <AppTour start={tour} markSeen={markTourDoneAction} />}
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
      <p className="border-t border-line pt-4 text-sm">
        <Link href="/?tour=1" className="link inline-flex min-h-10 items-center">
          Replay the tour
        </Link>
      </p>
    </main>
  );
}
