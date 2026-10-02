import { db } from "@/db";
import { researchSessions } from "@/db/schema";
import { runResearch } from "@/lib/research/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

interface ResearchRequestBody {
  query?: unknown;
  /** Benchmark comparator only. Public UI never selects baseline. */
  mode?: unknown;
  audience?: unknown;
}

export async function POST(request: Request) {
  let body: ResearchRequestBody;
  try {
    body = (await request.json()) as ResearchRequestBody;
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query : "";
  const mode = body.mode === "baseline" ? "baseline" : "ai";
  const audience = ["general", "student", "researcher", "preacher"].includes(String(body.audience))
    ? (String(body.audience) as "general" | "student" | "researcher" | "preacher")
    : "general";

  const result = await runResearch(query, { mode, audience });
  const d = result.diagnostics;

  // Neon is operational telemetry/evaluation storage; failure here must never
  // change the research answer returned to the user.
  if (db) try {
    await db.insert(researchSessions).values({
      query: result.query,
      outcome: result.outcome,
      topicIds: result.topics.map((t) => t.topic.id),
      keywords: result.keywords,
      passageIds: result.passages.map((p) => p.chunkId),
      passageCount: result.passages.length,
      aiMode: result.ai.mode,
      safetyTriggered: result.outcome === "safety" ? "yes" : "no",
      provider: d.provider,
      chatModel: d.chatModel,
      embeddingModel: d.embeddingModel,
      aiConfigured: d.aiConfigured,
      candidateCount: d.candidateCount,
      semanticRetrievalUsed: d.semanticRetrievalUsed,
      baselineTopIds: d.baselineTopIds,
      hybridTopIds: d.hybridTopIds,
      reranked: d.reranked,
      evidenceGate: d.evidenceGate,
      claims: d.claims,
      conflicts: d.conflicts,
      verifiedClaimCount: d.verifiedClaimCount,
      totalClaimCount: d.totalClaimCount,
      latencyMs: d.latencyMs,
      degradedReason: d.degradedReason,
      plan: d.plan,
    });
  } catch {
    // Telemetry is best-effort; never block a correct/explicit abstention.
  }

  return Response.json(result);
}
