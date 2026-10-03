// ─────────────────────────────────────────────────────────────────────────────
// محرك الاسترجاع المضبوط (Controlled Retrieval)
// لا يسترجع إلا من CHUNKS المرتبطة بمصادر active في السجل وغير مستبعدة.
// إن لم توجد مادة كافية → يمتنع ولا يخترع.
// ─────────────────────────────────────────────────────────────────────────────

import { ALL_CHUNKS } from "@/lib/corpus/chunks";
import { TOPICS } from "@/lib/rag/topics";
import { APPROVED_SOURCES, getSourceById, isRetrievableSourceId, isExcludedSourceTitle } from "@/lib/sources/registry";
import { normalizeArabic, tokenizeArabic } from "@/lib/text/arabic";
import type { CorpusChunk, RetrievedPassage, TopicMatch } from "@/lib/types";

/** الحد الأقصى لعدد المقاطع المسترجعة في النتيجة الواحدة (RAG limit). */
export const MAX_PASSAGES = 4;

/** العتبة الدنيا لقبول المقطع — لكن القبول يتطلب أيضاً صلة مباشرة أو موضوعية واضحة. */
export const MIN_PASSAGE_SCORE = 3;

const GENERIC_QUERY_TOKENS = new Set([
  "الله", "الناس", "العبد", "العباد", "الدنيا", "الاخره", "شيء", "امر", "امور",
  "موضوع", "موضوعات", "بحث", "ماده", "مادة", "العلم", "العلمية", "الحديث", "السؤال",
  "ما", "من", "هو", "هي", "في", "عن", "هل", "هذا", "هذه", "ذلك", "تلك", "الى",
  "لماذا", "كيف", "ماذا", "اريد", "أريد", "رأي", "راي", "قول", "أفضل", "افضل",
  "لاعب", "كرة", "كره", "قدم", "الاول", "الأول", "كامل", "كاملة", "تفسير", "ايه", "آيه", "اية", "آية", "سورة", "سوره",
]);

const QURAN_QUERY_HINTS = ["قرآن", "مصحف", "آية", "اية", "آيه", "ايه", "سورة", "سوره"]
  .map(normalizeArabic);
const AUTHORITY_QUERY_HINTS = ["رأي", "راي", "قول", "موقف"] .map(normalizeArabic);
const IGNORED_AUTHOR_TOKENS = new Set([
  "الشيخ", "شيخ", "الإمام", "الامام", "رحمه", "الله", "بن", "ابن", "عبد",
  "الرئاسة", "رئاسة", "العامة", "العلمية", "علميه", "بحوث", "الإفتاء", "افتاء",
  "شركة", "حرف", "تقنية", "لتقنية", "معلومات", "تعاون", "مجمع", "ملك",
  "لطباعة", "مصحف", "شريف", "القرآن", "قران", "كريم", "وتفسير", "ميسر",
  "محمد", "عبدالعزيز", "عبد",
]);

function canonicalSearchToken(token: string): string {
  let t = normalizeArabic(token);
  if (!t) return "";

  for (const prefix of ["وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ك", "ل"]) {
    if (t.startsWith(prefix) && t.length - prefix.length >= 3) {
      t = t.slice(prefix.length);
      break;
    }
  }

  for (const suffix of ["هما", "هم", "هن", "كما", "كم", "كن", "نا", "ها", "ه", "ي", "ك", "ين", "ون", "ان", "ات"]) {
    if (t.endsWith(suffix) && t.length - suffix.length >= 3) {
      t = t.slice(0, -suffix.length);
      break;
    }
  }

  // أفعال شائعة: «يموت/تموت/أموت» ← «موت»؛ مع إبقاء الاسم الأصلي قبلها.
  if (t.length >= 4 && /^[يتان]/.test(t)) {
    const verbStem = t.slice(1);
    if (verbStem.length >= 3) t = verbStem;
  }

  return t;
}

function tokenVariants(token: string): string[] {
  const normalized = normalizeArabic(token);
  const canonical = canonicalSearchToken(normalized);
  return [...new Set([normalized, canonical].filter(Boolean))];
}


function isQuranSpecificQuery(norm: string): boolean {
  return QURAN_QUERY_HINTS.some((hint) => hint && norm.includes(hint));
}

