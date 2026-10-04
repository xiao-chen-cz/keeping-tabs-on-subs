// @vitest-environment node
import { describe, expect, it } from "vitest";
import { accountToShow, duplicateNames } from "./duplicates";

const row = (name: string) => ({ input: { name } });

describe("duplicateNames", () => {
  it("is empty when every name is unique", () => {
    expect(duplicateNames([row("A"), row("B")]).size).toBe(0);
    expect(duplicateNames([]).size).toBe(0);
  });
  it("finds repeated names case-insensitively, trimmed and with spaces collapsed", () => {
    const d = duplicateNames([row("CodePilot Pro"), row("Other"), row("  codepilot   PRO ")]);
    expect([...d]).toEqual(["codepilot pro"]);
  });
});

describe("accountToShow", () => {
  const dups = duplicateNames([row("CodePilot Pro"), row("codepilot pro"), row("Solo")]);
  it("shows the label only for a shared name", () => {
    expect(accountToShow(dups, { name: "CodePilot Pro", accountLabel: "me@example.com" })).toBe("me@example.com");
    expect(accountToShow(dups, { name: "Solo", accountLabel: "me@example.com" })).toBeNull();
  });
  it("shows nothing without a label or without a duplicate set", () => {
    expect(accountToShow(dups, { name: "CodePilot Pro", accountLabel: null })).toBeNull();
    expect(accountToShow(dups, { name: "CodePilot Pro" })).toBeNull();
    expect(accountToShow(undefined, { name: "CodePilot Pro", accountLabel: "x" })).toBeNull();
  });
});
