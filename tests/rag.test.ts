// اختبارات النواة البحثية: المطابقة، الاسترجاع الفعلي، بيانات المصدر،
// تنفيذ الاعتماد والاستبعاد، حد الاسترجاع، الاستبانة، والامتناع.

import { describe, expect, it } from "vitest";
import { CHUNKS } from "@/lib/corpus/chunks";
import {
  QUESTIONNAIRE_AREAS,
  REFINEMENT_QUESTIONS,
  allQuestionnairePaths,
  resolveQuestionnairePath,
  validateQuestionnaireTopics,
} from "@/lib/questionnaire";
import { extractKeywords } from "@/lib/rag/keywords";
import { identifyTopics, retrievePassages, MAX_PASSAGES } from "@/lib/rag/retrieve";
import { TOPICS } from "@/lib/rag/topics";
import {
  ACTIVE_SOURCES,
  APPROVED_SOURCES,
  EXCLUDED_SOURCES,
  getActiveSourceBySlug,
  getSourceById,
  isExcludedSourceTitle,
  isRetrievableSourceId,
} from "@/lib/sources/registry";
import type { CorpusChunk } from "@/lib/types";

const SAMPLE_QUERY = "أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن";
const BROAD_QUERY =
  "قسوة القلب والغفلة والذكر والتوبة والهم والنظر والشهوة والخشوع وآثار المعاصي";

