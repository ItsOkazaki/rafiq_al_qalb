// ─────────────────────────────────────────────────────────────────────────────
// محرك الاسترجاع المضبوط (Controlled Retrieval)
// لا يسترجع إلا من CHUNKS المرتبطة بمصادر active في السجل وغير مستبعدة.
// إن لم توجد مادة كافية → يمتنع ولا يخترع.
// ─────────────────────────────────────────────────────────────────────────────

import { CHUNKS } from "@/lib/corpus/chunks";
import { TOPICS } from "@/lib/rag/topics";
import { getSourceById, isRetrievableSourceId, isExcludedSourceTitle } from "@/lib/sources/registry";
import { normalizeArabic, tokenizeArabic } from "@/lib/text/arabic";
import type { CorpusChunk, RetrievedPassage, TopicMatch } from "@/lib/types";

/** الحد الأقصى لعدد المقاطع المسترجعة في النتيجة الواحدة (RAG limit). */
export const MAX_PASSAGES = 4;

/** العتبة الدنيا لقبول المقطع — دونها يُمتنع عن العرض. */
export const MIN_PASSAGE_SCORE = 3;

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

  const approved = filterApproved(opts.corpus ?? CHUNKS);

  const scored = approved
    .map((chunk) => {
      let score = 0;
      for (const t of chunk.topics) {
        if (matchedTopicIds.has(t)) score += 3;
      }
      for (const kw of chunk.keywords) {
        const n = normalizeArabic(kw);
        if (n && norm.includes(n)) score += 2;
      }
      const chunkTokens = new Set(tokenizeArabic(chunk.text));
      let hits = 0;
      for (const tk of tokens) {
        if (chunkTokens.has(tk)) hits += 1;
      }
      score += Math.min(hits, 6);
      return { chunk, score };
    })
    .filter((x) => x.score >= MIN_PASSAGE_SCORE)
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
      chapter: chunk.chapter,
      page: chunk.page,
      citationStatus: chunk.citationStatus ?? "chapter-only",
      excerptType: chunk.excerptType,
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
