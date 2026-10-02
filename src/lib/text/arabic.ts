// تطبيع النص العربي لأغراض المطابقة البحثية الحتمية (بدون نماذج خارجية).

const TASHKEEL = /[ً-ْٰـ]/g;

/** تطبيع نص عربي: إزالة التشكيل وتوحيد الألف والهمزات والتاء المربوطة والألف المقصورة. */
export function normalizeArabic(input: string): string {
  return input
    .replace(TASHKEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "في", "من", "علي", "الي", "عن", "ان", "ما", "لا", "لم", "لن", "قد", "هو", "هي",
  "هذا", "هذه", "ذلك", "تلك", "التي", "الذي", "او", "بل", "ثم", "كيف", "ماذا",
  "هل", "انا", "انت", "نحن", "هم", "كل", "بعد", "قبل", "عند", "مع", "كان", "كانت",
  "يكون", "لي", "له", "لها", "فيها", "فيه", "عليه", "اليه", "منها", "منه", "بما",
  "كما", "اذا", "اذ", "لو", "لولا", "ولا", "فلا", "ولم", "وقد", "وكان", "لقد",
  "جدا", "بشده", "الان", "دائما", "احيانا", "كثير", "شيء", "شي", "ايضا", "غير",
  "بين", "حتي", "منذ", "ضد", "مثل", "عبر", "حول", "دون", "لدي", "عندي", "معي",
  "the", "a", "an", "of", "to", "in", "is", "i", "me", "my", "and", "or",
]);

const PREFIXES = ["وال", "فال", "بال", "كال", "لل", "ال", "و", "ف", "ب", "ك", "ل"];

function stripPrefix(token: string): string {
  let t = token;
  for (const p of ["وال", "فال", "بال", "كال", "لل", "ال"]) {
    if (t.startsWith(p) && t.length - p.length >= 3) {
      t = t.slice(p.length);
      break;
    }
  }
  return t;
}

/** تقطيع النص إلى وحدات بحثية بعد التطبيع وإزالة أدوات الربط والسابقات. */
export function tokenizeArabic(input: string): string[] {
  const norm = normalizeArabic(input);
  if (!norm) return [];
  const out: string[] = [];
  for (const raw of norm.split(" ")) {
    if (raw.length < 2) continue;
    if (STOPWORDS.has(raw)) continue;
    const t = stripPrefix(raw);
    if (t.length < 2 || STOPWORDS.has(t)) continue;
    out.push(t);
  }
  return out;
}

/** مطابقة وجود عبارة داخل نص بعد التطبيع. */
export function includesNormalized(haystack: string, needle: string): boolean {
  const n = normalizeArabic(needle);
  if (!n) return false;
  return normalizeArabic(haystack).includes(n);
}

/**
 * ترجمة مصطلحات عامية/دارجة إلى مقابلاتها الفصحى قبل البحث.
 * يدعم العربية المغربية/الجزائرية والخليجية والمصرية.
 */
const DIALECT_MAP: [string, string][] = [
  ["واعر", "قاس"],
  ["واعره", "قاسية"],
  ["بزاف", "كثير"],
  ["كفاه", "كيف"],
  ["نديرو", "نفعل"],
  ["ندير", "أفعل"],
  ["غالطتني", "أخطأت"],
  ["مقصر", "مقصر"],
  ["قلقان", "قلق"],
  ["زهقت", "سئمت"],
  ["عايز", "أريد"],
  ["ماشي", "ذاهب"],
  ["كده", "هكذا"],
  ["اللي", "الذي"],
  ["مش", "ليس"],
  ["مو", "ليس"],
  ["يبه", "يا أبي"],
  ["شلون", "كيف"],
  ["شو", "ما"],
  ["ليش", "لماذا"],
  ["دلوقتي", "الآن"],
  ["كيف نقدر", "كيف نستطيع"],
  ["هواجيس", "وساوس"],
  ["هواجس", "وساوس"],
  ["يقلقني", "يقلقني"],
  ["مقلق", "مقلق"],
  ["متضايق", "منزعج"],
  ["زهجت", "سئمت"],
  ["تعبان", "متعب"],
  ["زعلان", "حزين"],
];

/**
 * توحيد الكلمات العامية إلى فصحى قبل المطابقة البحثية.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * توحيد الكلمات العامية إلى فصحى قبل المطابقة.
 * نستخدم حدوداً عربية صريحة لأن JavaScript\b لا يعامل الحروف العربية
 * كـword characters في هذا السياق.
 */
export function normalizeDialect(input: string): string {
  let out = input;
  for (const [term, replacement] of DIALECT_MAP) {
    const pattern = new RegExp(`(^|[^\u0600-\u06FF])${escapeRegExp(term)}(?=$|[^\u0600-\u06FF])`, "g");
    out = out.replace(pattern, `$1${replacement}`);
  }
  return out;
}