describe("التصنيف الهرمي الموحّد — اثنا عشر باباً", () => {
  it("عدد الأبواب اثنا عشر بالضبط، بأسماء ومسارات وأرقام فريدة", () => {
    expect(TOPICS).toHaveLength(12);
    const ids = new Set(TOPICS.map((t) => t.id));
    const slugs = new Set(TOPICS.map((t) => t.slug));
    const titles = new Set(TOPICS.map((t) => t.title));
    const orders = TOPICS.map((t) => t.order).sort((a, b) => a - b);
    expect(ids.size).toBe(12);
    expect(slugs.size).toBe(12);
    expect(titles.size).toBe(12);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("كل باب مغطى بمقطعين على الأقل من المصدر المعتمد", () => {
    for (const t of TOPICS) {
      const covering = CHUNKS.filter((c) => c.topics[0] === t.id);
      expect(covering.length, `الباب ${t.title} أولوية مقاطعه`).toBeGreaterThanOrEqual(2);
      const anyCover = CHUNKS.filter((c) => c.topics.includes(t.id));
      expect(anyCover.length, `الباب ${t.title} كل مقاطعه`).toBeGreaterThanOrEqual(2);
    }
  });

  it("الأبواب المرتبطة تشير إلى أبواب موجودة، ولكل باب أسئلة ذات صلة", () => {
    const ids = new Set(TOPICS.map((t) => t.id));
    for (const t of TOPICS) {
      for (const r of t.related) expect(ids.has(r)).toBe(true);
      expect(t.relatedQuestions.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("مطابقة الموضوعات (تفسير بحثي لا تشخيصي)", () => {
  it("يفهم وصف «قلبي قاس» كموضوعي قسوة القلب والتأثر", () => {
    const matches = identifyTopics(SAMPLE_QUERY);
    const ids = matches.map((m) => m.topic.id);
    expect(ids).toContain("qaswat-al-qalb");
    expect(ids).toContain("khushu-tadabbur");
  });

  it("يفهم صيغة «لماذا يقسو القلب» كباب قسوة القلب", () => {
    const matches = identifyTopics("لماذا يقسو القلب؟");
    expect(matches.map((m) => m.topic.id)).toContain("qaswat-al-qalb");
  });

  it("يفهم «أشعر أنني بعيد عن ربي» كباب الغفلة أو الذكر", () => {
    const matches = identifyTopics("أشعر أنني بعيد عن ربي بشكل غريب مؤخرا ولا أعرف لماذا");
    const ids = matches.map((m) => m.topic.id);
    expect(ids.some((id) => id === "al-ghafla" || id === "dhikr-athar")).toBe(true);
  });

  it("يحدد موضوع الهم والقلق", () => {
    const matches = identifyTopics("أبحث في الهم وضيق الصدر");
    expect(matches.map((m) => m.topic.id)).toContain("al-hamm-wal-qalaq");
  });

  it("يحدد باب تكرار الذنب والانتكاس", () => {
    const matches = identifyTopics("أتوب ثم أعود إلى نفس الذنب");
    expect(matches.map((m) => m.topic.id)).toContain("takrar-al-dhanb");
  });

  it("يفهم أيضاً صيغة الرجوع إلى نفس الذنب", () => {
    const matches = identifyTopics("أرجع لنفس الذنب كل مرة");
    expect(matches.map((m) => m.topic.id)).toContain("takrar-al-dhanb");
  });

  it("يفهم الصيغة الموصوفة مع طلب مادة علمية", () => {
    const matches = identifyTopics("أرجع لنفس الذنب كل مرة، وأبحث عن مادة علمية");
    expect(matches.map((m) => m.topic.id)).toContain("takrar-al-dhanb");
  });

  it("لا يوصم المستخدم: المخرجات عناوين موضوعات فقط", () => {
    const matches = identifyTopics(SAMPLE_QUERY);
    for (const m of matches) {
      expect(m.topic.title).not.toMatch(/أنت|حالتك|مصاب/);
    }
  });
});

describe("الكلمات المفتاحية", () => {
  it("يقترح كلمات مفتاحية مرتبطة", () => {
    const topics = identifyTopics(SAMPLE_QUERY);
    const keywords = extractKeywords(SAMPLE_QUERY, topics, []);
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords.join(" ")).toMatch(/قسوة القلب|لين القلب/);
  });
});

describe("الاسترجاع الفعلي من المادة المعتمدة", () => {
  it("يسترجع مقاطع حقيقية — لا مجرد روابط", () => {
    const passages = retrievePassages(SAMPLE_QUERY);
    expect(passages.length).toBeGreaterThan(0);
    for (const p of passages) {
      expect(p.text.length).toBeGreaterThan(40);
    }
  });

  it("كل مقطع يحمل بيانات المصدر الرسمي والموضع كاملة", () => {
    const passages = retrievePassages(SAMPLE_QUERY);
    const allowedIds = new Set([
      "albadr-daa-dawaa",
      "binbaz-tawba-musaaib",
      "binbaz-majmou-fatawa",
      "ksu-quran-project",
    ]);
    for (const passage of passages) {
      expect(allowedIds.has(passage.source.sourceId)).toBe(true);
      expect(passage.source.title.length).toBeGreaterThan(8);
      expect(passage.source.author.length).toBeGreaterThan(8);
      expect(passage.source.originalUrl).toMatch(/^https?:\/\//);
      expect(passage.chapter.length).toBeGreaterThan(3);
    }
  });

  it("يطبق حد الاسترجاع الأقصى (RAG limit)", () => {
    const passages = retrievePassages(BROAD_QUERY);
    expect(passages.length).toBeGreaterThan(2);
    expect(passages.length).toBeLessThanOrEqual(MAX_PASSAGES);
  });

  it("يعطي موضوع تكرار الذنب مقاطع بحثية مخصصة", () => {
    const passages = retrievePassages("تكرار الذنب والانتكاس");
    expect(passages.map((p) => p.chunkId)).toEqual(expect.arrayContaining(["dd-004"]));
  });

  it("المادة المفهرسة كلها من المصدر الوحيد الفعّال", () => {
    for (const c of CHUNKS) {
      const src = getSourceById(c.sourceId);
      expect(src).toBeDefined();
      expect(src!.status).toBe("active");
    }
  });
});

describe("تنفيذ الاعتماد والاستبعاد", () => {
  const fakeLegacy: CorpusChunk = {
    id: "legacy-1",
    sourceId: "legacy-ihya",
    chapter: "غير معروف",
    excerptType: "curated-summary",
    topics: ["qaswat-al-qalb"],
    keywords: ["قسوة القلب"],
    text: "نص قديم من كتاب غير معتمد يجب ألا يظهر إطلاقاً مهما طابقت الكلمات الاستعلام.",
  };

  it("يرفض الاسترجاع من مصدر غير مسجل", () => {
    expect(isRetrievableSourceId("legacy-ihya")).toBe(false);
  });

  it("لا يعامل فهرس ابن باز العام كمصدر مفهرس؛ يستخدم الكتاب المحدد فقط", () => {
    expect(isRetrievableSourceId("binbaz-books")).toBe(false);
    expect(getActiveSourceBySlug("binbaz-books")).toBeUndefined();
    expect(isRetrievableSourceId("binbaz-tawba-musaaib")).toBe(true);
    expect(isRetrievableSourceId("binbaz-majmou-fatawa")).toBe(true);
    expect(getActiveSourceBySlug("wujub-al-tawba-ind-al-musaaib")).toBeDefined();
    expect(getActiveSourceBySlug("majmou-fatawa-wa-maqalat")).toBeDefined();
    expect(CHUNKS.filter((chunk) => chunk.sourceId === "binbaz-tawba-musaaib")).toHaveLength(6);
    const majmouChunks = CHUNKS.filter((chunk) => chunk.sourceId === "binbaz-majmou-fatawa");
    expect(majmouChunks).toHaveLength(11);
    expect(CHUNKS.filter((chunk) => chunk.sourceId.startsWith("binbaz-"))).toHaveLength(17);
    for (const chunk of majmouChunks) {
      expect(chunk.citationStatus).toBe("verified-page");
      expect(chunk.excerptType).toBe("literal");
      expect(chunk.page).toMatch(/^مجموع الفتاوى \d+\/\d+$/);
      expect(chunk.sourceUrl).toMatch(/^https:\/\/binbaz\.org\.sa\/fatwas\//);
    }
  });

  it("كل مصدر ظاهر للمستخدم فعّال وله مقاطع مفهرسة فعلية", () => {
    expect(ACTIVE_SOURCES.length).toBeGreaterThan(0);
    for (const source of ACTIVE_SOURCES) {
      expect(source.status).toBe("active");
      expect(CHUNKS.some((chunk) => chunk.sourceId === source.id)).toBe(true);
    }
  });

  it("يقبل المصدر الفعال المعتمد فقط", () => {
    expect(isRetrievableSourceId("albadr-daa-dawaa")).toBe(true);
  });

  it("يستبعد مقطعاً يطابق الاستعلام إن كان من كتاب قديم غير مسجل", () => {
    const passages = retrievePassages("قسوة القلب ولين القلب", { corpus: [...CHUNKS, fakeLegacy] });
    expect(passages.every((p) => p.chunkId !== "legacy-1")).toBe(true);
  });

  it("الكتب المستبعدة معروفة بالاسم ومرفوضة", () => {
    for (const ex of EXCLUDED_SOURCES) {
      expect(isExcludedSourceTitle(ex.title)).toBe(true);
    }
    expect(isExcludedSourceTitle("إحياء علوم الدين بتحقيق ما")).toBe(true);
    expect(isExcludedSourceTitle("مدارج السالكين بين منازل إياك نعبد")).toBe(true);
    expect(isExcludedSourceTitle("صيد الخاطر")).toBe(true);
    expect(isExcludedSourceTitle("كتاب العبودية")).toBe(true);
  });

  it("لا تظهر الكتب المستبعدة ضمن سجل المعتمدين", () => {
    for (const src of APPROVED_SOURCES) {
      expect(isExcludedSourceTitle(src.title)).toBe(false);
    }
  });
});

describe("الاستبانة البحثية — مسارات بحث لا أسئلة مرضية", () => {
  it("كل الأسئلة ملاحية («هل تريد البحث») ولا تشخيصية", () => {
    const allQuestions = [
      ...QUESTIONNAIRE_AREAS.map((a) => a.question),
      ...REFINEMENT_QUESTIONS.map((q) => q.question),
    ];
    for (const q of allQuestions) {
      expect(q.startsWith("هل")).toBe(true);
      expect(q).not.toMatch(/شدة|تعاني من|أعراضك|مرضك|حالتك/);
    }
  });

  it("كل تركيبة مسار تنتج موضوعات معتمدة وكلمات مفتاحية", () => {
    expect(validateQuestionnaireTopics()).toBe(true);
    const validIds = new Set(TOPICS.map((t) => t.id));
    for (const path of allQuestionnairePaths()) {
      const result = resolveQuestionnairePath(path.areaId, path.refinementIds);
      expect(result).not.toBeNull();
      expect(result!.topics.length).toBeGreaterThan(0);
      expect(result!.keywords.length).toBeGreaterThan(0);
      for (const t of result!.topics) expect(validIds.has(t.id)).toBe(true);
      expect(result!.query.length).toBeGreaterThan(10);
    }
  });

  it("مسار غير معروف → لا نتيجة (لا اختراع)", () => {
    expect(resolveQuestionnairePath("no-such-area", [])).toBeNull();
  });
});
