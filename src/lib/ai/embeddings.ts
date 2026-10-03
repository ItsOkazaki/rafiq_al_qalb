// ─────────────────────────────────────────────────────────────────────────────
// NOT WIRED INTO THE RUNTIME PATH.
// This client is kept as reviewed engineering groundwork for a future hybrid
// retrieval step; nothing in `src/app` or `src/lib/rag` imports it today, and
// the shipped retrieval is lexical/topic-based only (see docs/ARCHITECTURE.md).
// Do not describe embeddings as part of the current pipeline.
//
// Embedding client with Gemini / OpenRouter / OpenAI support.
// Gemini retrieval is batched in small groups so one Vercel request does not
// depend on a very large batch succeeding. Query/document prefixes follow the
// Gemini Embedding 2 retrieval guidance.
// ─────────────────────────────────────────────────────────────────────────────

import { getAIConfig } from "@/lib/ai/provider";

const cache = new Map<string, number[]>();
const MAX_EMBED_CHARS = 1400;
const GEMINI_BATCH_SIZE = 10;
const GEMINI_EMBED_MAX_RETRIES = 2;

interface OpenAIEmbeddingResponse {
  data?: { index?: number; embedding?: number[] }[];
}

interface GeminiEmbeddingResponse {
  embeddings?: { values?: number[] }[];
}

function stableKey(text: string): string {
  const config = getAIConfig();
  const clipped = text.slice(0, MAX_EMBED_CHARS);
  return `${config.embeddingProvider}:${config.embeddingModel}:${clipped.length}:${clipped.slice(0, 90)}:${clipped.slice(-90)}`;
}

function prepareText(text: string): string {
  return text.trim().slice(0, MAX_EMBED_CHARS);
}

function geminiText(text: string, role: "query" | "document" | "neutral"): string {
  const prepared = prepareText(text);
  if (role === "query") return `task: question answering | query: ${prepared}`;
  if (role === "document") return `title: none | text: ${prepared}`;
  return prepared;
}

function isRetryableEmbeddingStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function embeddingRetryDelayMs(attempt: number, retryAfterHeader?: string | null): number {
  const retryAfter = Number(retryAfterHeader ?? 0);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(20_000, retryAfter * 1000);
  return Math.min(6_000, 600 * (2 ** attempt) + Math.floor(Math.random() * 250));
}

async function embedGeminiBatch(texts: string[]): Promise<number[][]> {
  const config = getAIConfig();
  const requests = texts.map((text) => ({
    model: `models/${config.embeddingModel}`,
    content: { parts: [{ text }] },
  }));

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= GEMINI_EMBED_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(`${config.embeddingBaseUrl}/models/${encodeURIComponent(config.embeddingModel)}:batchEmbedContents`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.embeddingApiKey ? { "x-goog-api-key": config.embeddingApiKey } : {}),
        },
        body: JSON.stringify({ requests }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        lastError = new Error(`Embedding Gemini ${response.status}: ${detail.slice(0, 420)}`);
        if (isRetryableEmbeddingStatus(response.status) && attempt < GEMINI_EMBED_MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, embeddingRetryDelayMs(attempt, response.headers.get("retry-after"))));
          continue;
        }
        throw lastError;
      }
      const data = (await response.json()) as GeminiEmbeddingResponse;
      if (!Array.isArray(data.embeddings)) throw new Error("Gemini embedding response missing embeddings");
      if (data.embeddings.length !== texts.length) {
        throw new Error(`Gemini embedding count mismatch: requested ${texts.length}, received ${data.embeddings.length}`);
      }
      const vectors = data.embeddings.map((item) => item.values);
      if (vectors.some((vector) => !Array.isArray(vector) || vector.length === 0)) {
        throw new Error("Gemini embedding response contained an empty vector");
      }
      return vectors as number[][];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < GEMINI_EMBED_MAX_RETRIES && (lastError.message.includes("fetch failed") || lastError.name === "AbortError")) {
        await new Promise((resolve) => setTimeout(resolve, embeddingRetryDelayMs(attempt)));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error("Gemini embedding request failed");
}

async function embedGemini(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += GEMINI_BATCH_SIZE) {
    const batch = texts.slice(start, start + GEMINI_BATCH_SIZE);
    const batchVectors = await embedGeminiBatch(batch);
    vectors.push(...batchVectors);
  }
  return vectors;
}

