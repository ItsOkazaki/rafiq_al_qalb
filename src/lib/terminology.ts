// ضبط المصطلحات: منع صياغات التشخيص/الوصفة في أي نص يولّده النظام.

/**
 * عبارات محظورة على مستوى "الصياغة" (عبارة وليست كلمة مفردة)،
 * حتى لا تتعارض مع إخلاء المسؤولية الذي ينفي هذه المفاهيم صراحة.
 */
export const FORBIDDEN_PHRASES: string[] = [
  "تشخيص حالتك",
  "تشخيصك هو",
  "تشخيصك:",
  "أنت مصاب",
  "انت مصاب",
  "حالتك هي",
  "مرضك هو",
  "مرضك:",
  "دواؤك هو",
  "دواؤك:",
  "علاج حالتك",
  "علاجك هو",
  "وصفة روحية",
  "وصفه روحيه",
  "برنامج روحاني",
  "برنامج روحي لك",
  "خطة علاجك",
  "خطه علاجك",
  "إصابتك",
  "اصابتك",
  "تعاني من مرض",
  "مصاب بمرض",
];

/** مصطلح مثير للجدل يُتجنَّب في واجهة المنتج ونصوصه. */
export const DISCOURAGED_TERMS: string[] = ["الروحية", "الروحانيه", "روحانية"];

export const REQUIRED_DISCLAIMER =
  "هذه مادة للبحث والدراسة، وليست تشخيصاً ولا فتوى ولا وصفاً لعلاج شخصي؛ ولا يغني البحث فيها عن سؤال أهل العلم.";

export const ABSTAIN_MESSAGE =
  "لم نجد مادة كافية من المصادر المعتمدة لهذا الموضوع.";

/** فحص نص مولّد بحثاً عن صياغات محظورة. يعيد العبارات المكتشفة. */
export function scanForForbiddenFraming(text: string): string[] {
  const found: string[] = [];
  for (const phrase of FORBIDDEN_PHRASES) {
    if (text.includes(phrase)) found.push(phrase);
  }
  for (const term of DISCOURAGED_TERMS) {
    if (text.includes(term)) found.push(term);
  }
  return found;
}

/** هل النص خالٍ من الصياغات المحظورة؟ */
export function isFramingSafe(text: string): boolean {
  return scanForForbiddenFraming(text).length === 0;
}
