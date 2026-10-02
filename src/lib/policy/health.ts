// تنبيه واجهة فقط: لا يمنع البحث العام، ولا يحوّل الإشارة الصحية إلى علامة سلامة حمراء.
import { normalizeArabic } from "@/lib/text/arabic";

const HEALTH_MARKERS = [
  "صداع", "حمى", "حراره", "حرارة", "اعراض", "أعراض", "دواء", "جرعه", "جرعة",
  "سكر", "سكري", "ضغط", "ربو", "حساسيه", "حساسية", "معدة", "المعده",
  "اكتئاب", "اضطراب نفسي", "نوبات هلع", "أرق", "مرض نفسي", "صحه نفسيه", "صحة نفسية",
  "طبيب", "تحاليل", "تشخيص طبي",
];

export function detectHealthQuery(query: string): boolean {
  const norm = normalizeArabic(query);
  if (!norm) return false;
  return HEALTH_MARKERS.some((marker) => norm.includes(normalizeArabic(marker)));
}

export const HEALTH_WARNING =
  "تنبيه صحي: يمكنك البحث في المادة العامة، لكن رفيق القلوب لا يقدّم تشخيصاً أو علاجاً شخصياً.";
