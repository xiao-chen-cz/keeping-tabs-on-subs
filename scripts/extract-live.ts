// One real extraction call, run by hand (about $0.05). Prints the model output and the resulting draft.
//   pnpm extract:live <file.png|.jpg|.webp|.pdf|.txt> [--today YYYY-MM-DD]
//   pnpm extract:live --sample codepilot-receipt|noteforge-billing|gymbox-invoice|readloop-trial-email [--today …]
//   --save <path.json> writes the model output as a recorded fixture for tests.
// Only fictional sample captures belong here: never run it on a real receipt from this repo's history.
import { readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { todayIn } from "../src/lib/dates/plain-date";
import { extractCapture } from "../src/lib/extraction/claude";
import type { CaptureContent } from "../src/lib/extraction/prompt";
import { extractionToDraft } from "../src/lib/extraction/to-draft";
import { SEED_CATEGORIES, SEED_PAYMENT_METHODS } from "../src/lib/seed/sets";
import { sampleCaptureText } from "../src/lib/seed/captures";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function load(path: string): CaptureContent {
  const ext = extname(path).toLowerCase();
  const base64 = () => readFileSync(path).toString("base64");
  if (ext === ".pdf") return { kind: "pdf", base64: base64() };
  if (ext === ".png") return { kind: "image", mediaType: "image/png", base64: base64() };
  if (ext === ".jpg" || ext === ".jpeg") return { kind: "image", mediaType: "image/jpeg", base64: base64() };
  if (ext === ".webp") return { kind: "image", mediaType: "image/webp", base64: base64() };
  return { kind: "text", text: readFileSync(path, "utf8") };
}

async function main() {
  const today = arg("--today") ?? todayIn("Europe/Berlin", new Date());
  const sample = arg("--sample");
  const file = process.argv[2]?.startsWith("--") ? undefined : process.argv[2];
  const capture: CaptureContent | null = sample
    ? { kind: "text", text: sampleCaptureText(sample, today) }
    : file
      ? load(file)
      : null;
  if (!capture) {
    console.error("Usage: pnpm extract:live <file> | --sample <key> [--today YYYY-MM-DD]");
    process.exit(1);
  }
  const started = Date.now();
  const result = await extractCapture(capture, today, SEED_CATEGORIES);
  console.log(`(${((Date.now() - started) / 1000).toFixed(1)} s)`);
  if (!result.ok) {
    console.error("Extraction failed:", result.error);
    process.exit(1);
  }
  console.log("Model:", result.model);
  console.log("Output:", JSON.stringify(result.extraction, null, 2));
  const save = arg("--save");
  if (save) writeFileSync(save, JSON.stringify({ today, model: result.model, output: result.extraction }, null, 2) + "\n");
  const draft = extractionToDraft(result.extraction, {
    categories: SEED_CATEGORIES,
    paymentMethods: SEED_PAYMENT_METHODS,
    subscriptions: [],
  });
  console.log("Draft:", JSON.stringify(draft, null, 2));
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
