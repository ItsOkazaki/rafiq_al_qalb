import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getAIConfig, isAIConfigured } from "@/lib/ai/provider";
import { ALL_CHUNKS } from "@/lib/corpus/chunks";

export const dynamic = "force-dynamic";

/**
 * فحص صحة تشغيلي للجنة التحكيم:
 * - `ok`: التطبيق يستجيب (وقاعدة البيانات إن كانت مضبوطة متصلة).
 * - `ai`: هل مسار النموذج المقيَّد مفعّل، وما المزوّد/النموذج — بلا أي مفاتيح.
 * - `corpus`: عدد المقاطع المعتمدة المحمّلة فعلياً في هذه النسخة.
 */
function aiStatus() {
  const grammarSkill = "التلخيص بقواعد النحو المستخرجة من ألفية ابن مالك [شرح ابن عثيمين] (shamela.ws/book/36954)";
  if (!isAIConfigured()) {
    return { configured: false, mode: "deterministic" as const, grammarSkill };
  }
  const config = getAIConfig();
  return {
    configured: true,
    provider: config.provider,
    chatModel: config.chatModel,
    mode: "grounded-model-with-deterministic-fallback" as const,
    grammarSkill,
  };
}

export async function GET() {
  const ai = aiStatus();
  const corpus = { approvedChunks: ALL_CHUNKS.length };

  if (!db) {
    return Response.json({ ok: true, database: "not-configured", ai, corpus });
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "connected", ai, corpus });
  } catch {
    return Response.json({ ok: false, database: "unavailable", ai, corpus }, { status: 500 });
  }
}
