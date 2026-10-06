// اختبارات النواة البحثية: المطابقة، الاسترجاع الفعلي، بيانات المصدر،
// تنفيذ الاعتماد والاستبعاد، حد الاسترجاع، الاستبانة، والامتناع.

import { describe, expect, it } from "vitest";
import { ALL_CHUNKS, CHUNKS } from "@/lib/corpus/chunks";
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
    // الاشتقاق من السجل نفسه: لا يُقبل إلا مصدر معتمد فعّال قابل للاسترجاع،
    // ولا تظهر الكتب المستبعدة أبداً.
    for (const passage of passages) {
      expect(isRetrievableSourceId(passage.source.sourceId)).toBe(true);
      expect(getSourceById(passage.source.sourceId)?.status).toBe("active");
      expect(isExcludedSourceTitle(passage.source.title)).toBe(false);
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

  it("الأدلة الفعلية تتقدم على مداخل الفهرسة، والسطر الفهرسي القصير لا يُسترجع", () => {
    const passages = retrievePassages(SAMPLE_QUERY, { limit: MAX_PASSAGES });
    expect(passages.length).toBeGreaterThan(0);
    for (const passage of passages) {
      expect(passage.text.trim().length).toBeGreaterThanOrEqual(40);
    }
    // إن وُجد مدخل فهرسي في النتيجة فلا يتقدم على دليل فعلي من نفس الصلة.
    const firstIndex = passages.findIndex((p) => p.role === "index");
    if (firstIndex >= 0) {
      const evidence = passages.filter((p) => p.role !== "index");
      for (const item of evidence) expect(item.score).toBeGreaterThanOrEqual(passages[firstIndex].score);
    }
  });

  it("ذكر القرآن دون طلب تفسيره لا يحصر الاسترجاع في مقاطع الآيات", () => {
    const passages = retrievePassages(SAMPLE_QUERY);
    expect(passages.some((p) => !p.quranText)).toBe(true);
  });

  it("طلب تفسير آية بعينها يبقى مقصوراً على مقاطع تحمل نص الآية ومرجعها", () => {
    const passages = retrievePassages("تفسير آية في قلوبهم مرض");
    expect(passages.length).toBeGreaterThan(0);
    for (const passage of passages) {
      expect(passage.quranText).toBeTruthy();
      expect(passage.quranReference).toBeTruthy();
    }
  });

  it("وسم الباب وحده لا يكفي: لا يُسترجع مقطع بلا دليل لفظي من السؤال", () => {
    // هذا المقطع يحمل وسم بابٍ يطابق سؤال المستخدم، لكن نصه وكلماته
    // المفتاحية لا تشترك مع السؤال في أي وحدة نصية — فلا يُسترجع.
    const tagOnly: CorpusChunk = {
      id: "tag-only-no-lexical",
      sourceId: "albadr-daa-dawaa",
      chapter: "فصل",
      excerptType: "curated-summary",
      topics: ["qaswat-al-qalb"],
      keywords: ["عبارة لا صلة لها بالسؤال البتة"],
      text: "نص طويل بما يكفي للعتبة لكنه لا يذكر أياً من مفردات سؤال المستخدم إطلاقاً حتى لا يتقاطع معه.",
    };
    const passages = retrievePassages("قسوة القلب", { corpus: [tagOnly] });
    expect(passages.some((p) => p.chunkId === "tag-only-no-lexical")).toBe(false);
  });

  it("المقطع الذي يشارك السؤال وحداته النصية يُسترجع وإن ساواه وسم الباب", () => {
    // المقطعان يحملان الوسم نفسه، لكن أحدهما فقط يشارك السؤال لفظياً.
    const tagOnly: CorpusChunk = {
      id: "tag-only-2",
      sourceId: "albadr-daa-dawaa",
      chapter: "فصل",
      excerptType: "curated-summary",
      topics: ["qaswat-al-qalb"],
      keywords: ["عبارة لا صلة لها بالسؤال البتة"],
      text: "نص طويل بما يكفي للعتبة لكنه لا يذكر أياً من مفردات سؤال المستخدم إطلاقاً حتى لا يتقاطع معه.",
    };
    const lexical: CorpusChunk = {
      id: "lexical-evidence-1",
      sourceId: "albadr-daa-dawaa",
      chapter: "فصل قسوة القلب",
      excerptType: "literal",
      topics: ["qaswat-al-qalb"],
      keywords: ["قسوة القلب"],
      text: "إن قسوة القلب من أعظم ما يصيب العبد، وعلاج قسوة القلب يكون بالذكر والتوبة وتلاوة القرآن بتدبر.",
    };
    const passages = retrievePassages("قسوة القلب", { corpus: [tagOnly, lexical] });
    expect(passages.some((p) => p.chunkId === "lexical-evidence-1")).toBe(true);
    expect(passages.some((p) => p.chunkId === "tag-only-2")).toBe(false);
  });

  it("مقاطع الجامع المولّدة تدخل ALL_CHUNKS بصفاتها الكاملة", async () => {
    const { ALL_CHUNKS } = await import("@/lib/corpus/chunks");
    const { GENERATED_ALIFTA_HTML_CHUNKS } = await import("@/lib/corpus/generated/alifta-html-chunks");
    const ids = new Set(ALL_CHUNKS.map((chunk) => chunk.id));
    expect(GENERATED_ALIFTA_HTML_CHUNKS.length).toBeGreaterThan(0);
    for (const chunk of GENERATED_ALIFTA_HTML_CHUNKS) {
      expect(ids.has(chunk.id)).toBe(true);
      expect(isRetrievableSourceId(chunk.sourceId)).toBe(true);
      expect(chunk.hadithFullText?.length ?? 0).toBeGreaterThan(60);
      expect(chunk.sourceUrl).toMatch(/BookToc\/ViewMatnPage|MatnService\/HadithServiceData|BookToc\/ViewServicePage/);
      expect(chunk.sourceUrl).not.toMatch(/Search\/|Subjects\//);
      if (chunk.explanationText) expect(chunk.explanationSourceUrl).toMatch(/^https:\/\/sunna\.alifta\.gov\.sa\//);
    }
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

describe("إسناد المادة إلى مؤلِّفها — لا يُنسب قولُ عالمٍ إلى غيره", () => {
  const sourceIds = (query: string) =>
    [...new Set(retrievePassages(query).map((p) => p.source.sourceId))];

  it("سؤال عن ابن القيم في أمراض القلوب لا يرجع بمادة ابن تيمية", () => {
    const ids = sourceIds("ما رأي ابن القيم في أمراض القلوب؟");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id === "albadr-daa-dawaa")).toBe(true);
    expect(ids).not.toContain("ibn-taymiyyah-amrad");
  });

  it("السؤال نفسه عن ابن تيمية يرجع بمادته هو", () => {
    const ids = sourceIds("ما رأي ابن تيمية في أمراض القلوب؟");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id === "ibn-taymiyyah-amrad")).toBe(true);
  });

  it("اسم المصدر في السؤال يحصر المادة في ذلك الكتاب", () => {
    const ids = sourceIds("أمراض القلوب وشفاؤها لابن تيمية");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id === "ibn-taymiyyah-amrad")).toBe(true);
  });

  it("مؤلِّف له مصدران مسجَّلان يرجع بمادته دون سواه", () => {
    const ids = sourceIds("ما رأي ابن باز في التوبة؟");
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id.startsWith("binbaz"))).toBe(true);
  });

  it("مؤلِّف غير مسجَّل → امتناع كامل، لا مادة منسوبة إليه بالخطأ", () => {
    for (const query of [
      "ما رأي الغزالي في الإسلام؟",
      "ما رأي النووي في الذكر؟",
      "ما رأي ابن كثير في تفسير آية الشفاء؟",
    ]) {
      expect(retrievePassages(query)).toHaveLength(0);
    }
  });

  it("لفظ الإسناد وحده لا يكفي لقبول مصدرٍ ما لم يرد اسم مؤلِّفه أو عنوانه", () => {
    // «ابن القيم» لا يجوز أن يُطابق «شيخ الإسلام ابن تيمية» عبر أداة مشتركة مثل «ابن»
    // أو عبر اسم عام مثل «الإمام».
    const ids = sourceIds("ما قول ابن القيم في شفاء أمراض القلوب؟");
    expect(ids.every((id) => id === "albadr-daa-dawaa")).toBe(true);
  });

  it("أدوات اسم المؤلِّف لا تُحتسب في مقام تغطية السؤال فلا تسبب امتناعاً كاذباً", () => {
    // كان «ابن» يُطلب وجوده داخل المتن، فيمتنع السؤال رغم وجود المادة.
    expect(retrievePassages("ما رأي ابن تيمية في أعمال القلوب؟").length).toBeGreaterThan(0);
    expect(retrievePassages("ما رأي ابن القيم في قسوة القلب؟").length).toBeGreaterThan(0);
  });

  it("الباب يعرف مفهوم «أمراض القلوب» الذي سُمّي به كتابان مسجَّلان", () => {
    const topics = identifyTopics("ما هي أمراض القلوب؟").map((t) => t.topic.id);
    expect(topics).toContain("qaswat-al-qalb");
  });
});

