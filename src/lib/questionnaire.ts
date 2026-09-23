// ─────────────────────────────────────────────────────────────────────────────
// الاستبانة البحثية — أسئلة ملاحة بحثية على أبواب التصنيف الاثني عشر.
// ليست أسئلة تشخيصية: نسأل «هل تريد البحث في …؟» لا «ما شدة حالتك؟».
// الناتج: أبواب بحث + كلمات مفتاحية + استعلام مقترح. لا تشخيص ولا علاج.
// ─────────────────────────────────────────────────────────────────────────────

import { TOPICS, getTopicById } from "@/lib/rag/topics";
import type { Topic } from "@/lib/types";

export interface QuestionnaireArea {
  id: string;
  question: string;
  topicIds: string[];
}

/** الخطوة الأولى: المجال العام للبحث (تغطي مجتمعة الأبواب الاثني عشر). */
export const QUESTIONNAIRE_AREAS: QuestionnaireArea[] = [
  {
    id: "qalb-taaththur",
    question: "هل تريد البحث في أبواب القلب وقسوته والتأثر؟",
    topicIds: ["qaswat-al-qalb", "khushu-tadabbur", "hudur-al-qalb"],
  },
  {
    id: "dhunub-tawba",
    question: "هل تريد البحث في أبواب الذنوب والتوبة والانتكاس؟",
    topicIds: ["athar-al-dhunub", "al-tawba", "takrar-al-dhanb"],
  },
  {
    id: "hamm-qalaq",
    question: "هل تريد البحث في الهم والقلق؟",
    topicIds: ["al-hamm-wal-qalaq"],
  },
  {
    id: "ghafla-dhikr",
    question: "هل تريد البحث في الغفلة وآثار الذكر في القلب؟",
    topicIds: ["al-ghafla", "dhikr-athar"],
  },
  {
    id: "nazar-shahwa",
    question: "هل تريد البحث في آفة النظر والشهوة؟",
    topicIds: ["al-nazar-ghad", "hasm-al-shahwa"],
  },
  {
    id: "tadawi-quran",
    question: "هل تريد البحث في التداوي بالقرآن والفاتحة؟",
    topicIds: ["al-tadawi-bil-quran"],
  },
];

/** الخطوة الثانية: أسئلة تضييق بحثية (تُختار بحسب المجال). */
export interface RefinementQuestion {
  id: string;
  areaId: string;
  question: string;
  topicId: string;
  keywords: string[];
}

export const REFINEMENT_QUESTIONS: RefinementQuestion[] = [
  { id: "r-qaswa", areaId: "qalb-taaththur", question: "هل يرتبط موضوع بحثك بقسوة القلب تحديداً؟", topicId: "qaswat-al-qalb", keywords: ["قسوة القلب", "لين القلب"] },
  { id: "r-taaththur", areaId: "qalb-taaththur", question: "هل يرتبط موضوع البحث بعدم التأثر بالموعظة أو القرآن؟", topicId: "khushu-tadabbur", keywords: ["التأثر بالموعظة", "التدبر"] },
  { id: "r-hudur", areaId: "qalb-taaththur", question: "هل تريد البحث في حضور القلب والإخلاص عند العمل؟", topicId: "hudur-al-qalb", keywords: ["حضور القلب", "الإخلاص"] },
  { id: "r-athar", areaId: "dhunub-tawba", question: "هل تريد البحث في آثار الذنوب والمعاصي في القلب والحياة؟", topicId: "athar-al-dhunub", keywords: ["آثار الذنوب", "عقوبات المعاصي"] },
  { id: "r-tawba", areaId: "dhunub-tawba", question: "هل تريد البحث في التوبة وعلامات صدقها؟", topicId: "al-tawba", keywords: ["التوبة النصوح", "علامات صدق التوبة"] },
  { id: "r-takrar", areaId: "dhunub-tawba", question: "هل يرتبط بحثك بالعودة إلى الذنب بعد التوبة؟", topicId: "takrar-al-dhanb", keywords: ["تكرار الذنب", "الإقلاع"] },
  { id: "r-hamm", areaId: "hamm-qalaq", question: "هل تريد البحث في الهم والغم وضيق الصدر؟", topicId: "al-hamm-wal-qalaq", keywords: ["الهم والغم", "ضيق الصدر"] },
  { id: "r-itminan", areaId: "hamm-qalaq", question: "هل يرتبط بحثك بأسباب الطمأنينة ودفع القلق؟", topicId: "al-hamm-wal-qalaq", keywords: ["طمأنينة القلب", "ذكر الله"] },
  { id: "r-ghafla", areaId: "ghafla-dhikr", question: "هل تريد البحث في الغفلة والتسويف وتضييع الأوقات؟", topicId: "al-ghafla", keywords: ["الغفلة", "التسويف"] },
  { id: "r-dhikr", areaId: "ghafla-dhikr", question: "هل تريد البحث في آثار الذكر ومجالس الذاكرين؟", topicId: "dhikr-athar", keywords: ["ذكر الله", "مجالس الذكر"] },
  { id: "r-nazar", areaId: "nazar-shahwa", question: "هل يرتبط بحثك بإطلاق النظر وآفة العين؟", topicId: "al-nazar-ghad", keywords: ["غض البصر", "آفة النظرة"] },
  { id: "r-shahwa", areaId: "nazar-shahwa", question: "هل تريد البحث في حسم مادة الشهوة قبل حصولها؟", topicId: "hasm-al-shahwa", keywords: ["حسم مادة الشهوة", "عشق الصور"] },
  { id: "r-fatiha", areaId: "tadawi-quran", question: "هل تريد البحث في أثر التداوي بالفاتحة تحديداً؟", topicId: "al-tadawi-bil-quran", keywords: ["التداوي بالفاتحة", "أثر القرآن"] },
  { id: "r-shifa", areaId: "tadawi-quran", question: "هل يرتبط بحثك بالقرآن شفاءً لما في الصدور؟", topicId: "al-tadawi-bil-quran", keywords: ["القرآن شفاء", "التدبر"] },
];

