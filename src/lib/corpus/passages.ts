// ─────────────────────────────────────────────────────────────────────────────
// تحويل مقطع من الـcorpus إلى «مقطع قابل للعرض» (RetrievedPassage).
//
// قاعدة واحدة تسري على كل المسارات — الاسترجاع وصفحات المكتبة معاً:
// لا يُعرض مقطع إلا إذا كان مصدره مسجّلاً في السجل، وحالته `active`، وعنوانه ليس
// في قائمة الاستبعاد. ومقطع تعذّر توثيق مصدره (معرّف محذوف/خاطئ في سجل متضارب)
// يُتجاوز بصمت بدل أن يُسقط الصفحة أو الطلب كله بخطأ غير مضبوط.
//
// لماذا هذا الملف موجود: كان تحويل المقطع مكرراً في ثلاثة مواضع، واستخدمت صفحة
// الباب في المكتبة `getSourceById(...)!` — أي إسكات المترجم بافتراض أن المصدر
// موجود دائماً. ذلك الافتراض هو نفسه الذي يحرسه محرك الاسترجاع صراحةً؛ فأي مقطع
// بمعرّف غير مسجّل كان يُسقط بناء الصفحة كلها. الآن الحارس واحد ومختبَر.
// ─────────────────────────────────────────────────────────────────────────────

import { getSourceById, isRetrievableSourceId } from "@/lib/sources/registry";
import { isDisplayableMatn, isGroundedHadithExcerpt } from "@/lib/corpus/hadith";
import type { CorpusChunk, RetrievedPassage } from "@/lib/types";

/**
 * يبني مقطعاً قابلاً للعرض من مقطع في الـcorpus.
 * يُعيد `null` عندما لا يكون المصدر قابلاً للاسترجاع — وعلى المستدعي أن يتجاوز
 * المقطع لا أن يفترض وجود المصدر.
 */
export function toRetrievedPassage(
  chunk: CorpusChunk,
  opts: { score?: number } = {},
): RetrievedPassage | null {
  // الحارس الأول: مسجّل + active + غير مستبعد.
  if (!isRetrievableSourceId(chunk.sourceId)) return null;

  // الحارس الثاني (صريح، بلا «!»): السجل نفسه قد لا يحمل المعرّف.
  const source = getSourceById(chunk.sourceId);
  if (!source) return null;

  // متنٌ لا يزال يحمل شرح المعلِّق ليس متناً: عرضه تحت عنوان «الحديث» ينسب شرحاً
  // رسمياً إلى الحديث نفسه، ويكرّر الشرح المعروض في طبقته الخاصة. يُحجب عرض
  // الحديث كاملاً بدل إعادة تسمية الشرح — ولا يُخمَّن موضع نهاية المتن.
  const hadithFullText = isDisplayableMatn(chunk.hadithFullText) ? chunk.hadithFullText : undefined;

  // بعض صفحات الجامع تسجّل عنوان الصفحة في `hadithText` بدل مقتطف الحديث.
  // لا نمرّر هذا العنوان إلى الـAPI/البطاقة على أنه نص حديث؛ يبقى الموضع
  // محفوظاً في `chapter`، ويُعرض المتن الموثق عند الحاجة.
  const hadithEvidence = [hadithFullText, chunk.text].filter(Boolean).join("\n");
  const hadithText =
    hadithFullText && isGroundedHadithExcerpt(chunk.hadithText, hadithEvidence)
      ? chunk.hadithText
      : undefined;

  return {
    chunkId: chunk.id,
    text: chunk.text,
    quranText: chunk.quranText,
    quranReference: chunk.quranReference,
    hadithText,
    hadithFullText,
    explanationText: chunk.explanationText,
    explanationSourceUrl: chunk.explanationSourceUrl,
    chapter: chunk.chapter,
    page: chunk.page,
    citationStatus: chunk.citationStatus ?? "chapter-only",
    excerptType: chunk.excerptType,
    role: chunk.role,
    keywords: chunk.keywords,
    // الدرجة معناها في الاسترجاع فقط (ترتيب الأدلة)؛ ولا تُعرض في الواجهة.
    score: opts.score ?? 0,
    source: {
      sourceId: source.id,
      slug: source.slug,
      title: source.title,
      author: source.author,
      publisher: source.publisher,
      registryUrl: source.registryUrl,
      // رابط المقطع نفسه إن وُجد، وإلا رابط المصدر الأصلي في السجل.
      originalUrl: chunk.sourceUrl ?? source.originalUrl,
      verificationUrl: source.verificationUrl,
      verificationLabel: source.verificationLabel,
    },
  };
}

/**
 * تحويل قائمة مقاطع مع تجاوز غير القابل للاسترجاع.
 * `scoreFor` اختياري: يُستعمل في صفحات المكتبة حيث لا معنى لدرجة الاسترجاع.
 */
export function toRetrievedPassages(
  chunks: CorpusChunk[],
  opts: { scoreFor?: (chunk: CorpusChunk, index: number) => number } = {},
): RetrievedPassage[] {
  const passages: RetrievedPassage[] = [];
  chunks.forEach((chunk, index) => {
    const passage = toRetrievedPassage(chunk, {
      score: opts.scoreFor ? opts.scoreFor(chunk, index) : 0,
    });
    if (passage) passages.push(passage);
  });
  return passages;
}
