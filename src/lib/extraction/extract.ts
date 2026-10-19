import "server-only";
import type { PlainDate } from "@/lib/domain/types";
import { extractCapture as extractWithClaude } from "./claude";
import { extractCapture as extractWithMistral } from "./mistral";
import type { CaptureContent } from "./prompt";
import type { Extraction } from "./schema";

export type ExtractionResult =
  | { ok: true; extraction: Extraction; model: string }
  | { ok: false; error: string };

export type ExtractionProvider = "mistral" | "claude";

/** EXTRACTION_PROVIDER picks the model. Mistral (EU-hosted) is the default; "claude" switches back. */
export function extractionProvider(): ExtractionProvider {
  return process.env.EXTRACTION_PROVIDER === "claude" ? "claude" : "mistral";
}

/** The one extraction call per capture. Never throws: failures become a short, user-safe error. */
export function extractCapture(
  capture: CaptureContent,
  today: PlainDate,
  categories: readonly string[],
): Promise<ExtractionResult> {
  return extractionProvider() === "claude"
    ? extractWithClaude(capture, today, categories)
    : extractWithMistral(capture, today, categories);
}