export interface QuestionnaireResult {
  topics: Topic[];
  keywords: string[];
  query: string;
}

/**
 * حل مسار الاستبانة: مجال مختار + أسئلة تضييق أجيب عنها بنعم.
 * حتمي بالكامل؛ مناسب للاختبار لكل تركيبة إجابات.
 */
export function resolveQuestionnairePath(
  areaId: string,
  refinementIds: string[],
): QuestionnaireResult | null {
  const area = QUESTIONNAIRE_AREAS.find((a) => a.id === areaId);
  if (!area) return null;

  const topicIds = new Set<string>(area.topicIds);
  const keywords: string[] = [];
  const seenKw = new Set<string>();

  const pushKw = (kw: string) => {
    if (!seenKw.has(kw)) {
      seenKw.add(kw);
      keywords.push(kw);
    }
  };

  const picks = REFINEMENT_QUESTIONS.filter(
    (q) => q.areaId === areaId && refinementIds.includes(q.id),
  );
  for (const q of picks) {
    topicIds.add(q.topicId);
    q.keywords.forEach(pushKw);
  }

  const topics = [...topicIds]
    .map((id) => getTopicById(id))
    .filter((t): t is Topic => Boolean(t))
    .sort((a, b) => a.order - b.order);

  if (keywords.length === 0) {
    topics.slice(0, 2).forEach((t) => t.keywords.slice(0, 2).forEach(pushKw));
  }

  const query = `أريد البحث في ${topics.map((t) => t.title).join(" و")}، وأفيد بالكلمات: ${keywords
    .slice(0, 5)
    .join("، ")}.`;

  return { topics, keywords: keywords.slice(0, 8), query };
}

/** كل تركيبات المسارات الممكنة — تستخدمها الاختبارات. */
export function allQuestionnairePaths(): { areaId: string; refinementIds: string[] }[] {
  const paths: { areaId: string; refinementIds: string[] }[] = [];
  for (const area of QUESTIONNAIRE_AREAS) {
    const qs = REFINEMENT_QUESTIONS.filter((q) => q.areaId === area.id);
    paths.push({ areaId: area.id, refinementIds: [] });
    for (const q of qs) {
      paths.push({ areaId: area.id, refinementIds: [q.id] });
    }
    if (qs.length >= 2) {
      paths.push({ areaId: area.id, refinementIds: qs.map((q) => q.id) });
    }
  }
  return paths;
}

export function validateQuestionnaireTopics(): boolean {
  const ids = new Set(TOPICS.map((t) => t.id));
  return QUESTIONNAIRE_AREAS.every((a) => a.topicIds.every((id) => ids.has(id)));
}
