import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getAIConfig, isAIConfigured, probeChat } from "@/lib/ai/provider";
import { embedTexts } from "@/lib/ai/embeddings";
import { APPROVED_SOURCES } from "@/lib/sources/registry";
import { CHUNKS } from "@/lib/corpus/chunks";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function probeEmbedding(): Promise<{ ok: boolean; vectorDimensions?: number; batchVectors?: number; error?: string }> {
  const cfg = getAIConfig();
  if (!cfg.embeddingApiKey) return { ok: false, error: "EMBEDDING_NOT_CONFIGURED" };
  try {
    // Probe a small batch as well as one vector. The production retrieval path
    // intentionally batches Gemini requests to avoid oversized payload failures.
    const vectors = await embedTexts([
      "اختبار صحة الاتصال بالبحث الدلالي",
      "اختبار ثانٍ للبحث الدلالي",
      "اختبار ثالث للبحث الدلالي",
    ]);
    const dimensions = vectors?.[0]?.length;
    return {
      ok: Boolean(vectors?.length === 3 && dimensions),
      vectorDimensions: dimensions,
      batchVectors: vectors?.length,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 320) : "EMBEDDING_PROBE_FAILED" };
  }
}

export async function GET(request: Request) {
  const config = getAIConfig();
  let database = "configured";
  try {
    await db.execute(sql`select 1`);
  } catch {
    database = "unavailable";
  }

  const shouldProbe = new URL(request.url).searchParams.get("probe") === "1";
  const probes = shouldProbe
    ? { chat: await probeChat(), embedding: await probeEmbedding() }
    : undefined;

  return Response.json({
    ok: database === "configured" && isAIConfigured() && (!probes || (probes.chat.ok && probes.embedding.ok)),
    service: "rafiq-alqulub",
    aiProvider: config.provider,
    aiConfigured: isAIConfigured(),
    freeTierCapable: config.freeTierCapable,
    chatModel: config.chatModel,
    embeddingProvider: config.embeddingProvider,
    embeddingModel: config.embeddingModel,
    baseUrlKind: config.provider,
    database,
    approvedSources: APPROVED_SOURCES.filter((s) => s.status === "active").length,
    indexedChunks: CHUNKS.length,
    pipeline: ["planner", "hybrid-retrieval", "reranking", "evidence-gate", "claim-generation", "claim-verification"],
    probes,
  });
}
