// ─────────────────────────────────────────────────────────────────────────────
// RAG retrieval: lexical baseline + full-corpus semantic retrieval + hybrid
// fusion + AI re-ranking + deterministic evidence coverage.
// ─────────────────────────────────────────────────────────────────────────────

import { embedTexts, cosineSimilarity } from "@/lib/ai/embeddings";
import { getAIConfig, isAIConfigured, rerankPassages } from "@/lib/ai/provider";
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
export const HYBRID_SEMANTIC_CANDIDATES = 14;
export const MIN_HYBRID_SCORE = 0.38;
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
}

/**
 * True hybrid retrieval:
 * - lexical candidates are selected from the entire approved corpus;
 * - semantic candidates are also selected from the entire approved corpus;
 * - their union is fused before AI re-ranking;
 * - subquestion coverage is checked independently from the model's own gate.
 */
export async function retrievePassagesHybrid(
  originalQuery: string,
  plan: ResearchPlan,
  opts: RetrieveOptions = {},
): Promise<HybridRetrievalResult> {
  const matchedTopics = opts.matchedTopics ?? identifyTopics(originalQuery);
  const baseline = retrievePassages(originalQuery, { ...opts, matchedTopics, limit: MAX_PASSAGES });
  const approved = filterApproved(opts.corpus ?? CHUNKS);
  const lexicalRanked = approved
    .map((chunk) => ({ chunk, ...lexicalParts(originalQuery, chunk, matchedTopics) }))
    .sort((a, b) => b.lexical - a.lexical);

  const lexicalTop = lexicalRanked.slice(0, HYBRID_LEXICAL_CANDIDATES);
  const candidateCountBeforeUnion = lexicalRanked.length;

  if (!isAIConfigured()) {
    return {
      passages: [],
      baselinePassages: baseline,
      candidateCount: candidateCountBeforeUnion,
      semanticUsed: false,
      reranked: [],
      evidenceGate: null,
    };
  }

  // One batch serves both semantic ranking and, through cache, later subquestion checks.
  const embeddingInputs = [plan.semanticQuery || originalQuery, ...approved.map((x) => x.text)];
  const vectors = await embedTexts(embeddingInputs);
  if (!vectors) {
    return {
      passages: [],
      baselinePassages: baseline,
      candidateCount: candidateCountBeforeUnion,
      semanticUsed: false,
      reranked: [],
      evidenceGate: null,
    };
  }

  const queryVector = vectors[0];
  const semanticRanked = approved
    .map((chunk, index) => {
      const parts = lexicalParts(originalQuery, chunk, matchedTopics);
      const semantic = Math.max(0, (cosineSimilarity(queryVector, vectors[index + 1]) + 1) / 2);
      return {
        chunk,
        ...parts,
        semantic,
        hybrid: parts.lexical * 0.40 + semantic * 0.45 + parts.topic * 0.15,
      };
    })
    .sort((a, b) => b.semantic - a.semantic)
    .slice(0, HYBRID_SEMANTIC_CANDIDATES);

  const byId = new Map<string, (typeof semanticRanked)[number]>();
  for (const item of [...lexicalTop, ...semanticRanked]) {
    const full = approved.find((c) => c.id === item.chunk.id);
    const semanticItem = semanticRanked.find((x) => x.chunk.id === item.chunk.id);
    if (full && semanticItem) byId.set(item.chunk.id, semanticItem);
  }

  const candidates = [...byId.values()]
    .filter((x) => x.hybrid >= MIN_HYBRID_SCORE)
    .sort((a, b) => b.hybrid - a.hybrid);

  const candidatePassages = candidates
    .map((x) =>
      toRetrieved(x.chunk, x.hybrid, {
        lexical: x.lexical,
        semantic: x.semantic,
        topic: x.topic,
        hybrid: x.hybrid,
        rerank: null,
        sourceDiversity: 0,
      }),
    )
    .filter((x): x is RetrievedPassage => Boolean(x));

  if (candidatePassages.length === 0) {
    return {
      passages: [],
      baselinePassages: baseline,
      candidateCount: candidateCountBeforeUnion,
      semanticUsed: true,
      reranked: [],
      evidenceGate: null,
    };
  }

  const config = getAIConfig();
  const { ranked, gate: aiGate } = await rerankPassages(plan, candidatePassages.slice(0, config.rerankCandidates));
  const rerankMap = new Map(ranked.map((r) => [r.chunkId, r]));
  const top = [...candidatePassages]
    .map((p) => ({ p, r: rerankMap.get(p.chunkId) }))
    .filter((x) => x.r)
    .sort((a, b) => (b.r?.relevance ?? 0) - (a.r?.relevance ?? 0));

  const limit = Math.min(opts.limit ?? config.finalPassages, MAX_PASSAGES);
  const selected: RetrievedPassage[] = [];
  const seenSources = new Set<string>();
  const seenIds = new Set<string>();

  for (const { p, r } of top) {
    if (!r || seenSources.has(p.source.sourceId)) continue;
    selected.push({
      ...p,
      score: r.relevance,
      retrieval: { ...p.retrieval!, rerank: r.relevance, sourceDiversity: 1 },
    });
    seenSources.add(p.source.sourceId);
    seenIds.add(p.chunkId);
    if (selected.length >= limit) break;
  }
  if (selected.length < limit) {
    for (const { p, r } of top) {
      if (!r || seenIds.has(p.chunkId)) continue;
      selected.push({
        ...p,
        score: r.relevance,
        retrieval: { ...p.retrieval!, rerank: r.relevance, sourceDiversity: 0 },
      });
      seenIds.add(p.chunkId);
      if (selected.length >= limit) break;
    }
  }

  // Independent semantic coverage check across each planned subquestion.
  const subquestions = plan.subquestions.length > 0 ? plan.subquestions.slice(0, 4) : [originalQuery];
  const subquestionVectors = await embedTexts(subquestions);
  const coverageScores = subquestionVectors
    ? subquestionVectors.map((subVector) =>
        Math.max(
          0,
          ...candidatePassages.map((p) => {
            const item = semanticRanked.find((x) => x.chunk.id === p.chunkId);
            if (!item) return 0;
            const fullIndex = approved.findIndex((c) => c.id === p.chunkId);
            return fullIndex >= 0 ? Math.max(0, (cosineSimilarity(subVector, vectors[fullIndex + 1]) + 1) / 2) : 0;
          }),
        ),
      )
    : [];

  const semanticCovered = coverageScores.length
    ? coverageScores.filter((score) => score >= SUBQUESTION_SEMANTIC_THRESHOLD).length
    : 0;
  const semanticCoverage = coverageScores.length ? semanticCovered / coverageScores.length : 0;
  const topRerank = ranked[0]?.relevance ?? 0;
  const aiConfidence = clamp01(aiGate.confidence);
  const deterministicConfidence =
    coverageScores.length > 0
      ? Math.max(0, Math.min(1, coverageScores.reduce((a, b) => a + b, 0) / coverageScores.length * 0.55 + topRerank * 0.45))
      : topRerank;
  const coveragePass = semanticCovered >= subquestions.length;
  const deterministicPass = coveragePass && topRerank >= 0.55 && deterministicConfidence >= 0.58;

  const evidenceGate: EvidenceGate = {
    sufficient: Boolean(aiGate.sufficient) && deterministicPass,
    confidence: deterministicConfidence,
    aiConfidence,
    semanticCoverage,
    coveredSubquestions: semanticCovered,
    totalSubquestions: subquestions.length,
    missingSubquestions: coverageScores
      .map((score, index) => (score >= SUBQUESTION_SEMANTIC_THRESHOLD ? null : subquestions[index]))
      .filter((x): x is string => Boolean(x))
      .slice(0, 4),
    notes: [
      aiGate.notes,
      `AI gate: ${aiGate.sufficient ? "pass" : "fail"}`,
      `Semantic coverage: ${semanticCovered}/${subquestions.length}`,
      `Top rerank: ${topRerank.toFixed(2)}`,
    ]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 500),
  };

  return {
    passages: selected,
    baselinePassages: baseline,
    candidateCount: byId.size,
    semanticUsed: true,
    reranked: ranked,
    evidenceGate,
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n > 1 && n <= 100) return n / 100;
  return Math.max(0, Math.min(1, n));
}
