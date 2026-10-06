// The extraction request: a fixed system prompt (logic-spec §4) and one user turn holding the capture,
// today's date and the category list. Nothing else about the user is sent (plan d16-20 B8).
import type Anthropic from "@anthropic-ai/sdk";
import type { PlainDate } from "@/lib/domain/types";

export const EXTRACTION_SYSTEM = `You read one capture (a typed note, a screenshot, a PDF or pasted email text) about a subscription and fill in a fixed form. Return null for anything the capture does not state. Never guess a date or a price.

Fields:
- name: the product or service as a person would call it (e.g. "NoteForge"). vendor: the company, only when it differs from the name or is shown separately. plan: the plan or tier name.
- account_label: the login email or username the subscription belongs to, when shown. Never a password.
- amount: the price per billing period as printed, digits with a dot and at most 2 decimals (e.g. "12.00"). currency: from the list only, from a symbol or code that is shown ($ is USD, € is EUR, £ is GBP); otherwise null.
- billing_cycle: monthly, quarterly, every_4_weeks or yearly, only when stated ("per month", "/mo", "annual", "billed every 4 weeks"). A price alone does not state a cycle.
- last_charge_date: the date of a charge that already happened (a receipt or invoice date). next_charge_date: the next charge or renewal date, when stated. trial_ends: the end of a free trial. Write dates as YYYY-MM-DD. Resolve a date only when the capture fixes it: a weekday or day of month relative to today is fine ("renews on the 5th" means the next 5th on or after today); "soon" or "next month" without a day is null.
- regular_price and promo_ends: only when the capture states both the later price and the date it starts. Otherwise both null.
- cancel_notice_days: only when a notice period is stated, in days. cancel_url: a link to manage or cancel the subscription, when shown.
- payment_method_label: the payment method's name exactly as shown, but never a card number, last digits, IBAN or account number. If only those are shown, null.
- category: one name from the category list, inferred from the service name, plan and sender; null if none fits (then suggest a category in notes). category_confidence: high for explicit evidence, medium for indirect, low for a guess.
- scope: business when the capture names a business, shows a VAT or reverse-charge number or a company address; family only when a shared family account visibly pays; personal only when visibly private. With no evidence, still suggest a scope with scope_confidence low.
- field_confidence: for name, amount, currency, billing_cycle and the date you filled: high when stated plainly, medium when read from layout or context, low when unclear. Null for fields you left empty.
- notes: one short sentence with anything useful the form cannot hold (a price change, a new category suggestion). Never payment details.
- is_subscription: false when the capture is not about a recurring charge at all.`;

export type CaptureContent =
  | { kind: "text"; text: string }
  | { kind: "image"; mediaType: "image/png" | "image/jpeg" | "image/webp"; base64: string }
  | { kind: "pdf"; base64: string };

export function extractionUserContent(
  capture: CaptureContent,
  today: PlainDate,
  categories: readonly string[],
): Anthropic.ContentBlockParam[] {
  const context = `Today is ${today}.\nCategory list: ${categories.join("; ")}.`;
  switch (capture.kind) {
    case "text":
      return [{ type: "text", text: `${context}\n\nThe capture:\n<capture>\n${capture.text}\n</capture>` }];
    case "image":
      return [
        { type: "image", source: { type: "base64", media_type: capture.mediaType, data: capture.base64 } },
        { type: "text", text: `${context}\n\nThe capture is the image above.` },
      ];
    case "pdf":
      return [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: capture.base64 } },
        { type: "text", text: `${context}\n\nThe capture is the PDF above.` },
      ];
  }
}
