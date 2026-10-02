// ─────────────────────────────────────────────────────────────────────────────
// RAG retrieval: lexical baseline + full-corpus semantic retrieval + hybrid
// fusion + AI re-ranking + deterministic evidence coverage.
// ─────────────────────────────────────────────────────────────────────────────

import { embedRetrievalInputs, cosineSimilarity } from "@/lib/ai/embeddings";
import { getAIConfig, isAIConfigured, isEmbeddingConfigured, rerankPassages } from "@/lib/ai/provider";
import { CHUNKS } from "@/lib/corpus/chunks";
import { TOPICS } from "@/lib/rag/topics";
import { getSourceById, isExcludedSourceTitle, isRetrievableSourceId } from "@/lib/sources/registry";
import { normalizeArabic, tokenizeArabic } from "@/lib/text/arabic";
import type {
  CorpusChunk,
  EvidenceGate,
  ResearchPlan,
  RerankedPassage,
  RetrievedPassage,
  TopicMatch,
} from "@/lib/types";

export const MAX_PASSAGES = 4;
export const MIN_PASSAGE_SCORE = 3;
export const HYBRID_LEXICAL_CANDIDATES = 10;
export const HYBRID_SEMANTIC_CANDIDATES = 10;
export const SEMANTIC_POOL_CANDIDATES = 20;
export const MIN_HYBRID_SCORE = 0.34;
export const SUBQUESTION_SEMANTIC_THRESHOLD = 0.56;

export function identifyTopics(query: string, topics = TOPICS): TopicMatch[] {
  const norm = normalizeArabic(query);
  if (!norm) return [];
  const matches: TopicMatch[] = [];
  for (const topic of topics) {
    let score = 0;
    for (const syn of topic.synonyms) {
      const n = normalizeArabic(syn);
      if (n && norm.includes(n)) score += 2;
    }
    for (const kw of topic.keywords) {
      const n = normalizeArabic(kw);
      if (n && norm.includes(n)) score += 1;
    }
    if (score > 0) matches.push({ topic, score });
  }
  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}

export interface RetrieveOptions {
  matchedTopics?: TopicMatch[];
  limit?: number;
  corpus?: CorpusChunk[];
}

function filterApproved(corpus: CorpusChunk[]): CorpusChunk[] {
  return corpus.filter((c) => {
    if (!isRetrievableSourceId(c.sourceId)) return false;
    const src = getSourceById(c.sourceId);
    if (src && isExcludedSourceTitle(src.title)) return false;
    return true;
  });
}

function sourceMeta(chunk: CorpusChunk) {
  const src = getSourceById(chunk.sourceId);
  if (!src) return null;
  return {
    sourceId: src.id,
    slug: src.slug,
    title: src.title,
    author: src.author,
    publisher: src.publisher,
    registryUrl: src.registryUrl,
    originalUrl: chunk.sourceUrl ?? src.originalUrl,
    verificationUrl: src.verificationUrl,
    verificationLabel: src.verificationLabel,
  };
}

function lexicalParts(query: string, chunk: CorpusChunk, matchedTopics: TopicMatch[]) {
  const norm = normalizeArabic(query);
  const tokens = new Set(tokenizeArabic(query));
  const matchedTopicIds = new Set(matchedTopics.map((m) => m.topic.id));
  let keywordHits = 0;
  for (const kw of chunk.keywords) {
    const n = normalizeArabic(kw);
    if (n && norm.includes(n)) keywordHits += 1;
  }
  const chunkTokens = new Set(tokenizeArabic(chunk.text));
  let tokenHits = 0;
  for (const tk of tokens) if (chunkTokens.has(tk)) tokenHits += 1;
  let topic = 0;
  for (const t of chunk.topics) if (matchedTopicIds.has(t)) topic += 1;

  const raw = topic * 3 + keywordHits * 2 + Math.min(tokenHits, 6);
  return {
    raw,
    lexical: Math.min(1, raw / 11),
    topic: Math.min(1, topic / 2),
  };
}

