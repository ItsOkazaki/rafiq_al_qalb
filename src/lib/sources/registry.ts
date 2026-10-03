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
    id: "kfgqpc-hafs-quran",
    slug: "kfgqpc-hafs-quran",
    title: "خط الرسم العثماني (رواية حفص) وبيانات المصحف",
    author: "مجمع الملك فهد لطباعة المصحف الشريف",
    category: "القرآن الكريم",
    publisher: "مجمع الملك فهد لطباعة المصحف الشريف",
    registryUrl: "https://qurancomplex.gov.sa/en/techquran/dev/",
    originalUrl: "https://qurancomplex.gov.sa/en/techquran/dev/",
    verificationUrl: "https://qurancomplex.gov.sa/en/techquran/dev/",
    verificationLabel: "فتح منصة مطوري القرآن الرسمية",
    status: "active",
    showInLibrary: false,
    approvedBy: "سياسة رفيق القلوب للمصادر السعودية الأولية",
    approvedAt: "2026-10-02",
    notes:
      "مرجع تقني داخلي لعرض النص القرآني الموثق برواية حفص؛ لا يظهر كبطاقة في مكتبة المستخدم. تنص منصة المطورين على أن بيانات aya_text تستخدم Unicode Uthmanic Hafs لعرض الآيات، ولا يُنشئ الذكاء الاصطناعي نص الآية ولا يعدّل رسمها أو علامات الوقف."
  },
  {
    id: "alifta-sunna-encyclopedia",
    slug: "alifta-sunna-encyclopedia",
    title: "جامع خادم الحرمين الشريفين للسنة النبوية المطهرة",
    author: "الرئاسة العامة للبحوث العلمية والإفتاء بالتعاون مع شركة حرف لتقنية المعلومات",
    category: "حديث نبوي",
    publisher: "الرئاسة العامة للبحوث العلمية والإفتاء — المملكة العربية السعودية",
    registryUrl: "https://sunna.alifta.gov.sa/",
    originalUrl: "https://sunna.alifta.gov.sa/",
    verificationUrl: "https://sunna.alifta.gov.sa/Home/About",
    verificationLabel: "فتح صفحة البرنامج الرسمية",
    status: "active",
    approvedBy: "سياسة رفيق القلوب للمصادر السعودية الأولية",
    approvedAt: "2026-10-02",
    notes:
      "مصدر سعودي أولي للسنة. تصف الصفحة الرسمية البرنامج بأنه يضم 33 كتاباً من أمهات كتب السنة و57 كتاباً خدمياً، مع التخريج، وشجرة الموضوعات، والشروح، والحكم على الحديث، والبحث النصي. في corpus الحالي توجد أكثر من 100 مداخل فهرسة موضوعية مرتبطة بالأبواب الاثني عشر، وتُعامل مداخل الفهرسة كدلائل وصول لا كمتون حديث كاملة."
  },
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
  {
    id: "ksu-quran-project",
    slug: "ksu-quran-project",
    title: "مشروع المصحف الإلكتروني بجامعة الملك سعود",
    author: "نص القرآن الكريم وتفسير السعدي/الميسر",
    category: "تفسير وعلوم قرآن",
    publisher: "جامعة الملك سعود — بوابة آيات",
    registryUrl: "https://quran.ksu.edu.sa",
    originalUrl: "https://quran.ksu.edu.sa",
    status: "active",
    approvedBy: "فريق رفيق القلوب لاعتماد المصادر",
    approvedAt: "2026-09-26",
    notes: "مصدر معتمد للنص القرآني والتفاسير المعتمدة في أبواب التداوي بالقرآن والتدبر.",
  },
  {
    id: "sahih-bukhari",
    slug: "sahih-bukhari",
    title: "صحيح البخاري — الجامع المسند الصحيح",
    author: "الإمام محمد بن إسماعيل البخاري (١٩٤–٢٥٦هـ)",
    category: "حديث نبوي",
    publisher: "موقع موسوعة السنة — الكنز",
    registryUrl: "https://sunnah.com/bukhari",
    originalUrl: "https://sunnah.com/bukhari",
    status: "active",
    approvedBy: "فريق رفيق القلوب لاعتماد المصادر",
    approvedAt: "2026-09-27",
    notes: "أصح الكتب بعد كتاب الله. فُهرست منه أحاديث مختارة في أبواب الرقائق والإيمان.",
  },
  {
    id: "ibn-taymiyyah-amrad",
    slug: "amrad-al-qulub-wa-shifauha",
    title: "أمراض القلوب وشفاؤها",
    author: "شيخ الإسلام ابن تيمية (٦٦١–٧٢٨هـ)",
    category: "تزكية وسلوك",
    publisher: "المكتبة الشاملة",
    registryUrl: "https://shamela.ws/book/645",
    originalUrl: "https://shamela.ws/book/645",
    status: "active",
    approvedBy: "فريق رفيق القلوب لاعتماد المصادر",
    approvedAt: "2026-09-27",
    notes: "رسالة جليلة في تشريح أمراض القلوب المعنوية وسبل علاجها بالوحي.",
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
 * للاسترجاع. المصادر التقنية الداخلية يمكن إبقاؤها خارج واجهة المكتبة.
 */
export const ACTIVE_SOURCES: RegisteredSource[] = APPROVED_SOURCES.filter(
  (source) => source.status === "active" && source.showInLibrary !== false && !isExcludedSourceTitle(source.title),
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