// انحدار على الاسترجاع: سؤال حكم فقهي خارج نطاق المادة كان يُعيد مقطع شرح طويل
// («عمدة القاري — الرحمة وقساوة القلب») لأن ألفاظاً فقهية عامة («حكم»، «صلاة»)
// تصادف ورودها داخل شرح من تسعة عشر ألف حرف. بوابة الفتوى تتقدم على الاسترجاع،
// وهذه الاختبارات تحرس الاسترجاع نفسه دفاعاً في العمق.
describe("الاسترجاع — سؤال فقهي خارج النطاق لا يُسند إلى شرح طويل", () => {
  const OUT_OF_SCOPE = [
    "حكم صلاة الحائض",
    "ما أخبار سوق الأسهم؟",
    "ما معنى كلمة حرام؟",
    "ما أخبار الحيض والصلاة؟",
  ];
  it.each(OUT_OF_SCOPE)("لا يعيد أي مقطع: %s", (q) => {
    expect(retrievePassages(q)).toHaveLength(0);
  });

  it("مقطع عمدة القاري للرحمة وقساوة القلب لا يُسند إلى سؤال الحيض والصلاة", () => {
    const ids = retrievePassages("حكم صلاة الحائض").map((p) => p.chunkId);
    expect(ids).not.toContain("alifta-html-000162");
  });

  it("وسم الباب يُحتسب لكل مقطع على حده لا للسؤال ككل", () => {
    // سؤال عن الغفلة يطابق باب الغفلة؛ مقطعٌ من باب الذكر وحده لا يُسند إليه
    // بمجرد اشتراك لفظ عابر، وإن طابق السؤال باباً آخر.
    const q = "ما أثر الغفلة على القلب في المادة المفهرسة؟";
    const matched = new Set(identifyTopics(q).map((m) => m.topic.id));
    expect(matched.has("al-ghafla")).toBe(true);
    for (const p of retrievePassages(q)) {
      const chunk = ALL_CHUNKS.find((c) => c.id === p.chunkId);
      const sharesDoor = (chunk?.topics ?? []).some((t) => matched.has(t));
      expect(sharesDoor, `${p.chunkId} — ${chunk?.chapter}`).toBe(true);
    }
  });
});
