// طبقة سلامة للنص القرآني: النص يأتي من corpus موثّق ولا يجوز للـAI توليده أو تعديله.

const FORBIDDEN_SCRIPT = /[\u3400-\u4DBF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/u;
const LATIN = /[A-Za-z]/u;
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u;

// أشهر علامات الوقف/الابتداء التي قد تظهر في بيانات الرسم العثماني.
export const QURAN_WAQF_MARKS = ["ۘ", "ۙ", "ۗ", "ۖ", "ۚ", "ۛ", "ۜ", "۝", "۞"] as const;

export function isSafeHafsQuranText(text: string): boolean {
  const value = text.trim();
  if (!value || value.length > 20000) return false;
  if (FORBIDDEN_SCRIPT.test(value) || LATIN.test(value) || !ARABIC.test(value)) return false;
  return true;
}

/**
 * لا تضيف علامات الوقف من التخمين. تعيد عدد العلامات الموجودة فعلياً في النص المصدر.
 * غياب علامة من نص المصدر لا يعد خطأً؛ لأن العلامات يجب أن تأتي من corpus المعتمد.
 */
export function countWaqfMarks(text: string): number {
  return [...text].filter((char) => (QURAN_WAQF_MARKS as readonly string[]).includes(char)).length;
}
