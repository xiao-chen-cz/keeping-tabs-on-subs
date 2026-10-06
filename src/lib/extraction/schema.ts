// What the model returns for one capture (structured output). Every field is nullable: the model
// returns null for anything the capture does not state (logic-spec §4 rule 7). Code checks every value
// again in to-draft.ts; this schema only shapes the answer.
import { z } from "zod";
import { BILLING_CYCLES, CONFIDENCES, CURRENCIES, SCOPES } from "@/lib/domain/types";

const text = z.string().nullable();
const confidence = z.enum(CONFIDENCES).nullable();

export const extractionSchema = z.object({
  /** False when the capture is not about a recurring charge at all. */
  is_subscription: z.boolean(),
  name: text,
  vendor: text,
  plan: text,
  /** Login email or username shown for the account. Never a password or a card or bank number. */
  account_label: text,
  /** Decimal string as printed, e.g. "12.00". */
  amount: text,
  currency: z.enum(CURRENCIES).nullable(),
  billing_cycle: z.enum(BILLING_CYCLES).nullable(),
  /** YYYY-MM-DD of a charge that already happened (a receipt's charge date). */
  last_charge_date: text,
  /** YYYY-MM-DD of the next charge, when stated. */
  next_charge_date: text,
  trial_ends: text,
  regular_price: text,
  promo_ends: text,
  cancel_notice_days: z.number().int().nullable(),
  cancel_url: text,
  /** The payment method label exactly as shown; code keeps it only when it is one of the user's nicknames. */
  payment_method_label: text,
  category: text,
  category_confidence: confidence,
  scope: z.enum(SCOPES).nullable(),
  scope_confidence: confidence,
  field_confidence: z.object({
    name: confidence,
    amount: confidence,
    currency: confidence,
    billing_cycle: confidence,
    date: confidence,
  }),
  notes: text,
});

export type Extraction = z.infer<typeof extractionSchema>;
