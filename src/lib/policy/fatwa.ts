// ─────────────────────────────────────────────────────────────────────────────
// سياسة الفتوى: الأداة لا تصدر أحكاماً شرعية.
// أي طلب حكم/فتوى يُحوَّل إلى إحالة على عالِم مؤهل، مع اقتراح مسار بحث اختياري.
// ─────────────────────────────────────────────────────────────────────────────

import { normalizeArabic } from "@/lib/text/arabic";

const FATWA_MARKERS: string[] = [
  "ما حكم",
  "ما حكم الشرع",
  "هل يجوز",
  "هل يحرم",
  "هل هذا حلال",
  "حلال ام حرام",
  "حلال",
  "حرام",
  "افتني",
  "اطلب فتوي",
  "اريد فتوي",
  "فتوي",
  "فتواكم",
  "هل علي اثم",
  "هل ااثم",
  "ما ذنبي",
  "هل ذنبي يغفر",
  "هل ذنبي هذا يغفر لي",
  "هل يغفر الله لي بعد",
  "طلقت زوجتي",
  "وقع الطلاق",
  "الطلاق",
  "الميراث",
  "تركه الميت",
  "ارث الميت",
  "الزكاه",
  "زكاه مالي",
  "الربا",
  "النذر",
  "نذرت",
  "كفاره",
  "كفارة اليمين",
  "حلفت",
  "العده",
  "الرضاع",
  "صيامي",
  "حجي",
];

const MATTER_MAP: [string, string][] = [
  ["طلاق", "مسألة في الطلاق"],
  ["طلقت", "مسألة في الطلاق"],
  ["ميراث", "مسألة في الميراث"],
  ["تركه", "مسألة في الميراث"],
  ["زكاه", "مسألة في الزكاة"],
  ["ربا", "مسألة في الربا"],
  ["نذر", "مسألة في النذور"],
  ["كفاره", "مسألة في الكفارات"],
  ["حلفت", "مسألة في الأيمان"],
  ["عده", "مسألة في العدّة"],
  ["رضاع", "مسألة في الرضاع"],
];

export interface FatwaDetection {
  isFatwa: boolean;
  matter: string | null;
}

export function detectFatwaRequest(query: string): FatwaDetection {
  const norm = normalizeArabic(query);
  if (!norm) return { isFatwa: false, matter: null };
  const hit = FATWA_MARKERS.some((m) => norm.includes(normalizeArabic(m)));
  if (!hit) return { isFatwa: false, matter: null };
  let matter: string | null = null;
  for (const [needle, label] of MATTER_MAP) {
    if (norm.includes(normalizeArabic(needle))) {
      matter = label;
      break;
    }
  }
  return { isFatwa: true, matter };
}

export const FATWA_REFERRAL_MESSAGE =
  "هذا من مسائل الفتوى والأحكام الشرعية، ورفيق القلوب أداة بحث علمي لا تصدر حكماً شرعياً ولا تُفتي. يُرجى عرض مسألتك على عالِم مؤهل موثوق أو على دار إفتاء معتمدة في بلدك.";
