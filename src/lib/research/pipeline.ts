// ─────────────────────────────────────────────────────────────────────────────
// المسار الإنتاجي: AI-first, evidence-gated.
// AI يشارك في فهم الاستعلام، البحث الدلالي، إعادة الترتيب، صياغة الادعاءات،
// والتحقق النهائي. أما القواعد الحتمية فتظل حواجز سلامة ومصدر ثقة.
// ─────────────────────────────────────────────────────────────────────────────

import { isFramingSafe } from "@/lib/terminology";
import { buildResearchBrief } from "@/lib/ai/fallback";
import {
  detectSourceConflicts,
  generateClaimAnswer,
  getAIConfig,
  isAIConfigured,
  planResearch,
  verifyClaims,
} from "@/lib/ai/provider";
import { detectFatwaRequest, FATWA_REFERRAL_MESSAGE } from "@/lib/policy/fatwa";
import { detectPrescriptionRequest, PRESCRIPTION_REFERRAL_MESSAGE } from "@/lib/policy/prescription";
import { extractKeywords } from "@/lib/rag/keywords";
import { identifyTopics, retrievePassages, retrievePassagesHybrid } from "@/lib/rag/retrieve";
import { TOPICS } from "@/lib/rag/topics";
import { detectSafetyRisk, SAFETY_RESPONSE } from "@/lib/safety";
import { normalizeDialect } from "@/lib/text/arabic";
import { ABSTAIN_MESSAGE, REQUIRED_DISCLAIMER } from "@/lib/terminology";
import type { AIDiagnostics, AnswerClaim, ResearchPlan, ResearchResult } from "@/lib/types";

const BROWSE_SUGGESTIONS = TOPICS.slice(0, 4).map((t) => ({ slug: t.slug, title: t.title }));

const EMPTY_PLAN: ResearchPlan = {
  intent: "research",
  audience: "general",
  semanticQuery: "",
  subquestions: [],
  searchTerms: [],
};

function emptyDiagnostics(overrides: Partial<AIDiagnostics> = {}): AIDiagnostics {
  return {
    provider: getAIConfig().provider,
    chatModel: null,
    embeddingModel: null,
    aiConfigured: isAIConfigured(),
    pipeline: [],
    plan: null,
    candidateCount: 0,
    semanticRetrievalUsed: false,
    baselineTopIds: [],
    hybridTopIds: [],
    reranked: [],
    evidenceGate: null,
    claims: [],
    conflicts: [],
    verifiedClaimCount: 0,
    totalClaimCount: 0,
    latencyMs: null,
    degradedReason: null,
    semanticError: null,
    rerankError: null,
    usedDeterministicFallback: false,
    ...overrides,
  };
}

function finalText(claims: AnswerClaim[], limits: string[], passages: ResearchResult["passages"]): string {
  const supported = claims.filter((c) => c.status === "supported");
  const evidenceNumber = new Map(passages.map((p, i) => [p.chunkId, i + 1]));
  const lines = supported.map((c, i) => {
    const refs = c.evidenceIds
      .map((id) => evidenceNumber.get(id))
      .filter((n): n is number => typeof n === "number")
      .map((n) => `الدليل ${n}`);
    return `${i + 1}. ${c.text} [${refs.join("، ")}]`;
  });
  if (limits.length > 0) {
    lines.push("", "حدود المادة:", ...limits.map((l) => `• ${l}`));
  }
  return lines.join("\n");
}

function envFlag(name: string): boolean {
  const value = typeof process !== "undefined" ? process.env[name] : undefined;
  return value === "1" || value === "true" || value === "yes";
}

export interface RunResearchOptions {
  mode?: "ai" | "baseline";
  audience?: ResearchPlan["audience"];
}