function toRetrieved(chunk: CorpusChunk, score: number, retrieval?: RetrievedPassage["retrieval"]): RetrievedPassage | null {
  const source = sourceMeta(chunk);
  if (!source) return null;
  return {
    chunkId: chunk.id,
    text: chunk.text,
    chapter: chunk.chapter,
    page: chunk.page,
    citationStatus: chunk.citationStatus ?? "chapter-only",
    excerptType: chunk.excerptType,
    keywords: chunk.keywords,
    score,
    source,
    retrieval,
  };
}

export function retrievePassages(query: string, opts: RetrieveOptions = {}): RetrievedPassage[] {
  const norm = normalizeArabic(query);
  if (!norm) return [];
  const matchedTopics = opts.matchedTopics ?? identifyTopics(query);
  const approved = filterApproved(opts.corpus ?? CHUNKS);
  const scored = approved
    .map((chunk) => ({ chunk, ...lexicalParts(query, chunk, matchedTopics) }))
    .filter((x) => x.raw >= MIN_PASSAGE_SCORE)
    .sort((a, b) => b.raw - a.raw);

  const limit = Math.min(opts.limit ?? MAX_PASSAGES, MAX_PASSAGES);
  const selected: typeof scored = [];
  const selectedIds = new Set<string>();
  const representedSources = new Set<string>();

  for (const item of scored) {
    if (representedSources.has(item.chunk.sourceId)) continue;
    selected.push(item);
    selectedIds.add(item.chunk.id);
    representedSources.add(item.chunk.sourceId);
    if (selected.length >= limit) break;
  }
  if (selected.length < limit) {
    for (const item of scored) {
      if (selectedIds.has(item.chunk.id)) continue;
      selected.push(item);
      selectedIds.add(item.chunk.id);
      if (selected.length >= limit) break;
    }
  }

  return selected
    .map((x, index) =>
      toRetrieved(x.chunk, x.raw, {
        lexical: x.lexical,
        semantic: null,
        topic: x.topic,
        hybrid: x.lexical,
        rerank: null,
        sourceDiversity: index === 0 ? 1 : 0,
      }),
    )
    .filter((x): x is RetrievedPassage => Boolean(x));
}

export interface HybridRetrievalResult {
  passages: RetrievedPassage[];
  baselinePassages: RetrievedPassage[];
  candidateCount: number;
  semanticUsed: boolean;
  reranked: RerankedPassage[];
  evidenceGate: EvidenceGate | null;
  semanticError: string | null;
  rerankError: string | null;
  usedDeterministicFallback: boolean;
}

function safeError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message.slice(0, 220) : fallback;
}

function lexicalCoverage(query: string, chunk: CorpusChunk, matchedTopics: TopicMatch[]): number {
  const parts = lexicalParts(query, chunk, matchedTopics);
  return parts.raw > 0 ? Math.min(1, parts.raw / 8) : 0;
}

function lexicalRankedForPool(query: string, approved: CorpusChunk[], matchedTopics: TopicMatch[]) {
  return approved
    .map((chunk) => ({ chunk, ...lexicalParts(query, chunk, matchedTopics) }))
    .sort((a, b) => b.lexical - a.lexical || b.raw - a.raw);
}

