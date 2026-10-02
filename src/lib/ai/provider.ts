// ─────────────────────────────────────────────────────────────────────────────
// مزوّد الذكاء الاصطناعي — Google Gemini (أساسي) / OpenAI (بديل)
// يعمل بمسار حتمي عند غياب أي مفتاح.
// درجة الحرارة = صفر، المخرجات مقيّدة بالمقاطع المسترجعة فقط.
// الحارس اللاحق يرفض أي صياغة محظورة.
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

// وصول آمن لمتغيرات البيئة
function env(name: string): string | undefined {
  if (typeof process === "undefined" || typeof process.env === "undefined") return undefined;
  return process.env[name];
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

interface OpenAIResponse {
  choices?: { message?: { content?: string | null } }[];
}

export interface GroundedResult {
  mode: "model";
  text: string;
}

async function callGemini(prompt: string, systemPrompt: string, apiKey: string): Promise<string | null> {
  const model = env("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 1024 },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

async function callOpenAI(prompt: string, systemPrompt: string, apiKey: string): Promise<string | null> {
  const baseUrl = env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";
  const model = env("OPENAI_MODEL") ?? "gpt-4o-mini";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 900,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as OpenAIResponse;
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function generateGroundedSummary(
  query: string,
  passages: RetrievedPassage[],
): Promise<GroundedResult | null> {
  if (!passages.length) return null;

  const geminiKey = env("GEMINI_API_KEY");
  const openaiKey = env("OPENAI_API_KEY");
  if (!geminiKey && !openaiKey) return null;

  const context = passages
    .map((p, i) => `[مقطع ${i + 1}]\nالمصدر: ${p.source.title}\nالموضع: ${p.chapter}\nالنص: ${p.text}`)
    .join("\n\n");

  const userPrompt = [
    "وصف المستخدم لموضوع بحثه (مدخلات شخصية، وليس نصاً علمياً):",
    `«${query}»`,
    "",
    "المادة المسترجعة من المصادر المعتمدة (وهي وحدها المسموح الاستناد إليها):",
    context,
  ].join("\n");

  let text: string | null = null;

  // Try Gemini first (free tier)
  if (geminiKey) {
    text = await callGemini(userPrompt, SYSTEM_PROMPT, geminiKey);
  }

  // Fallback to OpenAI
  if (!text && openaiKey) {
    text = await callOpenAI(userPrompt, SYSTEM_PROMPT, openaiKey);
  }

  if (!text) return null;

  // الحارس اللاحق: رفض أي صياغة محظورة
  if (!isFramingSafe(text)) return null;

  return { mode: "model", text };
}
