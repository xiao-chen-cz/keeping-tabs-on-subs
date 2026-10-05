"use server";
import { notFound, redirect } from "next/navigation";
import { keepRenewal, setAlertMode } from "@/lib/dal/alerts";
import { requireUser } from "@/lib/dal/auth";
import { getProfile } from "@/lib/dal/profile";
import { getSubscription } from "@/lib/dal/subscriptions";
import { isPlainDate, todayIn } from "@/lib/dates/plain-date";
import { checkKeep } from "@/lib/domain/alerts";
import { computeSubscription } from "@/lib/domain/compute";

/**
 * Bind id and cancel-by first. Keep (D10) for this renewal only. A stale cancel-by (old email, plan
 * changed) is refused and lands on the alert page, which explains it (E47).
 */
export async function keepRenewalAction(id: string, cancelBy: string): Promise<void> {
  await requireUser();
  if (!isPlainDate(cancelBy)) notFound();
  const [profile, subscription] = await Promise.all([getProfile(), getSubscription(id)]);
  if (!subscription) notFound();
  const row = computeSubscription(subscription, todayIn(profile.timeZone, new Date()));
  if (checkKeep(row, cancelBy) !== "ok") redirect(`/alerts/${id}?cb=${cancelBy}&do=keep`);
  await keepRenewal(id, cancelBy);
  redirect(`/?kept=${id}`);
}

/** Bind id and the answer first. Answer to "Stop reminding you about …?" (E44); asked once either way. */
export async function answerQuietOfferAction(id: string, accept: boolean): Promise<void> {
  await requireUser();
  await setAlertMode(id, accept ? "quiet" : "remind", { offerAnswered: true });
  redirect(accept ? `/?quiet=${id}` : "/");
}
