// نقطة البحث: بوابات قبل التشغيل —
//   ١) حد المعدل: ٣٠ طلباً/دقيقة لكل عميل (مفتاح HMAC، عدّاد موزّع أو محلي).
//   ٢) حد حجم الجسم: ٨ ك.ب تُقرأ بالبث.
//   ٣) حد نص البحث: ١٠٠٠ حرف.
// لا يُخزَّن نص الاستعلام الخام في قاعدة البيانات أبداً.

import { db } from "@/db";
import { researchSessions } from "@/db/schema";
import { readCappedBody } from "@/lib/http-limits";
import { runResearch } from "@/lib/research/pipeline";
import { consumeRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_QUERY_LENGTH = 1000;

interface ResearchRequestBody {
  query?: unknown;
  /** `ai` (افتراضي) أو `baseline` — يُستعمل للقياس المقارن فقط. */
  mode?: unknown;
}

export async function POST(request: Request) {
  // ١) حد المعدل أولاً — لا تُقرأ الأجسام ولا تُشغَّل الأنابيب بعد التجاوز.
  const rate = await consumeRateLimit(request);
  if (!rate.allowed) {
    return Response.json(
      { error: "تجاوزت حد الطلبات المسموح به؛ حاول مجدداً بعد قليل." },
      { status: 429, headers: { "retry-after": String(rate.retryAfterSeconds) } },
    );
  }

  // ٢) قراءة الجسم بالبث مع حد الحجم.
  const body = await readCappedBody(request);
  if (!body.ok) {
    if (body.reason === "too-large") {
      return Response.json({ error: "حجم الطلب أكبر من المسموح به." }, { status: 413 });
    }
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  let parsed: ResearchRequestBody;
  try {
    parsed = JSON.parse(body.text) as ResearchRequestBody;
  } catch {
    return Response.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  // ٣) حد نص البحث.
  const query = typeof parsed.query === "string" ? parsed.query.trim() : "";
  if (query.length > MAX_QUERY_LENGTH) {
    return Response.json(
      { error: `نص البحث أطول من الحد المسموح (${MAX_QUERY_LENGTH} حرف).` },
      { status: 400 },
    );
  }

  const mode = parsed.mode === "baseline" ? "baseline" : "ai";
  const result = await runResearch(query, { mode });

  // توثيق تشغيلي بأفضل جهد — لا يُسقِط الاستجابة أبداً.
  // لا يُكتب نص الاستعلام الخام: مشتقات النتيجة فقط (النتيجة، الأبواب، المقاطع).
  if (db) {
    try {
      await db.insert(researchSessions).values({
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
