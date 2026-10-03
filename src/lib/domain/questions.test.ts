// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseAnswer, QUESTIONS, questionsFor } from "./questions";

describe("QUESTIONS", () => {
  it("has the fixed shapes", () => {
    expect(QUESTIONS.billingCycle).toMatchObject({ input: "options" });
    expect(QUESTIONS.billingCycle.input === "options" && QUESTIONS.billingCycle.options).toHaveLength(4);
    expect(QUESTIONS.currency.input === "options" && QUESTIONS.currency.options.map((o) => o.value)).toEqual([
      "EUR", "USD", "GBP", "CHF",
    ]);
    expect(QUESTIONS["lastRenewalDate|trialEnds"].prompt).toBe("When was the last charge, or when is the next one?");
    expect(questionsFor(["name", "currency"]).map((q) => q.field)).toEqual(["name", "currency"]);
  });
});

describe("parseAnswer", () => {
  it("parses amounts with comma or dot into cents", () => {
    expect(parseAnswer("amountCents", "39,00")).toBe(3900);
    expect(parseAnswer("amountCents", " 9.99 ")).toBe(999);
    expect(parseAnswer("amountCents", "12")).toBe(1200);
    expect(parseAnswer("amountCents", "about 12")).toBeNull();
    expect(parseAnswer("amountCents", "1.234,50")).toBeNull();
    expect(parseAnswer("amountCents", "-3")).toBeNull();
  });
  it("parses ISO dates only", () => {
    expect(parseAnswer("lastRenewalDate|trialEnds", "2026-11-01")).toBe("2026-11-01");
    expect(parseAnswer("lastRenewalDate|trialEnds", "2026-02-30")).toBeNull();
    expect(parseAnswer("lastRenewalDate|trialEnds", "next Friday")).toBeNull();
  });
  it("parses enum values and labels case-insensitively", () => {
    expect(parseAnswer("currency", "usd")).toBe("USD");
    expect(parseAnswer("currency", "yen")).toBeNull();
    expect(parseAnswer("billingCycle", "every_4_weeks")).toBe("every_4_weeks");
    expect(parseAnswer("billingCycle", "Every 4 weeks")).toBe("every_4_weeks");
    expect(parseAnswer("billingCycle", "Yearly")).toBe("yearly");
    expect(parseAnswer("billingCycle", "weekly")).toBeNull();
  });
  it("trims names and rejects blanks", () => {
    expect(parseAnswer("name", "  Gymbox ")).toBe("Gymbox");
    expect(parseAnswer("name", "   ")).toBeNull();
  });
});
