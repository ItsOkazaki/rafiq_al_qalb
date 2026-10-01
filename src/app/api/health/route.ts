import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getAIConfig, isAIConfigured } from "@/lib/ai/provider";
import { embedTexts } from "@/lib/ai/embeddings";
import { APPROVED_SOURCES } from "@/lib/sources/registry";
import { CHUNKS } from "@/lib/corpus/chunks";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function probeChat(): Promise<{ ok: boolean; error?: string }> {
  const cfg = getAIConfig();
  if (!isAIConfigured()) return { ok: false, error: "AI_NOT_CONFIGURED" };
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: cfg.chatModel,
        temperature: 0,
        max_tokens: 16,
        messages: [
          { role: "system", content: "Return JSON only." },
          { role: "user", content: 'Return exactly {"ok":true}' },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(Math.min(cfg.timeoutMs, 10_000)),
    });
    if (!res.ok) return { ok: false, error: `CHAT_${res.status}` };
    const data = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
    return { ok: Boolean(data.choices?.[0]?.message?.content) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 180) : "CHAT_PROBE_FAILED" };
  }
}

async function probeEmbedding(): Promise<{ ok: boolean; error?: string }> {
  if (!isAIConfigured()) return { ok: false, error: "AI_NOT_CONFIGURED" };
  try {
    const vectors = await embedTexts(["اختبار صحة الاتصال بالبحث الدلالي"]);
    return { ok: Boolean(vectors?.[0]?.length) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 180) : "EMBEDDING_PROBE_FAILED" };
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
    chatModel: config.chatModel,
    embeddingModel: config.embeddingModel,
    baseUrlKind: config.provider,
    database,
    approvedSources: APPROVED_SOURCES.filter((s) => s.status === "active").length,
    indexedChunks: CHUNKS.length,
    pipeline: ["planner", "hybrid-retrieval", "reranking", "evidence-gate", "claim-generation", "claim-verification"],
    probes,
  });
}