function hasAuthorityCue(norm: string): boolean {
  const queryTokens = new Set(tokenizeArabic(norm).map(normalizeArabic));
  return AUTHORITY_QUERY_HINTS.some((hint) => hint && queryTokens.has(hint));
}

function getExplicitSourceIds(norm: string): Set<string> {
  const ids = new Set<string>();
  for (const source of APPROVED_SOURCES) {
    const authorTokens = tokenizeArabic(source.author)
      .map(normalizeArabic)
      .filter((t) => t.length >= 3 && !IGNORED_AUTHOR_TOKENS.has(t));
    const titleTokens = tokenizeArabic(source.title)
      .map(normalizeArabic)
      .filter((t) => t.length >= 4 && !GENERIC_QUERY_TOKENS.has(t));
    const matchingAuthorTokens = authorTokens.filter((t) => norm.includes(t));
    const matchingTitleTokens = titleTokens.filter((t) => norm.includes(t));
    if (matchingAuthorTokens.length >= 1 || matchingTitleTokens.length >= 2) ids.add(source.id);
  }
  return ids;
}

function buildDocumentFrequency(corpus: CorpusChunk[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const chunk of corpus) {
    const seen = new Set<string>();
    for (const token of tokenizeArabic(chunk.text)) {
      for (const variant of tokenVariants(token)) {
        if (!seen.has(variant)) {
          seen.add(variant);
          freq.set(variant, (freq.get(variant) ?? 0) + 1);
        }
      }
    }
    for (const kw of chunk.keywords) {
      for (const token of tokenizeArabic(kw)) {
        for (const variant of tokenVariants(token)) {
          if (!seen.has(variant)) {
            seen.add(variant);
            freq.set(variant, (freq.get(variant) ?? 0) + 1);
          }
        }
      }
    }
  }
  return freq;
}

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
  /** للاختبار: حقن مادة بديلة دون المساس بالمصفوفة الأساسية. */
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

/**
 * استرجاع المقاطع الفعلية من المادة المعتمدة فقط.
 * التسجيل: تعزيز الموضوع + مطابقة الكلمات المفتاحية + تداخل الوحدات النصية.
 */
