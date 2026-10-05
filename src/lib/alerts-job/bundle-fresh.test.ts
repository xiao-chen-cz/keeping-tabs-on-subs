// @vitest-environment node
// The send-alerts Edge Function runs a committed bundle of the app's alert code. This fails when that bundle
// no longer matches the source: run `pnpm bundle:alerts` and commit. Skipped where Deno is not installed.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const hasDeno = spawnSync("deno", ["--version"]).status === 0;

describe.skipIf(!hasDeno)("send-alerts bundle", () => {
  it("is up to date with src", () => {
    const out = join(mkdtempSync(join(tmpdir(), "alerts-bundle-")), "shared.bundle.js");
    execFileSync("sh", ["scripts/bundle-alerts.sh", out]);
    expect(readFileSync(out, "utf8")).toBe(readFileSync("supabase/functions/send-alerts/shared.bundle.js", "utf8"));
  }, 60_000);
});
