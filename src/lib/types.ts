// ─────────────────────────────────────────────────────────────────────────────
// رفيق القلوب — أنواع النواة
// أداة بحث علمي: لا تشخيص، لا فتوى، لا وصفات. استرجاع من مصادر معتمدة فقط.
// ─────────────────────────────────────────────────────────────────────────────

export type SourceStatus = "active" | "registered-pending";

/** مصدر معتمد في سجل المصادر. لا يُسترجع إلا من مصدر status = active. */
export interface RegisteredSource {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  publisher: string;
  registryUrl: string;
  originalUrl: string;
  /** نسخة نصية رسمية إضافية للتحقق من النقل، إن توفرت. */
  verificationUrl?: string;
  verificationLabel?: string;
  status: SourceStatus;
  approvedBy: string;
  approvedAt: string; // ISO date
  notes: string;
}

/** مقطع نصي من المصدر المعتمد مع بيانات الموضع (إحالة على مستوى الفصل). */
export type CitationStatus = "verified-page" | "chapter-only" | "page-pending";
export type ExcerptType = "literal" | "curated-summary";

export interface CorpusChunk {
  id: string;
  sourceId: string;
  chapter: string; // الموضع داخل الكتاب
  page?: string; // إحالة الجزء/الصفحة المعتمدة والموافقة للمطبوع
  /** رابط الصفحة الرسمية الخاصة بهذا المقطع، إن كان أدق من رابط الكتاب العام. */
  sourceUrl?: string;
  citationStatus?: CitationStatus;
  /** literal = مطابق لأصل موثق؛ curated-summary = عرض بحثي موجّه للأصل. */
  excerptType: ExcerptType;
  topics: string[];
  keywords: string[];
  text: string;
}

/** باب بحثي في التصنيف الهرمي الموحّد (اثنا عشر باباً). */
export interface Topic {
  id: string;
  slug: string;
  /** رقم الباب في الترتيب المنطقي (١–١٢). */
  order: number;
  title: string;
  description: string;
  synonyms: string[];
  keywords: string[];
  related: string[];
  /** أسئلة بحث ذات صلة بالباب (تُعرض كمداخل جاهزة للحوار البحثي). */
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

/** مقطع مسترجع فعلي من المادة المعتمدة مع بيانات المصدر والموضع. */
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

export type ResearchOutcome = "ok" | "abstained" | "safety" | "fatwa" | "invalid";

export type AiMode = "model" | "deterministic" | null;

export interface ResearchResult {
  outcome: ResearchOutcome;
  query: string;
  topics: TopicMatch[];
  keywords: string[];
  passages: RetrievedPassage[];
  ai: { mode: AiMode; text: string | null };
  disclaimer: string;
  message: string | null;
  safety: SafetyInfo | null;
  fatwa: FatwaInfo | null;
  suggestions: { slug: string; title: string }[];
}
