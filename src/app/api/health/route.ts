import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getAIConfig, isAIConfigured, probeChat } from "@/lib/ai/provider";
import { embedTexts } from "@/lib/ai/embeddings";
import { APPROVED_SOURCES } from "@/lib/sources/registry";
import { CHUNKS } from "@/lib/corpus/chunks";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function probeEmbedding(): Promise<{ ok: boolean; error?: string }> {
  const cfg = getAIConfig();
  if (!cfg.embeddingApiKey) return { ok: false, error: "EMBEDDING_NOT_CONFIGURED" };
  try {
    const vectors = await embedTexts(["اختبار صحة الاتصال بالبحث الدلالي"]);
    return { ok: Boolean(vectors?.[0]?.length) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 220) : "EMBEDDING_PROBE_FAILED" };
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
