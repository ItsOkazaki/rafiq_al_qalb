// ─────────────────────────────────────────────────────────────────────────────
// مزوّد الذكاء الاصطناعي المقيَّد بالمادة المسترجعة (Grounded RAG).
// - يعمل فقط إن توفر مفتاح في البيئة (OPENAI_API_KEY / نقطة نهاية متوافقة).
// - درجة حرارة صفرية (توليد حتمي منخفض العشوائية).
// - النظام يتلقى المقاطع المسترجعة المعتمدة فقط — لا معرفة خارجية.
// - حارس لاحق: أي صياغة محظورة (تشخيص/وصفة) → رفض المخرجات والرجوع للمسار الحتمي.
// ─────────────────────────────────────────────────────────────────────────────

import { isFramingSafe } from "@/lib/terminology";
import type { RetrievedPassage } from "@/lib/types";

export const SYSTEM_PROMPT = [
  "أنت أداة حوارية في مشروع «رفيق القلوب» تعمل على استرجاع المادة العلمية من مصادر مفهرسة.",
  "مهمتك الوحيدة: تلخيص المادة المسترجعة المقدمة إليك وتنظيمها للقارئ.",
  "قيود صارمة لا يجوز تجاوزها:",
  "- لا تقدّم تشخيصاً لحالة المستخدم ولا تصفه بأي داء.",
  "- لا تُصدر فتوى ولا حكماً شرعياً ولا تعلّق على طلبات الحلال والحرام.",
  "- لا تخترع نصوصاً ولا إحالات ولا أقوالاً، ولا تنسب قولاً لعالِم إلا إذا ورد حرفياً في المادة المسترجعة.",
  "- لا تستخدم أي معرفة خارج المادة المسترجعة المقدمة إليك.",
  "- ميّز بوضوح بين وصف المستخدم (مدخلاته الشخصية) ومحتوى المصدر (المادة العلمية).",
  "- إن لم تكن المادة كافية للإجابة، فقل ذلك صراحة ولا تملأ الفراغ.",
  "- لا تستخدم المصطلحات المحظورة: «تشخيص»، «وصفة»، «برنامج» علاجي، «أنت مصاب».",
  "صيغة الناتج: عربية سليمة، ٣–٥ نقاط موجزة، ثم سطر «حدود المادة:» يوضح ما لم تتناوله المقاطع.",
].join("\n");

interface ChatCompletionResponse {
  choices?: { message?: { content?: string | null } }[];
}

// وصول آمن لمتغيرات البيئة — لا يفترض وجود `process` إطلاقاً
// (يحمي من ReferenceError في حزم المتصفح أو أي بيئة غير قياسية).
function env(name: string): string | undefined {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return undefined;
  }
  return process.env[name];
}

export interface GroundedResult {
  mode: "model";
  text: string;
}

/**
 * يولّد تنظيماً مستنداً إلى المقاطع فقط. يعيد null إذا:
 * لا يوجد مفتاح، أو فشل الطلب، أو رفض الحارس المخرجات.
 */
export async function generateGroundedSummary(
  query: string,
  passages: RetrievedPassage[],
): Promise<GroundedResult | null> {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey || passages.length === 0) return null;

  const baseUrl = env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";
  const model = env("OPENAI_MODEL") ?? "gpt-4o-mini";

  const context = passages
    .map(
      (p, i) =>
        `[مقطع ${i + 1}]\nالمصدر: ${p.source.title}\nالموضع: ${p.chapter}\nالنص: ${p.text}`,
    )
    .join("\n\n");

  const userContent = [
    "وصف المستخدم لموضوع بحثه (مدخلات شخصية، وليس نصاً علمياً):",
    `«${query}»`,
    "",
    "المادة المسترجعة من المصادر المعتمدة (وهي وحدها المسموح الاستناد إليها):",
    context,
  ].join("\n");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 800,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ChatCompletionResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    // الحارس اللاحق: رفض أي صياغة محظورة في التوليد.
    if (!isFramingSafe(text)) return null;
    return { mode: "model", text };
  } catch {
    return null;
  }
}
