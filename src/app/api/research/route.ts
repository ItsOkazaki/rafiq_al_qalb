import { db } from "@/db";
import { researchSessions } from "@/db/schema";
import { runResearch } from "@/lib/research/pipeline";

export const dynamic = "force-dynamic";

interface ResearchRequestBody {
  query?: unknown;
}

export async function POST(request: Request) {
  let body: ResearchRequestBody;
  try {
    body = (await request.json()) as ResearchRequestBody;
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query : "";
  const result = await runResearch(query);

  // توثيق تشغيلي بأفضل جهد — لا يُسقِط الاستجابة عند فشله.
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
    // التسجيل تتبعي فقط؛ صحّة نتيجة البحث لا تعتمد عليه.
  }

  return Response.json(result);
}
