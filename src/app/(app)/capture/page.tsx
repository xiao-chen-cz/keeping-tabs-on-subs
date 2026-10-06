import Link from "next/link";
import { CaptureForm } from "@/components/capture-form";
import { requireUser } from "@/lib/dal/auth";
import { captureAction } from "./actions";

// The extraction call takes about 3-15 s; leave room for a slow PDF (plan d16-20 step 3).
export const maxDuration = 60;

export default async function CapturePage() {
  const user = await requireUser();
  return (
    <main className="flex flex-1 flex-col gap-3">
      <h1 className="font-heading text-2xl font-semibold text-primary-ink">Add a subscription</h1>
      <CaptureForm action={captureAction} userId={user.id} />
      <p className="text-sm text-mid">
        Prefer a form?{" "}
        <Link href="/subscriptions/new" className="link">
          Enter it yourself
        </Link>
      </p>
    </main>
  );
}
