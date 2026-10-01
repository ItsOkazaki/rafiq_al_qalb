// ─────────────────────────────────────────────────────────────────────────────
// Embedding client + in-memory cache for the approved corpus.
// Semantic retrieval is a real model call; no fake vectors are shipped.
// ─────────────────────────────────────────────────────────────────────────────

import { getAIConfig } from "@/lib/ai/provider";

const cache = new Map<string, number[]>();

interface EmbeddingResponse {
  data?: { index?: number; embedding?: number[] }[];
}

function stableKey(text: string): string {
  return `${text.length}:${text.slice(0, 90)}:${text.slice(-90)}`;
}

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];

  const config = getAIConfig();
  const missing: { index: number; text: string; key: string }[] = [];
  const result = new Array<number[] | null>(texts.length).fill(null);

  texts.forEach((text, index) => {
    const key = stableKey(text);
    const cached = cache.get(key);
    if (cached) result[index] = cached;
    else missing.push({ index, text, key });
  });

  if (missing.length > 0) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(`${config.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.embeddingModel,
          input: missing.map((m) => m.text),
        }),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const data = (await response.json()) as EmbeddingResponse;
      if (!Array.isArray(data.data)) return null;
      for (const item of data.data) {
        const idx = Number(item.index);
        const vector = item.embedding;
        const target = Number.isInteger(idx) ? missing[idx] : undefined;
        if (!target || !Array.isArray(vector) || vector.length === 0) continue;
        cache.set(target.key, vector);
        result[target.index] = vector;
      }
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
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
