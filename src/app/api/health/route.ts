import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getAIConfig, isAIConfigured } from "@/lib/ai/provider";
import { APPROVED_SOURCES } from "@/lib/sources/registry";
import { CHUNKS } from "@/lib/corpus/chunks";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getAIConfig();
  let database = "configured";
  try {
    await db.execute(sql`select 1`);
  } catch {
    database = "unavailable";
  }
  return Response.json({
    ok: database === "configured" && isAIConfigured(),
    service: "rafiq-alqulub",
    aiProvider: config.provider,
    aiConfigured: isAIConfigured(),
    chatModel: config.chatModel,
    embeddingModel: config.embeddingModel,
    database,
    approvedSources: APPROVED_SOURCES.filter((s) => s.status === "active").length,
    indexedChunks: CHUNKS.length,
    pipeline: ["planner", "hybrid-retrieval", "reranking", "evidence-gate", "claim-generation", "claim-verification"],
  });
}
