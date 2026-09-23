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
    registryUrl: "https://www.al-badr.net/ebook",
    originalUrl: "https://www.al-badr.net/ebook",
    status: "active",
    approvedBy: "فريق رفيق القلوب لاعتماد المصادر",
    approvedAt: "2026-01-15",
    notes:
      "نسخة مسجلة ومفهرسة على مستوى المواضع (الفصول). الاسترجاع مقصور على هذه النسخة المعتمدة، ولا تُعرض أي مادة من خارجها.",
  },
  {
    id: "binbaz-books",
    slug: "binbaz-books",
    title: "مكتبة كتب الشيخ عبد العزيز بن باز",
    author: "الشيخ عبد العزيز بن باز رحمه الله (١٣٣٠–١٤٢٠هـ)",
    category: "كتب ورسائل",
    publisher: "الموقع الرسمي لسماحة الشيخ ابن باز",
    registryUrl: "https://binbaz.org.sa/books",
    originalUrl: "https://binbaz.org.sa/books",
    status: "registered-pending",
    approvedBy: "فريق رفيق القلوب لاعتماد المصادر",
    approvedAt: "2026-01-15",
    notes:
      "مصدر مسجّل في السجل، ولم تُعتمد منه مادة مسترجعة بعد. لن تظهر أي نتائج منه حتى يكتمل التوثيق والفهرسة على مستوى المواضع.",
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
