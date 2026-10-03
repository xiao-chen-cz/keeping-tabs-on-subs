// Combines the rules into every computed field. Pure; today is injected.
import { compare, diffDays } from "@/lib/dates/plain-date";
import { isArchived, isEnding, isTrial, needsUpdate } from "./flags";
import { cancelBy, effectiveNotice } from "./notice";
import { priceRises, renewalAmountCents } from "./pricing";
import { isActiveTrial, nextRenewal } from "./schedule";
import type { ComputedSubscription, PlainDate, SubscriptionCore } from "./types";

export function computeSubscription<T extends SubscriptionCore>(
  input: T,
  today: PlainDate,
): ComputedSubscription<T> {
  const next = nextRenewal(input, today);
  const noticeDays = effectiveNotice(input);
  const by = cancelBy(next, noticeDays);
  const renewal = renewalAmountCents(input, next);
  return {
    input,
    computed: {
      nextRenewal: next,
      daysUntilRenewal: next === null ? null : diffDays(next, today),
      noticeDays,
      noticeIsDefault: input.cancelNoticeDays === null,
      cancelBy: by,
      daysUntilCancelBy: by === null ? null : diffDays(by, today),
      renewalAmountCents: renewal,
      priceRises: priceRises(input.amountCents, renewal),
      // D4: a future anchor is the first charge of a new plan
      planStartsLater:
        input.status === "confirmed" &&
        input.lastRenewalDate !== null &&
        compare(input.lastRenewalDate, today) > 0 &&
        !isActiveTrial(input, today),
      tags: {
        trial: isTrial(input, today),
        needsUpdate: needsUpdate(input, next),
        ending: isEnding(input, today),
      },
      archived: isArchived(input, today),
    },
  };
}
