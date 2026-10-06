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

/**
 * Line-leading forms that open the commentator's text (sharh) instead of the
 * matn — «قوله :», «( ذكر رجاله )», «هذا الحديث مطابق للترجمة», «ما يستفاد منه».
 *
 * These must stay in step with COMMENTARY_LINE_START_RE in
 * scripts/alifta-html/ingest.mjs and the copy in scripts/alifta-html/verify.mjs;
 * tests/alifta-matn-separation.test.ts pins the three together.
 *
 * The patterns are anchored to the start of a line (optionally behind a paren or a
 * `[8/73]` page marker) so a matn that merely contains the word «قوله» in its
 * middle is never mistaken for commentary.
 */
const COMMENTARY_LINE_START_RE =
  /^\s*(?:\[[^\]\n]{0,16}\]\s*)?[(（]?\s*(?:مطابقته للترجمة|مُطَابَقَتُهُ لِلتَّرْجَمَةِ|ذكر معناه|ذِكر معناه|ذكر رجاله|ذِكر رجاله|ذكر لطائف إسناده|ذِكر لطائف إسناده|ذكر تعدد موضعه|ما يستفاد منه|ذكر ما يستفاد منه|قوله|قَوْلُهُ|قلت|قُلت|هذا الحديث|بيان الإعراب|بَيَانُ(?:ت)?\s*(?:الإعراب|اللغة))\s*(?:[:：)）.،]|\s|$)/iu;

/**
 * Does this text carry the commentator's gloss after its first line?
 *
 * Line 0 is the matn itself and is never inspected: a hadith may legitimately
 * quote «قوله» inside the reported speech.
 */
export function carriesCommentary(text: string | undefined): boolean {
  if (!text?.trim()) return false;
  return text.split("\n").slice(1).some((line) => COMMENTARY_LINE_START_RE.test(line));
}

/**
 * May this text be shown to the user *as the hadith* (under the «الحديث» heading)?
 *
 * A `hadithFullText` that still carries the sharh is not a matn: displaying it
 * would label official commentary as hadith, and would repeat the commentary that
 * the card already shows under «الشرح المرتبط بالمادة الأصلية». When this returns
 * false the caller must suppress the hadith-specific display rather than relabel
 * the commentary — never guess at where the matn ends.
 */
export function isDisplayableMatn(text: string | undefined): boolean {
  if (!text?.trim()) return false;
  return !carriesCommentary(text);
}

