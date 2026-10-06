import { normalizeArabic } from "@/lib/text/arabic";

/**
 * A short hadith excerpt may be displayed as an excerpt only when its Arabic
 * words occur, in order, in the recorded hadith/evidence body. Search-result
 * labels and chapter headings are metadata, not hadith text.
 *
 * Numbers are discarded from the comparison because some official pages insert
 * hadith/page ordinals into the copied matn. Diacritics and punctuation are
 * normalized by `normalizeArabic`; the original text is never rewritten here.
 */
export function isGroundedHadithExcerpt(
  excerpt: string | undefined,
  evidence: string | undefined,
): boolean {
  if (!excerpt?.trim() || !evidence?.trim()) return false;

  const arabicTokens = (text: string) =>
    normalizeArabic(text)
      .split(" ")
      .filter((token) => /^[\u0621-\u064A]+$/.test(token));

  const excerptTokens = arabicTokens(excerpt);
  const evidenceTokens = arabicTokens(evidence);
  if (excerptTokens.length < 2 || evidenceTokens.length < excerptTokens.length) return false;

  const needle = ` ${excerptTokens.join(" ")} `;
  const haystack = ` ${evidenceTokens.join(" ")} `;
  return haystack.includes(needle);
}