export function retrievePassages(query: string, opts: RetrieveOptions = {}): RetrievedPassage[] {
  const norm = normalizeArabic(query);
  if (!norm) return [];

  const tokens = new Set(tokenizeArabic(query));
  const matchedTopicIds = new Set(
    (opts.matchedTopics ?? identifyTopics(query)).map((m) => m.topic.id),
  );

  const corpus = opts.corpus ?? ALL_CHUNKS;
  let approved = filterApproved(corpus);

  // طلب قرآني محدد لا يُسند إلى تفسير عام أو كتاب آخر؛ لا بد من مقطع يحمل
  // نص آية/مرجع آية فعلياً. هذا يمنع إجابات مثل «تفسير آية الكرسي» من
  // الانحراف إلى مادة عن موضوع القلب لمجرد تشابه كلمة عابرة.
  const quranSpecific = isQuranSpecificQuery(norm);
  if (quranSpecific) {
    approved = approved.filter((chunk) => Boolean(chunk.quranText && chunk.quranReference));
  }

  // عند السؤال عن «رأي/قول/موقف» عالم بعينه، لا نقبل مقطعاً من عالم آخر؛
  // وإذا لم يظهر اسم مؤلف مسجّل في المصادر النشطة، فالمادة غير قابلة للإسناد.
  const explicitSourceIds = getExplicitSourceIds(norm);
  if (hasAuthorityCue(norm)) {
    if (explicitSourceIds.size === 0) return [];
    approved = approved.filter((chunk) => explicitSourceIds.has(chunk.sourceId));
  } else if (explicitSourceIds.size > 0) {
    approved = approved.filter((chunk) => explicitSourceIds.has(chunk.sourceId));
  }

  const docFreq = buildDocumentFrequency(approved);
  const corpusSize = Math.max(approved.length, 1);
  const queryTokens = [...tokens].map((t) => ({ original: t, variants: tokenVariants(t) }));

  const scored = approved
    .map((chunk) => {
      let score = 0;
      let directMatch = false;
      let strongLexicalMatch = false;

      for (const t of chunk.topics) {
        if (matchedTopicIds.has(t)) {
          score += 3;
          directMatch = true;
        }
      }

      const chunkNorm = normalizeArabic(chunk.text);
      if (norm.length >= 6 && chunkNorm.includes(norm)) {
        score += 7;
        strongLexicalMatch = true;
      }

      const keywordTokens = new Set(
        chunk.keywords.flatMap((kw) => tokenVariants(kw)),
      );
      for (const kw of chunk.keywords) {
        const k = normalizeArabic(kw);
        if (k && norm.includes(k)) {
          score += 3.5;
          directMatch = true;
          const keywordHasSignal = tokenizeArabic(kw)
            .map(normalizeArabic)
            .some((token) => token.length >= 3 && !GENERIC_QUERY_TOKENS.has(token));
          if (keywordHasSignal) strongLexicalMatch = true;
        }
      }

      const chunkTokens = new Set(
        [...tokenizeArabic(chunk.text), ...chunk.keywords.flatMap((kw) => tokenizeArabic(kw))]
          .flatMap((tk) => tokenVariants(tk)),
      );

      let weightedHits = 0;
      let nonGenericMatches = 0;
      for (const { variants } of queryTokens) {
        let exact = false;
        let similar = false;
        let bestWeight = 0;
        for (const variant of variants) {
          if (keywordTokens.has(variant)) {
            exact = true;
            bestWeight = Math.max(bestWeight, 3.5);
          }
          if (chunkTokens.has(variant)) {
            exact = true;
            const df = Math.max(docFreq.get(variant) ?? 1, 1);
            const rarity = Math.min(6, 1 + Math.log2((corpusSize + 1) / df));
            bestWeight = Math.max(bestWeight, rarity);
          }
          const canonical = canonicalSearchToken(variant);
          if (canonical && chunkTokens.has(canonical)) {
            similar = true;
            bestWeight = Math.max(bestWeight, 2.5);
          }
        }
        if (exact || similar) {
          directMatch = true;
          weightedHits += bestWeight;
          if (!GENERIC_QUERY_TOKENS.has(variants[0])) {
            nonGenericMatches += 1;
            if (bestWeight >= 3.5) strongLexicalMatch = true;
          }
        }
      }
      score += Math.min(weightedHits, 8);

      // مداخل الفهرسة مفيدة لتوجيه البحث لكنها ليست بديلاً عن المتن الكامل؛
      // نخفضها قليلاً حتى تتقدم الأدلة الفعلية عند وجودها.
      if (chunk.role === "index") score -= 1.0;

      // إذا لم يطابق الاستعلام موضوعاً محدداً، فلا يكفي وجود كلمة عامة عابرة.
      const relevance = matchedTopicIds.size > 0 || (nonGenericMatches > 0 && strongLexicalMatch);
      return { chunk, score, directMatch, relevance };
    })
    .filter((x) => x.score >= MIN_PASSAGE_SCORE && x.relevance && x.directMatch)
    .sort((a, b) => b.score - a.score);

  const limit = Math.min(opts.limit ?? MAX_PASSAGES, MAX_PASSAGES);

  // تنويع مضبوط للمصادر: نأخذ أعلى مقطع من كل مصدر ذي صلة أولاً، ثم نملأ
  // المواضع المتبقية حسب الدرجة. لا يُخفض هذا عتبة الصلة ولا يُدخل مصدراً
  // لم ينجح مقطعه في الترشيح؛ إنما يمنع مصدراً واحداً من احتكار الحد كله.
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

  return selected.map(({ chunk, score }) => {
    const src = getSourceById(chunk.sourceId)!;
    return {
      chunkId: chunk.id,
      text: chunk.text,
      quranText: chunk.quranText,
      quranReference: chunk.quranReference,
      chapter: chunk.chapter,
      page: chunk.page,
      citationStatus: chunk.citationStatus ?? "chapter-only",
      excerptType: chunk.excerptType,
      role: chunk.role,
      keywords: chunk.keywords,
      score,
      source: {
        sourceId: src.id,
        slug: src.slug,
        title: src.title,
        author: src.author,
        publisher: src.publisher,
        registryUrl: src.registryUrl,
        originalUrl: chunk.sourceUrl ?? src.originalUrl,
        verificationUrl: src.verificationUrl,
        verificationLabel: src.verificationLabel,
      },
    } satisfies RetrievedPassage;
  });
}
