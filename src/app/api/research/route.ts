import { db } from "@/db";
import { researchSessions } from "@/db/schema";
import { runResearch } from "@/lib/research/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

interface ResearchRequestBody {
  query?: unknown;
  /** `ai` (افتراضي) أو `baseline` — يُستعمل للقياس المقارن فقط. */
  mode?: unknown;
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
  const result = await runResearch(query, { mode });

  // توثيق تشغيلي بأفضل جهد — لا يُسقِط الاستجابة أبداً.
  if (db) {
    try {
      await db.insert(researchSessions).values({
        query: result.query,
        outcome: result.outcome,
        topicIds: result.topics.map((t) => t.topic.id),
        keywords: result.keywords,
        passageIds: result.passages.map((p) => p.chunkId),
        passageCount: result.passages.length,
        aiMode: result.ai.mode,
        safetyTriggered: result.outcome === "safety" ? "yes" : "no",
      });
    } catch {
      // التسجيل تتبعي فقط — فشله لا يؤثر في نتيجة البحث.
    }
  }

  return Response.json(result);
}
