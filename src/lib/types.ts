// ─────────────────────────────────────────────────────────────────────────────
// رفيق القلوب — الأنواع العامة
// Evidence-Gated AI Research: فهم → استرجاع → إعادة ترتيب → بوابة دليل → تحقق.
// ─────────────────────────────────────────────────────────────────────────────

export type SourceStatus = "active" | "registered-pending";

export interface RegisteredSource {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  publisher: string;
  registryUrl: string;
  originalUrl: string;
  verificationUrl?: string;
  verificationLabel?: string;
  status: SourceStatus;
  approvedBy: string;
  approvedAt: string;
  notes: string;
}

export type CitationStatus = "verified-page" | "chapter-only" | "page-pending";
export type ExcerptType = "literal" | "curated-summary";

export interface CorpusChunk {
  id: string;
  sourceId: string;
  chapter: string;
  page?: string;
  sourceUrl?: string;
  citationStatus?: CitationStatus;
  excerptType: ExcerptType;
  topics: string[];
  keywords: string[];
  text: string;
}

export interface Topic {
  id: string;
  slug: string;
  order: number;
  title: string;
  description: string;
  synonyms: string[];
  keywords: string[];
  related: string[];
  relatedQuestions: string[];
}

export interface TopicMatch {
  topic: Topic;
  score: number;
}

export interface PassageSourceMeta {
  sourceId: string;
  slug: string;
  title: string;
  author: string;
  publisher: string;
  registryUrl: string;
  originalUrl: string;
  verificationUrl?: string;
  verificationLabel?: string;
}

export interface RetrievalBreakdown {
  lexical: number;
  semantic: number | null;
  topic: number;
  hybrid: number;
  rerank: number | null;
  sourceDiversity: number;
}

export interface RetrievedPassage {
  chunkId: string;
  text: string;
  chapter: string;
  page?: string;
  citationStatus?: CitationStatus;
  excerptType?: ExcerptType;
  keywords: string[];
  score: number;
  source: PassageSourceMeta;
  retrieval?: RetrievalBreakdown;
}

export interface SafetyInfo {
  title: string;
  message: string;
  steps: string[];
}

export interface FatwaInfo {
  message: string;
  matter: string | null;
  suggestedTopics: { slug: string; title: string }[];
}

export type ResearchOutcome = "ok" | "abstained" | "safety" | "fatwa" | "invalid" | "ai-unavailable";
export type AiMode = "evidence-gated" | "baseline" | null;

export interface ResearchPlan {
  intent: "research" | "definition" | "comparison" | "source-lookup" | "other";
  audience: "general" | "student" | "researcher" | "preacher";
  semanticQuery: string;
  subquestions: string[];
  searchTerms: string[];
}

export interface RerankedPassage {
  chunkId: string;
  relevance: number;
  supports: string[];
  reason: string;
}

export interface EvidenceGate {
  sufficient: boolean;
  confidence: number;
  aiConfidence?: number;
  semanticCoverage?: number;
  coveredSubquestions: number;
  totalSubquestions: number;
  missingSubquestions: string[];
  notes: string;
}

export type ClaimVerification = "supported" | "partial" | "unsupported" | "conflicting";

export interface AnswerClaim {
  id: string;
  text: string;
  evidenceIds: string[];
  status?: ClaimVerification;
  verifierNote?: string;
}

export interface SourceConflict {
  sourceIds: string[];
  passageIds: string[];
  type: "apparent-tension" | "different-emphasis" | "explicit-contradiction";
  summary: string;
}

export interface VerifiedAnswer {
  claims: AnswerClaim[];
  limits: string[];
}

export interface AIDiagnostics {
  provider: string;
  chatModel: string | null;
  embeddingModel: string | null;
  aiConfigured: boolean;
  pipeline: string[];
  plan: ResearchPlan | null;
  candidateCount: number;
  semanticRetrievalUsed: boolean;
  baselineTopIds: string[];
  hybridTopIds: string[];
  reranked: RerankedPassage[];
  evidenceGate: EvidenceGate | null;
  claims: AnswerClaim[];
  conflicts: SourceConflict[];
  verifiedClaimCount: number;
  totalClaimCount: number;
  latencyMs: number | null;
  degradedReason: string | null;
}

export interface ResearchResult {
  outcome: ResearchOutcome;
  query: string;
  topics: TopicMatch[];
  keywords: string[];
  passages: RetrievedPassage[];
  ai: { mode: AiMode; text: string | null };
  diagnostics: AIDiagnostics;
  disclaimer: string;
  message: string | null;
  safety: SafetyInfo | null;
  fatwa: FatwaInfo | null;
  suggestions: { slug: string; title: string }[];
}
