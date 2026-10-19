// @vitest-environment node
// The Mistral adapter with fetch mocked: request shape, answer parsing and error mapping. No live calls.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import recorded from "./fixtures/mistral/noteforge-billing.text.json";

vi.mock("server-only", () => ({}));
const { extractCapture, mistralUserContent, MISTRAL_MODEL } = await import("./mistral");
const { extractionProvider } = await import("./extract");

const T = "2026-10-02";
const CATS = ["AI", "Software / SaaS"];
const text = { kind: "text", text: "NoteForge Pro $12.00" } as const;

function reply(content: unknown, finish = "stop", status = 200): Response {
  const body = { model: "mistral-medium-2604", choices: [{ finish_reason: finish, message: { content } }] };
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
const status = (code: number) => new Response("{}", { status: code });

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("MISTRAL_API_KEY", "test-key");
  vi.stubEnv("MISTRAL_MODEL", "");
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("request", () => {
  it("sends the system prompt, the capture, strict JSON schema and the pinned model", async () => {
    fetchMock.mockResolvedValueOnce(reply(JSON.stringify(recorded.output)));
    await extractCapture(text, T, CATS);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.mistral.ai/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe(MISTRAL_MODEL);
    expect(body.response_format).toMatchObject({ type: "json_schema", json_schema: { strict: true } });
    expect(body.response_format.json_schema.schema.required).toContain("is_subscription");
    expect(body.messages[0]).toMatchObject({ role: "system" });
    expect(body.messages[1].content[0].text).toContain("Today is 2026-10-02.");
    expect(body.messages[1].content[0].text).toContain("<capture>\nNoteForge Pro $12.00\n</capture>");
  });

  it("puts images and PDFs first, as base64 data URLs", () => {
    const img = mistralUserContent({ kind: "image", mediaType: "image/png", base64: "AAA" }, T, CATS);
    expect(img[0]).toEqual({ type: "image_url", image_url: "data:image/png;base64,AAA" });
    expect(img[1]).toMatchObject({ type: "text", text: expect.stringContaining("the image above") });
    const pdf = mistralUserContent({ kind: "pdf", base64: "BBB" }, T, CATS);
    expect(pdf[0]).toEqual({ type: "document_url", document_url: "data:application/pdf;base64,BBB" });
  });
});

describe("answer", () => {
  it("returns the parsed extraction and the model", async () => {
    fetchMock.mockResolvedValueOnce(reply(JSON.stringify(recorded.output)));
    const r = await extractCapture(text, T, CATS);
    expect(r).toMatchObject({ ok: true, model: "mistral-medium-2604", extraction: { name: "NoteForge", amount: "12.00" } });
  });

  it("reads the text chunks of a chunked answer and skips thinking", async () => {
    const json = JSON.stringify(recorded.output);
    fetchMock.mockResolvedValueOnce(reply([{ type: "thinking", thinking: [] }, { type: "text", text: json }]));
    expect((await extractCapture(text, T, CATS)).ok).toBe(true);
  });

  it("rejects a cut-off answer, non-JSON and a wrong shape", async () => {
    fetchMock.mockResolvedValueOnce(reply("{", "length"));
    expect(await extractCapture(text, T, CATS)).toEqual({ ok: false, error: "The answer was cut off." });
    fetchMock.mockResolvedValueOnce(reply("not json"));
    expect(await extractCapture(text, T, CATS)).toEqual({ ok: false, error: "The answer did not match the form." });
    fetchMock.mockResolvedValueOnce(reply(JSON.stringify({ name: "X" })));
    expect(await extractCapture(text, T, CATS)).toEqual({ ok: false, error: "The answer did not match the form." });
  });
});

describe("errors", () => {
  it("needs the API key and makes no call without it", async () => {
    vi.stubEnv("MISTRAL_API_KEY", "");
    expect(await extractCapture(text, T, CATS)).toEqual({ ok: false, error: "Extraction is not set up." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps HTTP errors to short messages", async () => {
    for (const [code, error] of [
      [401, "Extraction is not set up."],
      [400, "The file could not be read."],
      [422, "The file could not be read."],
      [404, "The reading service failed."],
    ] as const) {
      fetchMock.mockResolvedValueOnce(status(code));
      expect(await extractCapture(text, T, CATS)).toEqual({ ok: false, error });
    }
  });

  it("retries once on 429 or 5xx", async () => {
    fetchMock.mockResolvedValueOnce(status(503)).mockResolvedValueOnce(reply(JSON.stringify(recorded.output)));
    expect((await extractCapture(text, T, CATS)).ok).toBe(true);
    fetchMock.mockResolvedValueOnce(status(429)).mockResolvedValueOnce(status(429));
    expect(await extractCapture(text, T, CATS)).toEqual({ ok: false, error: "Too many requests right now." });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("maps a timeout and a network failure", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"));
    expect(await extractCapture(text, T, CATS)).toEqual({ ok: false, error: "Reading took too long." });
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed")).mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await extractCapture(text, T, CATS)).toEqual({ ok: false, error: "The reading service failed." });
  });
});

describe("provider switch", () => {
  it("defaults to Mistral; only an explicit 'claude' switches back", () => {
    vi.stubEnv("EXTRACTION_PROVIDER", "");
    expect(extractionProvider()).toBe("mistral");
    vi.stubEnv("EXTRACTION_PROVIDER", "claude");
    expect(extractionProvider()).toBe("claude");
    vi.stubEnv("EXTRACTION_PROVIDER", "openai");
    expect(extractionProvider()).toBe("mistral");
  });
});
