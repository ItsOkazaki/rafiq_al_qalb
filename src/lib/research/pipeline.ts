// ─────────────────────────────────────────────────────────────────────────────
// مسار البحث (Pipeline) — الترتيب إلزامي:
// ١) السلامة → ٢) سياسة الفتوى → ٣) فهم الموضوع → ٤) الكلمات → ٥) الاسترجاع
//    → ٦) التنظيم الآلي (نموذج مقيَّد إن وُجد، وإلا المسار الحتمي).
// عند الفشل في أي حلقة: امتناع واضح بدل الاختراع.
// ─────────────────────────────────────────────────────────────────────────────

import { generateGroundedSummary } from "@/lib/ai/provider";
import { buildResearchBrief } from "@/lib/ai/fallback";
import { detectFatwaRequest, FATWA_REFERRAL_MESSAGE } from "@/lib/policy/fatwa";
import { detectPrescriptionRequest, PRESCRIPTION_REFERRAL_MESSAGE } from "@/lib/policy/prescription";
import { extractKeywords } from "@/lib/rag/keywords";
import { identifyTopics, retrievePassages } from "@/lib/rag/retrieve";
import { TOPICS } from "@/lib/rag/topics";
import { detectSafetyRisk, SAFETY_RESPONSE } from "@/lib/safety";
import { normalizeDialect } from "@/lib/text/arabic";
import { ABSTAIN_MESSAGE, REQUIRED_DISCLAIMER } from "@/lib/terminology";
import type { ResearchResult } from "@/lib/types";

const BROWSE_SUGGESTIONS = TOPICS.slice(0, 4).map((t) => ({
  slug: t.slug,
  title: t.title,
}));

export async function runResearch(rawQuery: string): Promise<ResearchResult> {
  const query = (rawQuery ?? "").trim().slice(0, 1000);

  const base: ResearchResult = {
    outcome: "invalid",
    query,
    topics: [],
    keywords: [],
    passages: [],
    ai: { mode: null, text: null },
    disclaimer: REQUIRED_DISCLAIMER,
    message: null,
    safety: null,
    fatwa: null,
    suggestions: [],
  };

  if (!query || query.length < 3) {
    return { ...base, outcome: "invalid", message: "اكتب موضوع البحث الذي تريده." };
  }

  // تطبيع العامية/الدارجة قبل كل الفحوصات.
  const normalizedQuery = normalizeDialect(query);

  // ١) السلامة قبل الاسترجاع.
  if (detectSafetyRisk(normalizedQuery)) {
    return { ...base, outcome: "safety", safety: SAFETY_RESPONSE };
  }

  // ٢) لا فتاوى: إحالة على أهل العلم + تحويل اختياري إلى مسار بحث.
  const fatwa = detectFatwaRequest(normalizedQuery);
  if (fatwa.isFatwa) {
    const related = identifyTopics(normalizedQuery)
      .slice(0, 2)
      .map((m) => ({ slug: m.topic.slug, title: m.topic.title }));
    return {
      ...base,
      outcome: "fatwa",
      message: FATWA_REFERRAL_MESSAGE,
      fatwa: {
        message: FATWA_REFERRAL_MESSAGE,
        matter: fatwa.matter,
        suggestedTopics: related,
      },
      suggestions: related.length > 0 ? related : BROWSE_SUGGESTIONS,
    };
  }

  // ٢ب) لا وصفات شخصية: إحالة لأهل الاختصاص وعرض المادة البحثية.
  if (detectPrescriptionRequest(normalizedQuery)) {
    const related = identifyTopics(normalizedQuery)
      .slice(0, 2)
      .map((m) => ({ slug: m.topic.slug, title: m.topic.title }));
    return {
      ...base,
      outcome: "abstained",
      message: PRESCRIPTION_REFERRAL_MESSAGE,
      suggestions: related.length > 0 ? related : BROWSE_SUGGESTIONS,
    };
  }

  // ٣–٤) فهم الموضوع والكلمات المفتاحية (يستخدم الاستعلام المعيَّر).
  const topics = identifyTopics(normalizedQuery);
  const prelimKeywords = extractKeywords(normalizedQuery, topics, []);

  // ٥) الاسترجاع المضبوط من المصادر المعتمدة فقط.
  const passages = retrievePassages(normalizedQuery, { matchedTopics: topics });

  if (passages.length === 0) {
    return {
      ...base,
      outcome: "abstained",
      topics,
      keywords: prelimKeywords,
      message: ABSTAIN_MESSAGE,
      suggestions: topics.length > 0
        ? topics.map((m) => ({ slug: m.topic.slug, title: m.topic.title }))
        : BROWSE_SUGGESTIONS,
    };
  }

  const keywords = extractKeywords(normalizedQuery, topics, passages);

  // ٦) التنظيم الآلي: مقيَّد بالمادة إن وُجد مزود، وإلا التنظيم الحتمي.
  const grounded = await generateGroundedSummary(query, passages);
  const ai = grounded
    ? { mode: "model" as const, text: grounded.text }
    : { mode: "deterministic" as const, text: buildResearchBrief(topics, passages) };

  return {
    ...base,
    outcome: "ok",
    topics,
    keywords,
    passages,
    ai,
  };
}
