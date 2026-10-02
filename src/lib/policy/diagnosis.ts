// لا تشخيص: البحث العام مسموح، لكن الأداة لا تحدد مرضاً أو اضطراباً لحالة شخصية.
import { normalizeArabic } from "@/lib/text/arabic";

const PERSONAL_DIAGNOSIS_MARKERS = [
  "شخصني",
  "شخص حالتي",
  "ما تشخيصي",
  "ما التشخيص",
  "هل انا مصاب",
  "هل أنا مصاب",
  "هل عندي مرض",
  "هل عندي اضطراب",
  "هل اعاني من",
  "هل أعاني من",
  "هل انا مكتئب",
  "هل أنا مكتئب",
  "هل عندي اكتئاب",
  "هل عندي سكري",
  "هل عندي سكر",
  "هل عندي ضغط",
  "هل هذا مرضي",
  "هل هذه حالتي",
  "هل يمكن ان اكون مصاب",
  "هل يمكن أن أكون مصاب",
  "ما المرض الذي عندي",
  "ما الذي اعاني منه",
  "ما الذي أعاني منه",
  "ما الذي فيني",
  "اظن ان عندي",
  "أظن أن عندي",
  "اعتقد ان عندي",
  "أعتقد أن عندي",
];

export function detectDiagnosisRequest(query: string): boolean {
  const norm = normalizeArabic(query);
  if (!norm) return false;
  return PERSONAL_DIAGNOSIS_MARKERS.some((marker) => norm.includes(normalizeArabic(marker)));
}

export const DIAGNOSIS_REFERRAL_MESSAGE =
  "لا تشخيص: رفيق القلوب لا يشخّص حالات شخصية ولا يقرر ما إذا كان المستخدم مصاباً بمرض أو اضطراب. يمكن استخدامه للبحث العام في المادة المعتمدة، وللتقييم الشخصي يُرجى سؤال مختص مؤهل.";
