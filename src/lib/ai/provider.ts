// ─────────────────────────────────────────────────────────────────────────────
// مزوّد الذكاء الاصطناعي — Google Gemini (أساسي) / OpenAI (بديل)
// يعمل بمسار حتمي عند غياب أي مفتاح.
// درجة الحرارة = صفر، المخرجات مقيّدة بالمقاطع المسترجعة فقط.
// الحارس اللاحق يرفض أي صياغة محظورة.
// ─────────────────────────────────────────────────────────────────────────────

import { isFramingSafe } from "@/lib/terminology";
import { sanitizeStrictArabicOutput } from "@/lib/text/strict-output";
import type { RetrievedPassage } from "@/lib/types";

export const ARABIC_GRAMMAR_SKILL = [
  "# مهارة: النحو العربي (شرح ألفية ابن مالك - العثيمين)",
  "**الدور:** كاتب/محرر عربي يطبق قواعد النحو حسب مرجع: شرح العثيمين لألفية ابن مالك (shamela.ws/book/36954).",
  "**الهدف:** إنتاج نص عربي صحيح الإعراب، واضح، فصيح، طبيعي، وخالٍ من التكلف. الأولوية: المعنى > سلامة التركيب > السلاسة.",
  "",
  "## سير العمل الداخلي (قبل الإخراج):",
  "1. افهم المعنى، حدد نوع الجملة، العلاقات النحوية، والعامل المؤثر.",
  "2. راجع: علامات الإعراب/البناء، المطابقة، الضمائر ومرجعها، التقديم/التأخير.",
  "3. تأكد أن التطبيق لا يفسد المعنى أو يسبب تكلفاً.",
  "4. أخرج النص النهائي فقط (بدون شرح الخطوات ما لم يُطلب).",
  "",
  "## نقاط المراقبة النحوية:",
  "1. **الجملة الاسمية:** مبتدأ/خبر، نواسخ، مطابقة، حذف/تقدير. (لا ترفع كل اسم تلقائياً كمبتدأ).",
  "2. **الجملة الفعلية:** فعل/فاعل/نائب/مفعول/متعلقات، ترتيب، إسناد صحيح. (فرّق بين: فاعل/نائب، مفعول به/مطلق/فيه/لأجله، حال/تمييز، صفة/حال).",
  "3. **علامات الإعراب:** راجع العلامات الفرعية (مثنى، جمع مذكر سالم، أسماء/أفعال خمسة، مقصور، منقوص، ممنوع من صرف).",
  "4. **النواسخ:** كان/أخواتها، إن/أخواتها، أفعال القلوب، أدوات تغير الإعراب. (اعرف العامل قبل الإعراب).",
  "5. **التوابع:** نعت، عطف، توكيد، بدل. (النعت يطابق منعوته في: الإعراب، التعريف، التذكير/التأنيث، العدد).",
  "6. **الإضافة:** تحقق من المضاف والمضاف إليه، الجر، وأثرها في التعريف/التنكير.",
  "7. **الضمائر:** مرجع واضح، مطابقة، موقع إعرابي صحيح، تجنب الغموض.",
  "8. **الإشارة والموصولة:** مطابقة، صلة الموصول، العائد، الموقع الإعرابي.",
  "9. **الأدوات (شرط، استفهام، نفي، نصب، جزم):** راجع أثرها في الفعل والجملة.",
  "10. **الأفعال:** زمن، بناء، فاعل، تعدي/لزوم، مفعولات، أثر الأدوات.",
  "",
  "## التعامل مع النصوص والتلخيص:",
  "- **التلخيص (نص أو تفريغ صوتي):** عند تلخيص أي نص أو مفرغ صوتي، كثف المعلومات مع الحفاظ الصارم على: سلامة الإعراب، دقة المعنى الأصلي، وسلاسة الأسلوب. لا تحذف الجوانب الجوهرية، ولا تضف معلومات خارجية، ولا تضحي بالصحة النحوية من أجل الاختصار.",
  "- **تعديل نص المستخدم:** احفظ المعنى والنبرة. أصلح الأخطاء النحوية والركاكة فقط. لا تغير النص الصحيح بلا سبب.",
  "- **كتابة من الصفر:** طبق النحو تلقائياً حسب الغرض (مقال، قصة، إعلان، إلخ) دون تحويل النص لدرس نحوي.",
  "- **أخطاء المستخدم:** افهم المقصود، صححه في المخرج، ولا تحافظ على الخطأ. استفسر فقط إذا كان التصحيح يغير المعنى.",
  "",
  "## قواعد التشكيل والأسلوب:",
  "- **التشكيل:** لا تشكل كلياً إلا إذا طُلب. عند الطلب، شكّل بدقة (أواخر وداخل الكلمات) بدون تخمين. استخدم الضبط الجزئي فقط لإزالة اللبس.",
  "- **الأسلوب:** فصحى معاصرة واضحة (حديث/تقني)، رصين غير متكلف (أدبي/رسمي)، أو فصيح ومحترم (ديني). الجواز النحوي لا يعني الأفضلية؛ اختر الأوضح والأشيع فصاحةً.",
  "",
  "## قواعد المخرجات الصارمة:",
  "- **اللغة:** عربي فقط. لا إنجليزية/فرنسية. استخدم مصطلحات عربية ما أمكن.",
  "- **الشرح:** لا تشرح قواعد هذه المهارة أو تكشف الخطوات الداخلية إلا إذا طُلب صراحة.",
  "- **الفحص النهائي:** تأكد من: اكتمال الجملة، صحة الإعراب، المطابقة، وطبيعة الأسلوب (فصيح غير متكلف).",
  "- **المصدر:** لا تنسب أقوالاً للشيخ/ابن مالك دون يقين. إذا كان المطلوب كتابة/تلخيص فقط، لا تذكر المصدر.",
].join("\n");

