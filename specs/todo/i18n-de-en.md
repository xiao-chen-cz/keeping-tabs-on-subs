# Plan: German and English (DE/EN)

Created 2026-10-08 · **PARKED (2026-10-08): after the demo. Testers are fine in English, so the remaining build days go to testing and fixes.** Not a brief milestone.

## 1. Goal

Each user sees the app, and gets the reminder emails, in German or English. Stored values (enums, dates, amounts) do not change; only what is shown does.

Not in scope: other languages, translated `/de/...` URLs (the app is private), translating user data such as category names.

## 2. Approach

- **Library:** `next-intl` (works with Server Components and Server Actions). Check its current docs against the installed Next.js version first (see `AGENTS.md`).
- **Language setting:** new nullable `profiles.locale` (`de` | `en`), chosen in Settings. When empty, use the browser's `Accept-Language`, then English. The email job reads it too.
- **Dictionaries:** `messages/en.json` and `messages/de.json`, keyed by screen or component. A test checks that both have the same keys.
- **Formatting:** `src/components/format.ts` has hard-coded English month names and relative days ("in 3 days", "tomorrow"); `formatMoney` in `src/lib/domain/totals.ts` uses `en-GB`. Pass the locale into both and use `Intl` (German: "5. Okt.", "in 3 Tagen", "morgen", "2,00 €"). `plain-date.ts` keeps `en-CA`: it is used for parsing, not display.
- **Labels for stored values:** billing cycle, scope, confidence, subscription status and capture status get a label per language; the stored values stay English.
- **Missing-field questions** (`src/lib/domain/questions.ts`): translate the prompts and option labels. Free-text answers in German ("monatlich", "jährlich") need German aliases in the parser.
- **Reminder emails** (`src/lib/alerts-job/digest.ts`, Edge Function `send-alerts`): build in the user's language and rebuild the bundle (`pnpm bundle:alerts`).
- **Capture and extraction:** no change. The model already reads German receipts and emails; the prompt stays English.
- **Tour** (`src/components/tour.tsx`): the stop texts and example cards go into the dictionaries.
- **Tests:** existing tests keep running in English; add a few German checks (formatting, one screen, one email).

## 3. Effort

About 4–5 working days, plus the owner's review of the German copy.

| Part | Effort |
|---|---|
| Setup, locale column, Settings choice | ½ day |
| Move screen text to dictionaries (about 43 components, est. 300–400 strings incl. form-check errors and questions) | 1½–2 days |
| Date and money formatting | ½ day |
| Reminder emails | ½ day |
| Labels for stored values, German question answers | ¼ day |
| Tests | ½ day |
| German copy | owner review |

## 4. Docs to update when built

- `specs/logic-spec.md` if any rule depends on language (none expected).
- `docs/tester-guide.md`: mention the language setting; optionally a German version.