export async function runResearch(rawQuery: string, options: RunResearchOptions = {}): Promise<ResearchResult> {
  const started = Date.now();
  const query = (rawQuery ?? "").trim().slice(0, 1000);
  const mode = options.mode ?? "ai";

  const base: ResearchResult = {
    outcome: "invalid",
    query,
    topics: [],
    keywords: [],
    passages: [],
    ai: { mode: null, text: null },
    diagnostics: emptyDiagnostics(),
    disclaimer: REQUIRED_DISCLAIMER,
    message: null,
    safety: null,
    fatwa: null,
    suggestions: [],
  };

  if (!query || query.length < 3) {
    return { ...base, outcome: "invalid", message: "اكتب موضوع البحث الذي تريده." };
  }

  const normalizedQuery = normalizeDialect(query);
  const topics = identifyTopics(normalizedQuery);
  const prelimKeywords = extractKeywords(normalizedQuery, topics, []);

  if (detectSafetyRisk(normalizedQuery)) {
    return {
      ...base,
      outcome: "safety",
      safety: SAFETY_RESPONSE,
      diagnostics: emptyDiagnostics({ pipeline: ["policy:safety"] , latencyMs: Date.now() - started }),
    };
  }

  const fatwa = detectFatwaRequest(normalizedQuery);
  if (fatwa.isFatwa) {
    const related = topics.slice(0, 2).map((m) => ({ slug: m.topic.slug, title: m.topic.title }));
    return {
      ...base,
      outcome: "fatwa",
      topics,
      keywords: prelimKeywords,
      message: FATWA_REFERRAL_MESSAGE,
      fatwa: { message: FATWA_REFERRAL_MESSAGE, matter: fatwa.matter, suggestedTopics: related },
      suggestions: related.length > 0 ? related : BROWSE_SUGGESTIONS,
      diagnostics: emptyDiagnostics({ pipeline: ["policy:fatwa-referral"], latencyMs: Date.now() - started }),
    };
  }

  if (detectPrescriptionRequest(normalizedQuery)) {
    const related = topics.slice(0, 2).map((m) => ({ slug: m.topic.slug, title: m.topic.title }));
    return {
      ...base,
      outcome: "abstained",
      topics,
      keywords: prelimKeywords,
      message: PRESCRIPTION_REFERRAL_MESSAGE,
      suggestions: related.length > 0 ? related : BROWSE_SUGGESTIONS,
      diagnostics: emptyDiagnostics({ pipeline: ["policy:prescription-referral"], latencyMs: Date.now() - started }),
    };
  }

  if (mode === "baseline") {
    const passages = retrievePassages(normalizedQuery, { matchedTopics: topics });
    const keywords = extractKeywords(normalizedQuery, topics, passages);
    const diagnostics = emptyDiagnostics({
      provider: "Deterministic baseline",
      pipeline: ["baseline:topic", "baseline:keyword", "baseline:token-overlap"],
      baselineTopIds: passages.map((p) => p.chunkId),
      hybridTopIds: passages.map((p) => p.chunkId),
      candidateCount: passages.length,
      latencyMs: Date.now() - started,
      degradedReason: "Benchmark comparator only",
    });

    if (passages.length === 0) {
      return {
        ...base,
        outcome: "abstained",
        topics,
        keywords,
        message: ABSTAIN_MESSAGE,
        suggestions: topics.length > 0 ? topics.map((m) => ({ slug: m.topic.slug, title: m.topic.title })) : BROWSE_SUGGESTIONS,
        diagnostics,
      };
    }

    return {
      ...base,
      outcome: "ok",
      topics,
      keywords,
      passages,
      ai: { mode: "baseline", text: buildResearchBrief(topics, passages) },
      diagnostics,
    };
  }

  if (!isAIConfigured()) {
    const baseline = retrievePassages(normalizedQuery, { matchedTopics: topics });
    return {
      ...base,
      outcome: "ai-unavailable",
      topics,
      keywords: prelimKeywords,
      passages: baseline,
      message: "المسار الحواري بالذكاء الاصطناعي غير مهيأ في بيئة التشغيل. شغّل Gemini أو OpenRouter أو OpenAI عبر متغيرات البيئة ثم أعد المحاولة.",
      diagnostics: emptyDiagnostics({
        pipeline: ["policy", "ai:configuration-check", "fallback:evidence-browser"],
        baselineTopIds: baseline.map((p) => p.chunkId),
        hybridTopIds: [],
        candidateCount: baseline.length,
        degradedReason: "AI provider is not configured",
        latencyMs: Date.now() - started,
      }),
      suggestions: topics.length > 0 ? topics.map((m) => ({ slug: m.topic.slug, title: m.topic.title })) : BROWSE_SUGGESTIONS,
    };
  }

  const aiConfig = getAIConfig();
  const diagnostics = emptyDiagnostics({
    chatModel: aiConfig.chatModel,
    embeddingModel: aiConfig.embeddingModel,
    pipeline: [
      "policy:safety+fatwa",
      aiConfig.plannerMode === "local" ? "ai:local-query-plan" : "ai:research-planner",
    ],
  });

  try {
    const plan = await planResearch(query, options.audience ?? "general");
    diagnostics.plan = {
      ...EMPTY_PLAN,
      ...plan,
      semanticQuery: String(plan.semanticQuery ?? query).slice(0, 900),
      subquestions: Array.isArray(plan.subquestions) ? plan.subquestions.slice(0, 4) : [query],
      searchTerms: Array.isArray(plan.searchTerms) ? plan.searchTerms.slice(0, 10) : prelimKeywords.slice(0, 10),
    };
    diagnostics.pipeline.push("ai:hybrid-retrieval");

    const hybrid = await retrievePassagesHybrid(
      normalizedQuery,
      diagnostics.plan,
      { matchedTopics: topics },
    );

    diagnostics.candidateCount = hybrid.candidateCount;
    diagnostics.semanticRetrievalUsed = hybrid.semanticUsed;
    diagnostics.baselineTopIds = hybrid.baselinePassages.map((p) => p.chunkId);
    diagnostics.hybridTopIds = hybrid.passages.map((p) => p.chunkId);
    diagnostics.reranked = hybrid.reranked;
    diagnostics.semanticError = hybrid.semanticError;
    diagnostics.rerankError = hybrid.rerankError;
    diagnostics.usedDeterministicFallback = hybrid.usedDeterministicFallback;

    const semanticActuallyFailed = Boolean(hybrid.semanticError && hybrid.semanticError !== "SEMANTIC_DISABLED_TOKEN_SAVER");
    if (semanticActuallyFailed) diagnostics.pipeline.push("ai:semantic-degraded");
    if (hybrid.rerankError) diagnostics.pipeline.push("ai:rerank-degraded");
    if (hybrid.usedDeterministicFallback) diagnostics.pipeline.push("ai:deterministic-fallback");
    diagnostics.degradedReason = hybrid.rerankError || (semanticActuallyFailed ? hybrid.semanticError : null);

    if (hybrid.passages.length === 0) {
      const fallback = hybrid.baselinePassages;
      return {
        ...base,
        outcome: fallback.length > 0 ? "abstained" : "ai-unavailable",
        topics,
        keywords: extractKeywords(normalizedQuery, topics, fallback),
        passages: fallback,
        message: fallback.length > 0
          ? "وجد النظام مادة معتمدة، لكنه لم يحصل على دليل كافٍ لتمريرها عبر بوابة التحقق؛ لذلك امتنع عن توليد إجابة."
          : "تعذر تشغيل مكونات البحث بالذكاء الاصطناعي ولم تُوجد مادة كافية في البحث الحتمي.",
        diagnostics: {
          ...diagnostics,
          pipeline: [...diagnostics.pipeline, "ai:no-final-passages", "fallback:evidence-browser"],
          latencyMs: Date.now() - started,
        },
        suggestions: topics.length > 0 ? topics.map((m) => ({ slug: m.topic.slug, title: m.topic.title })) : BROWSE_SUGGESTIONS,
      };
    }

    diagnostics.pipeline.push("ai:evidence-gate");
    const topRelevance = hybrid.reranked[0]?.relevance ?? 0;
    const gate = hybrid.evidenceGate;
    if (!gate) {
      throw new Error("Evidence gate did not return a result");
    }
    const strictConfidence = gate.confidence >= 0.68 && topRelevance >= 0.55;
    const groundedFallbackConfidence = Boolean(hybrid.semanticError) && (gate.aiConfidence ?? 0) >= 0.80 && gate.confidence >= 0.48 && topRelevance >= 0.55;
    const deterministicEnough = gate.coveredSubquestions >= gate.totalSubquestions && (strictConfidence || groundedFallbackConfidence);
    gate.sufficient = gate.sufficient && deterministicEnough;
    diagnostics.evidenceGate = gate;

    if (!gate.sufficient) {
      diagnostics.pipeline.push("evidence:insufficient", "abstention:grounded");
      return {
        ...base,
        outcome: "abstained",
        topics,
        keywords: extractKeywords(normalizedQuery, topics, hybrid.passages),
        passages: hybrid.passages,
        message: "فهم النظام موضوع البحث، لكنه لم يجد دليلاً كافياً يغطي جميع جوانبه من المصادر المعتمدة؛ لذلك امتنع عن توليد إجابة.",
        diagnostics: {
          ...diagnostics,
          latencyMs: Date.now() - started,
        },
        suggestions: topics.length > 0 ? topics.map((m) => ({ slug: m.topic.slug, title: m.topic.title })) : BROWSE_SUGGESTIONS,
      };
    }

    diagnostics.pipeline.push("ai:claim-generation");
    const draft = await generateClaimAnswer(query, diagnostics.plan!, hybrid.passages);
    diagnostics.totalClaimCount = draft.claims.length;

    if (draft.claims.length === 0) {
      return {
        ...base,
        outcome: "abstained",
        topics,
        keywords: extractKeywords(normalizedQuery, topics, hybrid.passages),
        passages: hybrid.passages,
        message: "تعذر صياغة ادعاءات قابلة للإسناد إلى الأدلة المسترجعة؛ امتنع النظام عن ملء الفراغ.",
        diagnostics: { ...diagnostics, pipeline: [...diagnostics.pipeline, "abstention:no-grounded-claims"], latencyMs: Date.now() - started },
        suggestions: topics.length > 0 ? topics.map((m) => ({ slug: m.topic.slug, title: m.topic.title })) : BROWSE_SUGGESTIONS,
      };
    }

    const checked = await verifyClaims(query, draft.claims, hybrid.passages);
    diagnostics.claims = checked.claims;
    diagnostics.pipeline.push("ai:claim-verification");

    // Independent pass: detect source-to-source tension even when no generated claim
    // happens to cite both passages. It never decides which source is correct.
    const independentConflicts = envFlag("AI_INDEPENDENT_CONFLICTS")
      ? await detectSourceConflicts(query, hybrid.passages)
      : [];
    if (independentConflicts.length > 0) diagnostics.pipeline.push("ai:conflict-detection");
    diagnostics.conflicts = [...checked.conflicts, ...independentConflicts]
      .filter((c, index, all) => all.findIndex((x) => x.summary === c.summary) === index);
    diagnostics.verifiedClaimCount = checked.claims.filter((c) => c.status === "supported").length;

    const text = finalText(checked.claims, draft.limits, hybrid.passages);
    const safe = isFramingSafe(text);
    if (!safe || diagnostics.verifiedClaimCount === 0) {
      return {
        ...base,
        outcome: "abstained",
        topics,
        keywords: extractKeywords(normalizedQuery, topics, hybrid.passages),
        passages: hybrid.passages,
        message: "لم تمر الإجابة عبر بوابة التحقق النهائي بدرجة تسمح بعرضها؛ لذلك امتنع النظام عن توليدها.",
        diagnostics: {
          ...diagnostics,
          pipeline: [...diagnostics.pipeline, "verification:failed", "abstention:verified-claims-zero"],
          latencyMs: Date.now() - started,
        },
        suggestions: topics.length > 0 ? topics.map((m) => ({ slug: m.topic.slug, title: m.topic.title })) : BROWSE_SUGGESTIONS,
      };
    }

    return {
      ...base,
      outcome: "ok",
      topics,
      keywords: extractKeywords(normalizedQuery, topics, hybrid.passages),
      passages: hybrid.passages,
      ai: { mode: "evidence-gated", text },
      diagnostics: {
        ...diagnostics,
        pipeline: [...diagnostics.pipeline, "answer:verified"],
        latencyMs: Date.now() - started,
      },
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message.slice(0, 240) : "unknown AI pipeline error";
    const baseline = retrievePassages(normalizedQuery, { matchedTopics: topics });
    return {
      ...base,
      outcome: "ai-unavailable",
      topics,
      keywords: extractKeywords(normalizedQuery, topics, baseline),
      passages: baseline,
      message: "توقف أحد مكونات مسار الذكاء الاصطناعي قبل اجتياز التحقق، لذلك لم نعرض إجابة مولّدة. يمكنك مراجعة الأدلة المسترجعة مباشرة.",
      diagnostics: {
        ...diagnostics,
        pipeline: [...diagnostics.pipeline, "ai:pipeline-error", "fallback:evidence-browser"],
        degradedReason: reason,
        baselineTopIds: baseline.map((p) => p.chunkId),
        latencyMs: Date.now() - started,
      },
      suggestions: topics.length > 0 ? topics.map((m) => ({ slug: m.topic.slug, title: m.topic.title })) : BROWSE_SUGGESTIONS,
    };
  }
}
