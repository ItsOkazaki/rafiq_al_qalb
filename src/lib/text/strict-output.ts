// حارس صارم لمخرجات النموذج: يمنع النصوص المختلطة أو الحروف غير العربية
// في طبقة التلخيص، ثم يعيد المسار الحتمي عند المخالفة.

const ALLOWED = /^[\s\n\r\t\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0660-\u0669\u06F0-\u06F9 0-9،؛؟.!:\-–—()\[\]{}«»"'•*\/…۝۞۩٭﴿﴾]+$/u;
const ARABIC_LETTER = /[\u0621-\u063A\u0641-\u064A]/u;
const LATIN = /[A-Za-z]/;
const CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/;

export function sanitizeStrictArabicOutput(input: string): string | null {
  const text = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (!text || text.length > 5000) return null;
  if (LATIN.test(text) || CJK.test(text)) return null;
  if (!ALLOWED.test(text)) return null;
  if (!ARABIC_LETTER.test(text)) return null;

  // لا نقبل روابط/أكواد أو وسوم يمكن أن تخرج التلخيص من واجهة النص العربي.
  if (/(?:https?:\/\/|www\.|<[^>]+>|```|javascript:)/i.test(text)) return null;

  return text;
}

export function isStrictArabicOutput(input: string): boolean {
  return sanitizeStrictArabicOutput(input) !== null;
}
