import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { PlainDate } from "@/lib/domain/types";
import { EXTRACTION_SYSTEM, extractionUserContent, type CaptureContent } from "./prompt";
import { extractionSchema, type Extraction } from "./schema";

export const EXTRACTION_MODEL = "claude-opus-5-5";

export type ExtractionResult =
  | { ok: true; extraction: Extraction; model: string }
  | { ok: false; error: string };

let client: Anthropic | null = null;

/** One structured-output call (plan d16-20 B1). Never throws: failures become a short, user-safe error. */
export async function extractCapture(
  capture: CaptureContent,
  today: PlainDate,
  categories: readonly string[],
): Promise<ExtractionResult> {
  client ??= new Anthropic({ timeout: 50_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.parse({
      model: EXTRACTION_MODEL,
      max_tokens: 4000,
      // On a policy decline the API reruns the request on a suitable fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(extractionSchema) },
      system: EXTRACTION_SYSTEM,
      messages: [{ role: "user", content: extractionUserContent(capture, today, categories) }],
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "The model declined to read this capture." };
    if (response.stop_reason === "max_tokens") return { ok: false, error: "The answer was cut off." };
    if (!response.parsed_output) return { ok: false, error: "The answer did not match the form." };
    return { ok: true, extraction: response.parsed_output, model: response.model };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return { ok: false, error: "Too many requests right now." };
    if (error instanceof Anthropic.BadRequestError) return { ok: false, error: "The file could not be read." };
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "Extraction is not set up." };
    if (error instanceof Anthropic.APIConnectionTimeoutError) return { ok: false, error: "Reading took too long." };
    if (error instanceof Anthropic.APIError) return { ok: false, error: "The reading service failed." };
    return { ok: false, error: "The answer did not match the form." };
  }
}
