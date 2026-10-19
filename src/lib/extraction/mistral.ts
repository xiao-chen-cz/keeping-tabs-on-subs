import "server-only";
import { z } from "zod";
import type { PlainDate } from "@/lib/domain/types";
import type { ExtractionResult } from "./extract";
import { EXTRACTION_SYSTEM, extractionUserText, type CaptureContent } from "./prompt";
import { extractionSchema } from "./schema";

// Mistral Medium 3.5, pinned. MISTRAL_MODEL overrides it (for comparing models with `pnpm extract:live`).
export const MISTRAL_MODEL = "mistral-medium-2604";
const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const TIMEOUT_MS = 50_000;

const responseFormat = {
  type: "json_schema",
  json_schema: { name: "extraction", schema: z.toJSONSchema(extractionSchema), strict: true },
} as const;

type ContentChunk =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: string }
  | { type: "document_url"; document_url: string };

/** The user turn for Mistral: images and PDFs go as base64 data URLs. */
export function mistralUserContent(
  capture: CaptureContent,
  today: PlainDate,
  categories: readonly string[],
): ContentChunk[] {
  const text: ContentChunk = { type: "text", text: extractionUserText(capture, today, categories) };
  switch (capture.kind) {
    case "text":
      return [text];
    case "image":
      return [{ type: "image_url", image_url: `data:${capture.mediaType};base64,${capture.base64}` }, text];
    case "pdf":
      return [{ type: "document_url", document_url: `data:application/pdf;base64,${capture.base64}` }, text];
  }
}

const responseSchema = z.object({
  model: z.string(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable(),
        message: z.object({
          // A plain string, or chunks (a reasoning model may put "thinking" chunks before the text).
          content: z.union([z.string(), z.array(z.object({ type: z.string(), text: z.string().optional() }))]).nullable(),
        }),
      }),
    )
    .min(1),
});

/** One structured-output call, same contract as claude.ts. Never throws. */
export async function extractCapture(
  capture: CaptureContent,
  today: PlainDate,
  categories: readonly string[],
): Promise<ExtractionResult> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return { ok: false, error: "Extraction is not set up." };
  const body = JSON.stringify({
    model: process.env.MISTRAL_MODEL || MISTRAL_MODEL,
    temperature: 0,
    max_tokens: 4000,
    response_format: responseFormat,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM },
      { role: "user", content: mistralUserContent(capture, today, categories) },
    ],
  });
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  const send = () => post(apiKey, body, signal);
  let response: Response;
  try {
    // One retry on overload, a server error or a dropped connection, like the Claude client's maxRetries: 1.
    response = await send().then(
      (r) => (r.status === 429 || r.status >= 500 ? send() : r),
      (error: unknown) => {
        if (isTimeout(error)) throw error;
        return send();
      },
    );
  } catch (error) {
    if (isTimeout(error)) return { ok: false, error: "Reading took too long." };
    return { ok: false, error: "The reading service failed." };
  }

  if (response.status === 401 || response.status === 403) return { ok: false, error: "Extraction is not set up." };
  if (response.status === 429) return { ok: false, error: "Too many requests right now." };
  if (response.status === 400 || response.status === 422) return { ok: false, error: "The file could not be read." };
  if (!response.ok) return { ok: false, error: "The reading service failed." };

  try {
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) return { ok: false, error: "The answer did not match the form." };
    const choice = parsed.data.choices[0];
    if (choice.finish_reason === "length") return { ok: false, error: "The answer was cut off." };
    const content = choice.message.content;
    const text =
      typeof content === "string"
        ? content
        : (content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    const extraction = extractionSchema.safeParse(JSON.parse(text));
    if (!extraction.success) return { ok: false, error: "The answer did not match the form." };
    return { ok: true, extraction: extraction.data, model: parsed.data.model };
  } catch (error) {
    if (isTimeout(error)) return { ok: false, error: "Reading took too long." };
    return { ok: false, error: "The answer did not match the form." };
  }
}

function isTimeout(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
}

function post(apiKey: string, body: string, signal: AbortSignal): Promise<Response> {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body,
    signal,
  });
}
