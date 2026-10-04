// ─────────────────────────────────────────────────────────────────────────────
// السلامة أولاً: يحدث الفحص قبل أي استرجاع.
// عند الاشتباه بخطر إيذاء النفس: يتوقف كل شيء ويُعرض رد السلامة فقط.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeArabic } from "@/lib/text/arabic";
import type { SafetyInfo } from "@/lib/types";

const SELF_HARM_MARKERS: string[] = [
  "انتحار",
  // صيغ الفعل من الجذر نفسه: «أنتحر»، «سأنتحر»، «ينتحر»، «ننتحر»…
  // «نتحر» تغطيها جميعاً بالاحتواء بعد التطبيع، وتبقى بعيدة عن المفردات
  // البحثية التي يعالجها «انتحار» وحده.
  "انتحر",
  "نتحر",
  "اقتل نفسي",
  "اودي بنفسي",
  "اودي نفسي",
  "انهي حياتي",
  "انهاء حياتي",
  "اريد ان اموت",
  "اريد الموت",
  "اريد اموت",
  "اتمني الموت",
  "اتمنى الموت",
  "اتمنا الموت",
  "اتمنى اموت",
  "اتمنا اموت",
  "نفسي اموت",
  "ودي اموت",
  "حاب نموت",
  "حاب اموت",
  "نحب نموت",
  "بغيت نموت",
  "بدي اموت",
  "ايذاء نفسي",
  "ايذاء النفس",
  "ايذي نفسي",
  "اجرّح نفسي",
  "اجرح نفسي",
  "لا اريد ان اعيش",
  "لا اريد العيش",
  "ما نيش حاب نعيش",
  "ماني حاب نعيش",
  "مانيش حاب نعيش",
  "لا رغبه لي في الحياه",
  "سئمت الحياه",
  "سئمت من الحياه",
  "قتل النفس",
  "suicide",
  "kill myself",
  "end my life",
  "self harm",
  "selfharm",
  "want to die",
  "hurt myself",
];

/** أدوات النفي: تُبطل دلالة الخطر للعبارة التي تسبقها مباشرةً. */
const NEGATION_TOKENS = new Set([
  "لا", "ما", "مش", "مو", "ليس", "ليست", "لسنا", "ماني", "مانيش", "ماش", "ماشي",
]);

/** صيغ مرنة للتشكيل/العلامات والمسافات: «أريد أن أموت»، «اريد اموت»، إلخ. */
const SAFETY_PATTERNS: RegExp[] = [
  /(?:^|\s)اريد(?:\s+ان)?\s+اموت(?:\s|$)/,
  /(?:^|\s)اتمنى(?:\s+ان)?\s+اموت(?:\s|$)/,
  /(?:^|\s)اتمنا(?:\s+ان)?\s+اموت(?:\s|$)/,
  /(?:^|\s)نفسي\s+اموت(?:\s|$)/,
  /(?:^|\s)(?:ودي|حاب|بدي|بغيت|نحب|حاب)\s+(?:ان\s+)?اموت(?:\s|$)/,
  /(?:^|\s)اريد\s+الموت(?:\s|$)/,
  /(?:^|\s)اتمنى\s+الموت(?:\s|$)/,
  /(?:^|\s)اتمنا\s+الموت(?:\s|$)/,
];

/**
 * هل هذا الوقوع للعلامة مسبوق بأداة نفي مباشرة؟
 * النفي يُبطل دلالة الخطر لهذا الوقوع وحده — فإن وُجد في الجملة نفسها
 * وقوع آخر مؤكّد («لا أريد الموت لكنني سأنتحر») بقيت السلامة مفعّلة.
 */
function occurrenceIsNegated(norm: string, index: number): boolean {
  const before = norm.slice(0, index).trimEnd();
  if (!before) return false;
  const words = before.split(/\s+/);
  const last = words[words.length - 1];
  return typeof last === "string" && NEGATION_TOKENS.has(last);
}

function hasAffirmativeMarker(norm: string, marker: string): boolean {
  if (!marker) return false;
  let idx = norm.indexOf(marker);
  while (idx !== -1) {
    if (!occurrenceIsNegated(norm, idx)) return true;
    idx = norm.indexOf(marker, idx + Math.max(marker.length, 1));
  }
  return false;
}

function hasAffirmativePattern(norm: string, pattern: RegExp): boolean {
  const re = new RegExp(pattern.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(norm)) !== null) {
    if (!occurrenceIsNegated(norm, match.index)) return true;
    if (match.index === re.lastIndex) re.lastIndex += 1;
  }
  return false;
}

export function detectSafetyRisk(query: string): boolean {
  const norm = normalizeArabic(query);
  if (!norm) return false;

  // ذكر «الموت» وحده، أو الحديث عنه بوصفه موضوعاً، ليس علامة خطر.
  // نبحث فقط عن عبارات تعبّر عن نية أو رغبة شخصية في إيذاء النفس/الموت،
  // مع معاملة النفي لكل وقوع على حدة بدل إسقاط الجملة كلها.
  if (SELF_HARM_MARKERS.some((m) => hasAffirmativeMarker(norm, normalizeArabic(m)))) return true;

  return SAFETY_PATTERNS.some((p) => hasAffirmativePattern(norm, p));
}

/**
 * رد السلامة: لا محتوى دينياً، لا تشخيص، لا وصف — توجيه فوري لمساعدة بشرية.
 */
export const SAFETY_RESPONSE: SafetyInfo = {
  title: "سلامتك أولاً — نحتاج أن نُوجِّهك لمختص",
  message:
    "ما تصفه يشير إلى حالة تحتاج دعماً متخصصاً من مختص نفسي أو طبي. رفيق القلوب أداة بحث علمي فقط، وهي غير مؤهلة للتعامل مع هذه الحالات، ولن تعرض لك محتوى بحثياً الآن. نرجو منك طلب مساعدة بشرية متخصصة فورًا.",
  steps: [
    "تحدّث الآن مع شخص تثق به — قريب، صديق، أو شخص مقرّب — وأخبره بما تمرّ به.",
    "اتصل بخدمات الطوارئ في بلدك فوراً، أو توجّه إلى أقرب قسم طوارئ.",
    "إن كان في بلدك خطاً ساخناً للدعم النفسي أو الوقاية، فاتصل به الآن دون تأخير.",
    "لا تبقَ وحدك في هذه اللحظة؛ البقاء مع أحدهم يصنع فرقاً حقيقياً.",
  ],
};