async function embedOpenAICompatible(texts: string[]): Promise<number[][]> {
  const config = getAIConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const provider = config.embeddingProvider;
    const baseUrl = config.embeddingBaseUrl;
    const key = config.embeddingApiKey;
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(key ? { authorization: `Bearer ${key}` } : {}),
        ...(provider === "OpenRouter" ? {
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://rafiq-alqulub.vercel.app",
          "X-Title": process.env.OPENROUTER_SITE_NAME ?? "Rafiq Al-Qulub",
        } : {}),
      },
      body: JSON.stringify({
        model: config.embeddingModel,
        input: texts.map(prepareText),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Embedding ${provider} ${response.status}: ${detail.slice(0, 420)}`);
    }
    const data = (await response.json()) as OpenAIEmbeddingResponse;
    if (!Array.isArray(data.data)) throw new Error("Embedding response missing data");
    const byIndex = new Map<number, number[]>();
    for (const item of data.data) {
      if (Number.isInteger(item.index) && Array.isArray(item.embedding) && item.embedding.length > 0) {
        byIndex.set(Number(item.index), item.embedding);
      }
    }
    const vectors = texts.map((_, index) => byIndex.get(index));
    if (vectors.some((vector) => !vector)) throw new Error("Embedding response omitted one or more vectors");
    return vectors as number[][];
  } finally {
    clearTimeout(timeout);
  }
}

export interface RetrievalEmbeddingInputs {
  query: string;
  documents: { text: string; title?: string }[];
}

/**
 * Embeds one retrieval query and a list of documents. Gemini Embedding 2 uses
 * asymmetric retrieval formatting as recommended by Google's current docs.
 */
export async function embedRetrievalInputs(inputs: RetrievalEmbeddingInputs): Promise<{ query: number[]; documents: number[][] }> {
  const config = getAIConfig();
  const queryText = config.embeddingProvider === "Gemini"
    ? geminiText(inputs.query, "query")
    : prepareText(inputs.query);
  const documentTexts = inputs.documents.map((doc) => config.embeddingProvider === "Gemini"
    ? `title: ${(doc.title ?? "none").trim().slice(0, 180)} | text: ${prepareText(doc.text)}`
    : prepareText(doc.text));

  const all = [queryText, ...documentTexts];
  const vectors = await embedTexts(all);
  if (!vectors || vectors.length !== all.length) {
    throw new Error(`Embedding result mismatch: expected ${all.length}, received ${vectors?.length ?? 0}`);
  }
  return { query: vectors[0], documents: vectors.slice(1) };
}

export interface EmbedOptions {
  role?: "query" | "document" | "neutral";
}

export async function embedTexts(texts: string[], options: EmbedOptions = {}): Promise<number[][] | null> {
  if (texts.length === 0) return [];

  const config = getAIConfig();
  const result = new Array<number[] | null>(texts.length).fill(null);
  const missing: { index: number; text: string; key: string }[] = [];

  texts.forEach((text, index) => {
    const prepared = options.role === "query"
      ? (config.embeddingProvider === "Gemini" ? geminiText(text, "query") : prepareText(text))
      : options.role === "document"
        ? (config.embeddingProvider === "Gemini" ? geminiText(text, "document") : prepareText(text))
        : prepareText(text);
    const key = stableKey(prepared);
    const cached = cache.get(key);
    if (cached) result[index] = cached;
    else missing.push({ index, text: prepared, key });
  });

  if (missing.length > 0) {
    const inputs = missing.map((m) => m.text);
    const vectors = config.embeddingProvider === "Gemini"
      ? await embedGemini(inputs)
      : await embedOpenAICompatible(inputs);

    if (vectors.length !== missing.length) {
      throw new Error(`Embedding result mismatch: requested ${missing.length}, received ${vectors.length}`);
    }
    vectors.forEach((vector, offset) => {
      const target = missing[offset];
      if (!target) return;
      cache.set(target.key, vector);
      result[target.index] = vector;
    });
  }

  if (result.some((v) => !v)) return null;
  return result as number[][];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  if (aa === 0 || bb === 0) return 0;
  return Math.max(-1, Math.min(1, dot / Math.sqrt(aa * bb)));
}
