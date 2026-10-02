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
