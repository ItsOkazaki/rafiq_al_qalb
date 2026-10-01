// ─────────────────────────────────────────────────────────────────────────────
// Embedding client with Gemini / OpenRouter / OpenAI support.
// ─────────────────────────────────────────────────────────────────────────────

import { getAIConfig } from "@/lib/ai/provider";

const cache = new Map<string, number[]>();
const MAX_EMBED_CHARS = 1400;

interface OpenAIEmbeddingResponse {
  data?: { index?: number; embedding?: number[] }[];
}

interface GeminiEmbeddingResponse {
  embeddings?: { values?: number[] }[];
}

function stableKey(text: string): string {
  const clipped = text.slice(0, MAX_EMBED_CHARS);
  return `${clipped.length}:${clipped.slice(0, 90)}:${clipped.slice(-90)}`;
}

function prepareText(text: string): string {
  return text.trim().slice(0, MAX_EMBED_CHARS);
}

async function embedGemini(texts: string[]): Promise<number[][]> {
  const config = getAIConfig();
  const requests = texts.map((text) => ({
    model: `models/${config.embeddingModel}`,
    content: { parts: [{ text: prepareText(text) }] },
  }));
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
      throw new Error(`Embedding Gemini ${response.status}: ${detail.slice(0, 300)}`);
    }
    const data = (await response.json()) as GeminiEmbeddingResponse;
    if (!Array.isArray(data.embeddings)) throw new Error("Gemini embedding response missing embeddings");
    const vectors = data.embeddings.map((item) => item.values);
    if (vectors.some((vector) => !Array.isArray(vector) || vector.length === 0)) {
      throw new Error("Gemini embedding response contained an empty vector");
    }
    return vectors as number[][];
  } finally {
    clearTimeout(timeout);
  }
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
      throw new Error(`Embedding ${provider} ${response.status}: ${detail.slice(0, 300)}`);
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

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];

  const config = getAIConfig();
  const result = new Array<number[] | null>(texts.length).fill(null);
  const missing: { index: number; text: string; key: string }[] = [];

  texts.forEach((text, index) => {
    const prepared = prepareText(text);
    const key = stableKey(prepared);
    const cached = cache.get(key);
    if (cached) result[index] = cached;
    else missing.push({ index, text: prepared, key });
  });

  if (missing.length > 0) {
    // Gemini supports batchEmbedContents; OpenAI-compatible providers accept a
    // single array in /embeddings. Both paths keep the request count to one batch.
    const inputs = missing.map((m) => m.text);
    const vectors = config.embeddingProvider === "Gemini"
      ? await embedGemini(inputs)
      : await embedOpenAICompatible(inputs);

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