export const SYSTEM_PROMPT = [
  "أنت أداة حوارية في مشروع «رفيق القلوب» تعمل على استرجاع المادة العلمية من مصادر مفهرسة.",
  "مهمتك الوحيدة: تلخيص المادة المسترجعة المقدمة إليك وتنظيمها للقارئ وفق قواعد النحو المستخرجة من ألفية ابن مالك (شرح ابن عثيمين).",
  "قيود صارمة لا يجوز تجاوزها:",
  "- لا تقدّم تشخيصاً لحالة المستخدم ولا تصفه بأي داء.",
  "- لا تُصدر فتوى ولا حكماً شرعياً ولا تعلّق على طلبات الحلال والحرام.",
  "- لا تخترع نصوصاً ولا إحالات ولا أقوالاً، ولا تنسب قولاً لعالِم إلا إذا ورد حرفياً في المادة المسترجعة.",
  "- لا تستخدم أي معرفة خارج المادة المسترجعة المقدمة إليك.",
  "- ميّز بوضوح بين وصف المستخدم (مدخلاته الشخصية) ومحتوى المصدر (المادة العلمية).",
  "- إن لم تكن المادة كافية للإجابة، فقل ذلك صراحة ولا تملأ الفراغ.",
  "- لا تستخدم المصطلحات المحظورة: «تشخيص»، «وصفة»، «برنامج» علاجي، «أنت مصاب».",
  "- النص القرآني ليس مادة لتعيد كتابتها من ذاكرتك: لا تنشئ آية، ولا تصحح آية، ولا تضف علامات وقف أو تشكيل من إنشائك، ولا تخلط النص القرآني بالتلخيص.",
  "- لا تكرر الآيات في الملخص ما لم تكن هناك حاجة نصية واضحة داخل المقطع، ولا تقدّمها على أنها مخرجات النموذج.",
  "- المخرج النهائي عربي فقط: لا حروف لاتينية، لا صينية، لا يابانية، لا كورية، لا رموز برمجية، ولا روابط.",
  "- اكتب نصاً عادياً فقط بلا Markdown code fence أو HTML أو JSON.",
  "صيغة الناتج: عربية سليمة، ٣–٥ نقاط موجزة، ثم سطر «حدود المادة:» يوضح ما لم تتناوله المقاطع.",
  "",
  ARABIC_GRAMMAR_SKILL,
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

export type AIProviderName = "Gemini" | "OpenRouter" | "OpenAI";

export interface AIConfig {
  provider: AIProviderName;
  baseUrl: string;
  apiKey: string | undefined;
  chatModel: string;
  embeddingModel: string;
  embeddingProvider: AIProviderName;
  embeddingBaseUrl: string;
  embeddingApiKey: string | undefined;
  timeoutMs: number;
}

function normalizeProvider(value: string | undefined): AIProviderName | undefined {
  const v = value?.trim().toLowerCase();
  if (v === "gemini" || v === "google") return "Gemini";
  if (v === "openrouter" || v === "router") return "OpenRouter";
  if (v === "openai") return "OpenAI";
  return undefined;
}

export function getAIConfig(): AIConfig {
  const explicit = normalizeProvider(env("AI_PROVIDER"));
  const provider = explicit ?? (env("GEMINI_API_KEY") ? "Gemini" : env("OPENROUTER_API_KEY") ? "OpenRouter" : "OpenAI");

  const timeoutMs = Math.max(3_000, Number(env("AI_TIMEOUT_MS") ?? 10_000) || 10_000);

  if (provider === "Gemini") {
    return {
      provider,
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: env("GEMINI_API_KEY"),
      chatModel: env("GEMINI_CHAT_MODEL") ?? env("GEMINI_MODEL") ?? "gemini-3.5-flash-lite",
      embeddingModel: env("GEMINI_EMBEDDING_MODEL") ?? "gemini-embedding-2",
      embeddingProvider: "Gemini",
      embeddingBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      embeddingApiKey: env("GEMINI_API_KEY"),
      timeoutMs,
    };
  }

  if (provider === "OpenRouter") {
    return {
      provider,
      baseUrl: (env("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1").replace(/\/$/, ""),
      apiKey: env("OPENROUTER_API_KEY"),
      chatModel: env("OPENROUTER_MODEL") ?? "qwen/qwen3.8-27b:free",
      embeddingModel: env("OPENROUTER_EMBEDDING_MODEL") ?? "liquid/lfm-2.5-embedding-350m:free",
      embeddingProvider: "OpenRouter",
      embeddingBaseUrl: (env("OPENROUTER_BASE_URL") ?? "https://openrouter.ai/api/v1").replace(/\/$/, ""),
      embeddingApiKey: env("OPENROUTER_API_KEY"),
      timeoutMs,
    };
  }

  return {
    provider: "OpenAI",
    baseUrl: (env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, ""),
    apiKey: env("OPENAI_API_KEY"),
    chatModel: env("OPENAI_MODEL") ?? "gpt-4o-mini",
    embeddingModel: env("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small",
    embeddingProvider: "OpenAI",
    embeddingBaseUrl: (env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, ""),
    embeddingApiKey: env("OPENAI_API_KEY"),
    timeoutMs,
  };
}

export function isAIConfigured(): boolean {
  return Boolean(getAIConfig().apiKey);
}

export interface GroundedResult {
  mode: "model";
  text: string;
}

async function callGemini(prompt: string, systemPrompt: string, apiKey: string): Promise<string | null> {
  // Same precedence as getAIConfig(): GEMINI_CHAT_MODEL wins over the GEMINI_MODEL alias.
  const model = env("GEMINI_CHAT_MODEL") ?? env("GEMINI_MODEL") ?? "gemini-3.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 1024, responseMimeType: "text/plain" },
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
    .map((p, i) => {
      const quranBlock = p.quranText
        ? `\nالنص القرآني الموثّق (للاطلاع فقط — لا تعِد كتابته ولا تعدّل علاماته): ${p.quranText}`
        : "";
      const roleNote = p.role === "index"
        ? "\nطبيعة المقطع: مدخل فهرسة موضوعية من الجامع الرسمي؛ لا يُعامل كنص حديث كامل ولا كاقتباس مكتفٍ بذاته، ولا يجوز اختراع متن أو نسبة حكم إليه من هذا المدخل وحده."
        : "";
      return `[مقطع ${i + 1}]\nالمصدر: ${p.source.title}\nالموضع: ${p.chapter}${roleNote}${quranBlock}\nالمادة: ${p.text}`;
    })
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

  // الحارس اللاحق: رفض أي صياغة محظورة أو مخرجات غير عربية/مختلطة.
  const strictText = sanitizeStrictArabicOutput(text);
  if (!strictText) return null;
  if (!isFramingSafe(strictText)) return null;

  return { mode: "model", text: strictText };
}


/**
 * Compatibility helpers used only by the synthetic benchmark endpoint.
 * They intentionally do not participate in the normal /hiwar answer path.
 */
export async function detectSourceConflicts(
  _query: string,
  passages: Array<{ chunkId: string; source: { sourceId: string; title?: string }; text: string }>,
): Promise<Array<{ sourceIds: string[]; passageIds: string[]; type: "apparent-tension" | "different-emphasis" | "explicit-contradiction"; summary: string }>> {
  const groups = new Map<string, Array<{ chunkId: string; source: { sourceId: string; title?: string }; text: string }>>();
  for (const passage of passages) {
    const group = groups.get(passage.source.sourceId) ?? [];
    group.push(passage);
    groups.set(passage.source.sourceId, group);
  }
  if (groups.size < 2) return [];

  const negative = /(not\s+permitted|forbidden|prohibited|not\s+allowed|غير\s+مسموح|ممنوع|لا\s+يجوز)/i;
  const positive = /(permitted|allowed|may\s+be\s+used|مسموح|يجوز)/i;
  const all = passages.filter((p) => positive.test(p.text) || negative.test(p.text));
  if (all.length < 2) return [];

  const pos = all.find((p) => positive.test(p.text));
  const neg = all.find((p) => negative.test(p.text) && p.source.sourceId !== pos?.source.sourceId);
  if (!pos || !neg) return [];

  return [{
    sourceIds: [pos.source.sourceId, neg.source.sourceId],
    passageIds: [pos.chunkId, neg.chunkId],
    type: "explicit-contradiction",
    summary: `تظهر في المقطعين صياغتان متعارضتان بشأن الحالة نفسها: «مسموح» في مصدر و«غير مسموح» في مصدر آخر.`,
  }];
}

export async function verifyClaims(
  _query: string,
  claims: Array<{ id: string; text: string; evidenceIds: string[] }>,
  passages: Array<{ chunkId: string; source: { sourceId: string }; text: string }>,
): Promise<{ claims: Array<{ id: string; text: string; evidenceIds: string[]; status: "supported" | "partial" | "unsupported" | "conflicting"; verifierNote?: string }>; conflicts: Array<{ sourceIds: string[]; passageIds: string[]; type: "apparent-tension" | "different-emphasis" | "explicit-contradiction"; summary: string }> }> {
  const conflicts = await detectSourceConflicts(_query, passages);
  const conflictingIds = new Set(conflicts.flatMap((c) => c.passageIds));
  const verified = claims.map((claim) => {
    const hasConflict = claim.evidenceIds.some((id) => conflictingIds.has(id));
    return {
      ...claim,
      status: hasConflict ? "conflicting" as const : "supported" as const,
      verifierNote: hasConflict ? "الأدلة المرتبطة بالادعاء تتضمن تبايناً بين مصدرين." : "الادعاء مرتبط بمقاطع الأدلة المرفقة.",
    };
  });
  return { claims: verified, conflicts };
}