function selectSemanticPool(
  originalQuery: string,
  plan: ResearchPlan,
  approved: CorpusChunk[],
  matchedTopics: TopicMatch[],
  lexicalRanked: ReturnType<typeof lexicalRankedForPool>,
): CorpusChunk[] {
  const selected = new Map<string, CorpusChunk>();
  const add = (chunk: CorpusChunk | undefined) => {
    if (chunk && selected.size < SEMANTIC_POOL_CANDIDATES) selected.set(chunk.id, chunk);
  };
  for (const item of lexicalRanked.slice(0, HYBRID_LEXICAL_CANDIDATES)) add(item.chunk);

  const matchedTopicIds = new Set(matchedTopics.map((m) => m.topic.id));
  const topicRanked = approved
    .filter((chunk) => chunk.topics.some((id) => matchedTopicIds.has(id)))
    .map((chunk) => ({ chunk, score: lexicalParts(originalQuery, chunk, matchedTopics).raw }))
    .sort((a, b) => b.score - a.score);
  for (const item of topicRanked) add(item.chunk);

  for (const term of plan.searchTerms.slice(0, 6)) {
    const termRanked = approved
      .map((chunk) => ({ chunk, score: lexicalParts(term, chunk, matchedTopics).raw }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    for (const item of termRanked.slice(0, 3)) add(item.chunk);
    if (selected.size >= SEMANTIC_POOL_CANDIDATES) break;
  }

  if (selected.size === 0) for (const chunk of approved.slice(0, SEMANTIC_POOL_CANDIDATES)) add(chunk);
  return [...selected.values()];
}

function deterministicRank(
  originalQuery: string,
  candidates: RetrievedPassage[],
  matchedTopics: TopicMatch[],
): { ranked: RerankedPassage[]; gate: EvidenceGate } {
  const ranked = candidates
    .map((p) => {
      const chunk: CorpusChunk = {
        id: p.chunkId, sourceId: p.source.sourceId, chapter: p.chapter, page: p.page,
        sourceUrl: p.source.originalUrl, citationStatus: p.citationStatus,
        excerptType: p.excerptType ?? "curated-summary", topics: [], keywords: p.keywords, text: p.text,
      };
      const relevance = Math.max(0.22, Math.min(0.95, lexicalCoverage(originalQuery, chunk, matchedTopics) * 0.8 + (p.retrieval?.hybrid ?? 0) * 0.2));
      return { chunkId: p.chunkId, relevance, supports: [], reason: "ترتيب حتمي احتياطي من المطابقة اللفظية والموضوعية فقط." } satisfies RerankedPassage;
    })
    .sort((a, b) => b.relevance - a.relevance);
  const top = ranked[0]?.relevance ?? 0;
  return {
    ranked,
    gate: {
      sufficient: top >= 0.58, confidence: top, coveredSubquestions: ranked.length ? 1 : 0, totalSubquestions: 1,
      missingSubquestions: ranked.length ? [] : [originalQuery],
      notes: "استخدم النظام ترتيباً حتمياً احتياطياً لأن إعادة ترتيب AI لم تتوفر.",
    },
  };
}

/**
 * Resilient retrieval: token-friendly lexical/topic retrieval is the default on
 * free-tier Gemini; embeddings are optional, and all AI failures degrade to the
 * same approved corpus rather than becoming a total application failure.
 */
export async function retrievePassagesHybrid(
  originalQuery: string,
  plan: ResearchPlan,
  opts: RetrieveOptions = {},
): Promise<HybridRetrievalResult> {
  const matchedTopics = opts.matchedTopics ?? identifyTopics(originalQuery);
  const baseline = retrievePassages(originalQuery, { ...opts, matchedTopics, limit: MAX_PASSAGES });
  const approved = filterApproved(opts.corpus ?? CHUNKS);
  const lexicalRanked = lexicalRankedForPool(originalQuery, approved, matchedTopics);
  const candidateCount = approved.length;
  const emptyResult = (patch: Partial<HybridRetrievalResult>): HybridRetrievalResult => ({
    passages: [], baselinePassages: baseline, candidateCount, semanticUsed: false, reranked: [], evidenceGate: null,
    semanticError: null, rerankError: null, usedDeterministicFallback: false, ...patch,
  });

  if (!isAIConfigured()) return emptyResult({ semanticError: "AI provider is not configured" });

  let semanticUsed = false;
  let semanticError: string | null = null;
  let semanticRanked: Array<{ chunk: CorpusChunk; lexical: number; semantic: number; topic: number; hybrid: number; raw: number }> = [];
  const semanticPool = selectSemanticPool(originalQuery, plan, approved, matchedTopics, lexicalRanked);

  const config = getAIConfig();
  const embeddingsEnabled = config.useEmbeddings && isEmbeddingConfigured() && semanticPool.length > 0;
  if (embeddingsEnabled) {
    try {
      const embedded = await embedRetrievalInputs({
        query: plan.semanticQuery || originalQuery,
        documents: semanticPool.map((x) => ({ text: x.text, title: getSourceById(x.sourceId)?.title })),
      });
      semanticRanked = semanticPool.map((chunk, index) => {
        const parts = lexicalParts(originalQuery, chunk, matchedTopics);
        const vector = embedded.documents[index];
        if (!vector) throw new Error(`Missing semantic vector for ${chunk.id}`);
        const semantic = Math.max(0, (cosineSimilarity(embedded.query, vector) + 1) / 2);
        return { chunk, ...parts, semantic, hybrid: parts.lexical * 0.42 + semantic * 0.43 + parts.topic * 0.15 };
      }).sort((a, b) => b.hybrid - a.hybrid).slice(0, HYBRID_SEMANTIC_CANDIDATES);
      semanticUsed = true;
    } catch (error) {
      semanticError = safeError(error, "SEMANTIC_RETRIEVAL_FAILED");
    }
  } else {
    semanticError = !config.useEmbeddings
      ? "SEMANTIC_DISABLED_TOKEN_SAVER"
      : isEmbeddingConfigured()
        ? "SEMANTIC_POOL_EMPTY"
        : "EMBEDDING_NOT_CONFIGURED";
  }

  const lexicalFallback = lexicalRanked.slice(0, Math.max(configuredRerankCandidates(), HYBRID_LEXICAL_CANDIDATES)).map((x) => ({
    chunk: x.chunk, lexical: x.lexical, semantic: 0, topic: x.topic, hybrid: x.lexical * 0.78 + x.topic * 0.22, raw: x.raw,
  }));
  const poolRanked = semanticUsed ? semanticRanked : lexicalFallback;
  const combined = new Map<string, typeof poolRanked[number]>();
  for (const item of [...poolRanked, ...lexicalFallback]) combined.set(item.chunk.id, item);
  let candidates = [...combined.values()].filter((x) => x.hybrid >= MIN_HYBRID_SCORE).sort((a, b) => b.hybrid - a.hybrid).slice(0, Math.max(configuredRerankCandidates(), HYBRID_LEXICAL_CANDIDATES));
  if (candidates.length === 0) candidates = [...combined.values()].sort((a, b) => b.hybrid - a.hybrid).slice(0, Math.max(4, configuredRerankCandidates()));

  const candidatePassages = candidates.map((x) => toRetrieved(x.chunk, x.hybrid, { lexical: x.lexical, semantic: semanticUsed ? x.semantic : null, topic: x.topic, hybrid: x.hybrid, rerank: null, sourceDiversity: 0 })).filter((x): x is RetrievedPassage => Boolean(x));
  if (candidatePassages.length === 0) return emptyResult({ semanticUsed, semanticError, usedDeterministicFallback: true });

  let ranked: RerankedPassage[];
  let aiGate: EvidenceGate;
  let rerankError: string | null = null;
  let usedDeterministicFallback = false;
  try {
    const reranked = await rerankPassages(plan, candidatePassages.slice(0, config.rerankCandidates));
    ranked = reranked.ranked;
    aiGate = reranked.gate;
  } catch (error) {
    rerankError = safeError(error, "RERANK_FAILED");
    const fallback = deterministicRank(originalQuery, candidatePassages, matchedTopics);
    ranked = fallback.ranked;
    aiGate = fallback.gate;
    usedDeterministicFallback = true;
  }

  const rerankMap = new Map(ranked.map((r) => [r.chunkId, r]));
  const top = candidatePassages.map((p) => ({ p, r: rerankMap.get(p.chunkId) })).filter((x): x is { p: RetrievedPassage; r: RerankedPassage } => Boolean(x.r)).sort((a, b) => b.r.relevance - a.r.relevance);
  const limit = Math.min(opts.limit ?? getAIConfig().finalPassages, MAX_PASSAGES);
  const selected: RetrievedPassage[] = [];
  const seenSources = new Set<string>();
  const seenIds = new Set<string>();
  for (const { p, r } of top) {
    if (seenSources.has(p.source.sourceId)) continue;
    selected.push({ ...p, score: r.relevance, retrieval: { ...p.retrieval!, rerank: r.relevance, sourceDiversity: 1 } });
    seenSources.add(p.source.sourceId); seenIds.add(p.chunkId);
    if (selected.length >= limit) break;
  }
  if (selected.length < limit) for (const { p, r } of top) {
    if (seenIds.has(p.chunkId)) continue;
    selected.push({ ...p, score: r.relevance, retrieval: { ...p.retrieval!, rerank: r.relevance, sourceDiversity: 0 } });
    seenIds.add(p.chunkId);
    if (selected.length >= limit) break;
  }

  const subquestions = plan.subquestions.length ? plan.subquestions.slice(0, 3) : [originalQuery];
  const coverageScores = subquestions.map((subquestion) => Math.max(0, ...candidatePassages.map((p) => lexicalCoverage(subquestion, {
    id: p.chunkId, sourceId: p.source.sourceId, chapter: p.chapter, page: p.page, sourceUrl: p.source.originalUrl, citationStatus: p.citationStatus,
    excerptType: p.excerptType ?? "curated-summary", topics: [], keywords: p.keywords, text: p.text,
  }, matchedTopics))));
  const covered = coverageScores.filter((score) => score >= 0.25).length;
  const coverage = coverageScores.length ? covered / coverageScores.length : 0;
  const topRerank = ranked[0]?.relevance ?? 0;
  const aiConfidence = clamp01(aiGate.confidence);
  const deterministicConfidence = Math.max(0, Math.min(1, coverageScores.length ? (coverageScores.reduce((a, b) => a + b, 0) / coverageScores.length) * 0.55 + topRerank * 0.45 : topRerank));
  const modelCoveragePass = aiGate.coveredSubquestions >= subquestions.length;
  const deterministicPass = (covered >= subquestions.length || modelCoveragePass) && topRerank >= 0.50 && deterministicConfidence >= 0.48;
  const evidenceGate: EvidenceGate = {
    sufficient: Boolean(aiGate.sufficient) && deterministicPass, confidence: deterministicConfidence, aiConfidence, semanticCoverage: coverage,
    coveredSubquestions: covered, totalSubquestions: subquestions.length,
    missingSubquestions: coverageScores.map((score, i) => score >= 0.25 ? null : subquestions[i]).filter((x): x is string => Boolean(x)),
    notes: [aiGate.notes, `AI gate: ${aiGate.sufficient ? "pass" : "fail"}`, `Coverage: ${covered}/${subquestions.length}`, `Top rerank: ${topRerank.toFixed(2)}`,
      semanticError ? `Semantic fallback: ${semanticError}` : "Semantic retrieval: ready", rerankError ? `Rerank fallback: ${rerankError}` : "Rerank: ready"].filter(Boolean).join(" | ").slice(0, 700),
  };

  return { passages: selected, baselinePassages: baseline, candidateCount: combined.size, semanticUsed, reranked: ranked, evidenceGate, semanticError, rerankError, usedDeterministicFallback };
}

function configuredRerankCandidates(): number {
  try { return Math.min(10, Math.max(4, getAIConfig().rerankCandidates || 8)); } catch { return 8; }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n > 1 && n <= 100) return n / 100;
  return Math.max(0, Math.min(1, n));
}
