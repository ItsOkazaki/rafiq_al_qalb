// ─────────────────────────────────────────────────────────────────────────────
// سجل المصادر المعتمدة (Source Registry)
// القاعدة الذهبية: إن تعذّر توثيق المصدر فلا يُستخدم.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeArabic, includesNormalized } from "@/lib/text/arabic";
import type { RegisteredSource } from "@/lib/types";

/**
 * المصادر المعتمدة في المشروع — مسجلة صراحة، مرتبطة بجهة رسمية/موثوقة،
 * قابلة للتتبع، وظاهرة للمستخدم. لا يُضاف أي كتاب لمجرد أنه "مناسب".
 */
export const APPROVED_SOURCES: RegisteredSource[] = [
  {
    id: "albadr-daa-dawaa",
    slug: "al-daa-wal-dawaa",
    title: "الداء والدواء — الجواب الكافي لمن سأل عن الدواء الشافي",
    author: "الإمام ابن قيم الجوزية (٦٩١–٧٥١هـ)",
    category: "تزكية وسلوك",
    publisher: "موقع البدر — المكتبة الإلكترونية",
    registryUrl: "https://www.al-badr.net/sub/376",
    originalUrl: "https://www.al-badr.net/sub/376",
    verificationUrl: "https://shamela.ws/book/98093",
    verificationLabel: "فتح النسخة النصية المرجعية للتوثيق",
    status: "active",
    approvedBy: "فريق رفيق القلوب لاعتماد المصادر",
    approvedAt: "2026-01-15",
    notes:
      "مصدر رسمي مسجّل بصفحة مواد «شرح كتاب الداء والدواء» على موقع البدر. الرابط السابق /ebook غير مستخدم لأنه يعيد صفحة 404؛ جميع مقاطع الاسترجاع تتجه إلى الرابط الرسمي العامل.",
  },
  {
    id: "binbaz-majmou-fatawa",
    slug: "majmou-fatawa-wa-maqalat",
    title: "مجموع فتاوى ومقالات متنوعة",
    author: "الشيخ عبد العزيز بن باز رحمه الله (١٣٣٠–١٤٢٠هـ)",
    category: "فتاوى ومقالات",
    publisher: "الموقع الرسمي لسماحة الشيخ ابن باز",
    registryUrl: "https://binbaz.org.sa/majmou-fatawa",
    originalUrl: "https://binbaz.org.sa/majmou-fatawa",
    status: "active",
    approvedBy: "فريق رفيق القلوب لاعتماد المصادر",
    approvedAt: "2026-09-24",
    notes:
      "فهرسة انتقائية لمواضع بحثية محددة من المجموع؛ كل مقطع يحمل رقم الجزء والصفحة ورابط صفحته الرسمية. لا يعني تفعيل هذا المصدر أن جميع مجلداته مفهرسة.",
  },
  {
    id: "binbaz-tawba-musaaib",
    slug: "wujub-al-tawba-ind-al-musaaib",
    title: "التوبة إلى الله والضراعة إليه عند نزول المصائب",
    author: "الشيخ عبد العزيز بن باز رحمه الله (١٣٣٠–١٤٢٠هـ)",
    category: "رسائل وتوجيهات",
    publisher: "الموقع الرسمي لسماحة الشيخ ابن باز",
    registryUrl: "https://binbaz.org.sa/books",
    originalUrl: "https://binbaz.org.sa/books/pdf/237",
    verificationUrl:
      "https://binbaz.org.sa/articles/49/%D9%88%D8%AC%D9%88%D8%A8-%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9-%D8%A7%D9%84%D9%89-%D8%A7%D9%84%D9%84%D9%87-%D9%88%D8%A7%D9%84%D8%B6%D8%B1%D8%A7%D8%B9%D8%A9-%D8%B9%D9%86%D8%AF-%D9%86%D8%B2%D9%88%D9%84-%D8%A7%D9%84%D9%85%D8%B5%D8%A7%D9%89%D8%A8",
    verificationLabel: "فتح النسخة النصية الرسمية للتحقق",
    status: "active",
    approvedBy: "فريق رفيق القلوب لاعتماد المصادر",
    approvedAt: "2026-09-24",
    notes:
      "كتاب رسمي من فهرس كتب ابن باز (مرفق PDF رقم 237، 36 صفحة). فُهرست المقاطع على مستوى صفحات ملف PDF، وقوبل نصها بالنسخة النصية الرسمية المنشورة في الموقع بعنوان «وجوب التوبة إلى الله والضراعة عند نزول المصائب» (مقال رقم 49).",
  },
];

/**
 * كتب مستبعدة صراحة: لا تُعرض في المكتبة ولا يُسترجع منها أبداً،
 * حتى لو وُجدت بيانات قديمة لها في أي مخزن داخلي.
 */
export const EXCLUDED_SOURCES: { title: string; reason: string }[] = [
  { title: "إحياء علوم الدين", reason: "غير معتمد ضمن سياسة المشروع" },
  { title: "مدارج السالكين", reason: "غير معتمد ضمن سياسة المشروع" },
  { title: "صيد الخاطر", reason: "غير معتمد ضمن سياسة المشروع" },
  { title: "كتاب العبودية", reason: "غير معتمد ضمن سياسة المشروع" },
];

const EXCLUDED_NORMALIZED = EXCLUDED_SOURCES.map((s) => normalizeArabic(s.title));

export function getSourceById(id: string): RegisteredSource | undefined {
  return APPROVED_SOURCES.find((s) => s.id === id);
}

export function getSourceBySlug(slug: string): RegisteredSource | undefined {
  return APPROVED_SOURCES.find((s) => s.slug === slug);
}

/** هل العنوان مطابق لأحد الكتب المستبعدة؟ */
export function isExcludedSourceTitle(title: string): boolean {
  const n = normalizeArabic(title);
  if (!n) return false;
  return EXCLUDED_NORMALIZED.some((ex) => n.includes(ex) || ex.includes(n));
}

/**
 * المصادر العامة الظاهرة للمستخدم: فعّالة، غير مستبعدة، ولها مادة قابلة
 * للاسترجاع. المصدر قيد التوثيق يبقى داخلياً ولا يظهر كأنه مستخدم.
 */
export const ACTIVE_SOURCES: RegisteredSource[] = APPROVED_SOURCES.filter(
  (source) => source.status === "active" && !isExcludedSourceTitle(source.title),
);

export function getActiveSourceBySlug(slug: string): RegisteredSource | undefined {
  return ACTIVE_SOURCES.find((source) => source.slug === slug);
}

/**
 * شرط الاسترجاع الصارم:
 * ١) المصدر مسجّل في السجل. ٢) حالته active. ٣) عنوانه ليس في قائمة الاستبعاد.
 */
export function isRetrievableSourceId(sourceId: string): boolean {
  const src = getSourceById(sourceId);
  if (!src) return false;
  if (src.status !== "active") return false;
  if (isExcludedSourceTitle(src.title)) return false;
  return true;
}

/** فلتر نهائي يُستخدم في محرك الاسترجاع — يقبل المعرّفات ويرفض أي عنوان مستبعد. */
export function assertSourceAllowed(sourceId: string, title?: string): boolean {
  if (title && includesAnyExcluded(title)) return false;
  return isRetrievableSourceId(sourceId);
}

function includesAnyExcluded(title: string): boolean {
  return EXCLUDED_NORMALIZED.some((ex) => includesNormalized(title, ex));
}
