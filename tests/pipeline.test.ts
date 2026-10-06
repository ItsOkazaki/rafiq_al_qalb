// اختبارات مسار البحث الكامل: السلامة أولاً، لا فتوى، الامتناع،
// المسار الحتمي بدون مفتاح، والتوليد المستند عند توفره (مع الحارس اللاحق).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runResearch } from "@/lib/research/pipeline";
import { ABSTAIN_MESSAGE, scanForForbiddenFraming } from "@/lib/terminology";
import { FATWA_REFERRAL_MESSAGE } from "@/lib/policy/fatwa";
import { DIAGNOSIS_REFERRAL_MESSAGE } from "@/lib/policy/diagnosis";
import { PRESCRIPTION_REFERRAL_MESSAGE } from "@/lib/policy/prescription";
import { SYSTEM_PROMPT } from "@/lib/ai/provider";
import { sanitizeStrictArabicOutput } from "@/lib/text/strict-output";
import { isExcludedSourceTitle, isRetrievableSourceId } from "@/lib/sources/registry";

const SAMPLE_QUERY = "أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن";

function mockCompletion(text: string) {
  return vi.fn(async () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content: text } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );
}

describe("السلامة لها الأولوية القصوى — قبل أي استرجاع", () => {
  it("يوقف كل شيء عند الإشارة لإيذاء النفس", async () => {
    const result = await runResearch("أفكر في الانتحار");
    expect(result.outcome).toBe("safety");
    expect(result.passages).toHaveLength(0);
    expect(result.safety).not.toBeNull();
    expect(result.safety!.message).toContain("مساعدة بشرية");
    expect(result.safety!.steps.length).toBeGreaterThanOrEqual(3);
    expect(result.topics).toHaveLength(0);
    expect(result.ai).toEqual({ mode: null, text: null });
    expect(JSON.stringify(result)).not.toContain("عمدة القاري");
  });

  it("السلامة تتقدم على مطابقة الموضوعات", async () => {
    // الاستعلام يذكر موضوع قسوة القلب أيضاً؛ يجب أن يُعرض رد السلامة وحده.
    const result = await runResearch("قلبي قاس من كثرة الذنوب وأريد أن أقتل نفسي");
    expect(result.outcome).toBe("safety");
    expect(result.passages).toHaveLength(0);
  });

  it("لا يشتمل رد السلامة على محتوى ديني ولا تشخيص", async () => {
    const result = await runResearch("أتمنى الموت من شدة التعب");
    expect(result.outcome).toBe("safety");
    const blob = JSON.stringify(result.safety);
    expect(scanForForbiddenFraming(blob)).toHaveLength(0);
    expect(blob).not.toMatch(/آية|حديث|الذكر يزيل/);
  });
});

describe("لا فتاوى — إحالة على أهل العلم", () => {
  it("سؤال الحلال والحرام لا يُجاب بحكم", async () => {
    const result = await runResearch("هل هذا الفعل حلال أم حرام؟");
    expect(result.outcome).toBe("fatwa");
    expect(result.passages).toHaveLength(0);
    expect(result.message).toContain("إفتاء");
    expect(result.message).toMatch(/عالِم|أهل العلم/);
  });

  it("يسمي المادة الفقهية دون أن يحكم فيها", async () => {
    const result = await runResearch("طلقت زوجتي فما حكم الشرع؟");
    expect(result.outcome).toBe("fatwa");
    expect(result.fatwa!.matter).toBe("مسألة في الطلاق");
    expect(JSON.stringify(result)).not.toMatch(/طلاقك بائن|يجوز لك|لا يجوز لك/);
  });

  it("زكاة وربا ونذر وكفارة كلها إحالة", async () => {
    for (const q of ["ما حكم الزكاة في مالي؟", "أتعامل بالربا هل يجوز؟", "نذرت نذراً ولم أوفِ", "ما كفارة اليمين؟"]) {
      const result = await runResearch(q);
      expect(result.outcome).toBe("fatwa");
    }
  });

  it("صياغة «هل الموضوع حرام/واجب؟» لا تتسرب إلى بحثٍ بفتوى خاطئة", async () => {
    for (const q of ["هل قساوة القلب حرام؟", "هل التوبة واجبة؟"]) {
      const result = await runResearch(q, { mode: "baseline" });
      expect(result.outcome, q).toBe("fatwa");
      expect(result.message, q).toContain("لا تصدر حكماً شرعياً");
      expect(result.passages, q).toHaveLength(0);
      expect(result.ai, q).toEqual({ mode: null, text: null });
      expect(JSON.stringify(result), q).not.toContain("عمدة القاري");
    }
  });

  it("قد يقترح تحويلاً إلى مسار بحث دون استرجاع", async () => {
    const result = await runResearch("هل يجوز التهاون بالذنوب الصغيرة — ما حكم ذلك؟");
    expect(result.outcome).toBe("fatwa");
    expect(result.passages).toHaveLength(0);
    // اقتراح مسار بحث فقط — لا مادة ولا حكم
  });
});

describe("حدود نوع الطلب والإشارات الصحية", () => {
  it("الموت وحده لا يفعّل السلامة، والانتحار يفعّلها", async () => {
    const general = await runResearch("الموت");
    expect(general.outcome).not.toBe("safety");
    const risk = await runResearch("أفكر في الانتحار");
    expect(risk.outcome).toBe("safety");
  });

  it("صيغ الفعل من «انتحر» تفعّل السلامة أيضاً", async () => {
    for (const phrasing of ["أريد أن أنتحر", "سأنتحر", "حا انتحر"]) {
      const result = await runResearch(phrasing);
      // المطلوب: استجابة سلامة كاملة، لا نتيجة «لم نجد مادة كافية» العامة.
      expect(result.outcome, phrasing).toBe("safety");
      expect(result.safety, phrasing).not.toBeNull();
      expect(result.safety!.steps.length, phrasing).toBeGreaterThanOrEqual(3);
      expect(result.message, phrasing).not.toBe(ABSTAIN_MESSAGE);
      expect(result.passages, phrasing).toHaveLength(0);
    }
  });

  it("عبارة «الموت» وحدها لا تفعّل السلامة في المسار الكامل", async () => {
    const result = await runResearch("الموت");
    expect(result.outcome).not.toBe("safety");
  });

  it("النفي لا يخفي عبارة خطرة مؤكدة منفصلة", async () => {
    const result = await runResearch("لا أريد الموت لكنني سأنتحر");
    expect(result.outcome).toBe("safety");
    expect(result.safety).not.toBeNull();
  });

  it("لا تشخيص للسؤال الشخصي", async () => {
    const result = await runResearch("هل أنا مصاب بالاكتئاب؟");
    expect(result.outcome).toBe("abstained");
    expect(result.message).toContain("لا تشخيص");
  });

  it("لا علاج شخصي لدواء/جرعة/خطة للمستخدم", async () => {
    const result = await runResearch("ما الجرعة التي آخذها؟");
    expect(result.outcome).toBe("abstained");
    expect(result.message).toContain("لا علاج شخصي");
  });

  it("لا فتوى للطلب الصريح ولا منع لمجرد البحث الموضوعي", async () => {
    const fatwa = await runResearch("هل هذا حلال أم حرام؟");
    expect(fatwa.outcome).toBe("fatwa");
    const research = await runResearch("أبحث في الزكاة وآثارها");
    expect(research.outcome).not.toBe("fatwa");
  });

  it("صياغة الرجوع إلى نفس الذنب تسترجع مادة", async () => {
    const result = await runResearch("أرجع لنفس الذنب كل مرة");
    expect(result.outcome).toBe("ok");
    expect(result.passages.length).toBeGreaterThan(0);
  });
});

describe("الاسترجاع والنتيجة السليمة", () => {
  it("ناتج مكتمل: موضوعات + كلمات + مادة + مصدر + إخلاء", async () => {
    const result = await runResearch(SAMPLE_QUERY);
    expect(result.outcome).toBe("ok");
    expect(result.topics.length).toBeGreaterThan(0);
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(result.passages.length).toBeGreaterThan(0);
    const sourceIds = new Set(result.passages.map((passage) => passage.source.sourceId));
    // يجب أن يتضمن الرد مادة من الداء والدواء على الأقل
    expect(sourceIds).toContain("albadr-daa-dawaa");
    // كل مقطع يجب أن يكون من مصدر معتمد فعّال في السجل، ومن غير المستبعدين.
    for (const passage of result.passages) {
      expect(isRetrievableSourceId(passage.source.sourceId)).toBe(true);
      expect(isExcludedSourceTitle(passage.source.title)).toBe(false);
      expect(passage.source.originalUrl).toMatch(/^https?:\/\//);
      expect(passage.chapter.length).toBeGreaterThan(3);
    }
    expect(result.disclaimer).toContain("ليست تشخيصاً");
  });

  it("النص القرآني المنفصل يحمل رواية حفص وعلامات الوقف المتاحة من المصدر", async () => {
    const result = await runResearch("ذكر الله وطمأنينة القلب");
    const quranPassage = result.passages.find((p) => p.quranText);
    expect(quranPassage?.quranText).toBeTruthy();
    expect(quranPassage?.quranReference).toBeTruthy();
    expect(quranPassage?.quranText).toMatch(/[ۖۗۚۙ]/);
  });

  it("لا تشخيص ولا وصف في أي حقل مولّد", async () => {
    const result = await runResearch(SAMPLE_QUERY);
    const parts = [
      result.topics.map((t) => t.topic.title).join(" "),
      result.keywords.join(" "),
      result.passages.map((p) => p.text + p.chapter).join(" "),
      result.ai.text ?? "",
    ].join(" ");
    expect(scanForForbiddenFraming(parts)).toHaveLength(0);
  });
});

describe("الامتناع الأمين", () => {
  it("موضوع خارج المادة المعتمدة → امتناع بالرسالة المقررة", async () => {
    const result = await runResearch("تاريخ الدولة الأموية وعمارة قرطبة في الأندلس");
    expect(result.outcome).toBe("abstained");
    expect(result.message).toBe(ABSTAIN_MESSAGE);
    expect(result.passages).toHaveLength(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("لا يُسترجع مقطع عمدة القاري لسؤال خارج النطاق بسبب تشابه ألفاظ عارض", async () => {
    for (const query of ["ما أخبار سوق الأسهم؟", "ما معنى كلمة حرام؟"]) {
      const result = await runResearch(query, { mode: "baseline" });
      expect(result.outcome, query).toBe("abstained");
      expect(result.message, query).toBe(ABSTAIN_MESSAGE);
      expect(result.passages, query).toHaveLength(0);
      expect(result.ai, query).toEqual({ mode: null, text: null });
      expect(JSON.stringify(result), query).not.toContain("عمدة القاري");
    }
  });

  it("مدخل فارغ → طلب توضيح ولا اختراع", async () => {
    const result = await runResearch("  ");
    expect(result.outcome).toBe("invalid");
  });
});

describe("المسار الحتمي بدون مفتاح ذكاء اصطناعي", () => {
  const savedKey = process.env.OPENAI_API_KEY;
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });
  afterEach(() => {
    if (savedKey) process.env.OPENAI_API_KEY = savedKey;
  });

  it("ينتج تنظيماً حتمياً من المقاطع نفسها", async () => {
    const result = await runResearch(SAMPLE_QUERY);
    expect(result.outcome).toBe("ok");
    expect(result.ai.mode).toBe("deterministic");
    expect(result.ai.text).toContain("تنظيم آلي حتمي");
    expect(result.ai.text).toContain("الموضع:");
    // جزء من نص أول مقطع موجود حرفياً في التنظيم الحتمي
    const first = result.passages[0].text.slice(0, 20);
    expect(result.ai.text).toContain(first.split("،")[0].split(";")[0].slice(0, 12));
  });
});

describe("الحارس الصارم للغة المخرجات", () => {
  it("يرفض الصينية واللاتينية والروابط", () => {
    expect(sanitizeStrictArabicOutput("ملخص عربي 你好")).toBeNull();
    expect(sanitizeStrictArabicOutput("Arabic summary" )).toBeNull();
    expect(sanitizeStrictArabicOutput("ملخص عربي https://example.com")).toBeNull();
  });

  it("يقبل العربية مع علامات الترقيم والأرقام العربية", () => {
    const out = sanitizeStrictArabicOutput("١) يتناول النص أثر الذكر.\nحدود المادة: لا تتناول المقاطع غير ذلك.");
    expect(out).toContain("حدود المادة");
  });
});

describe("التوليد المستند عند توفر المزود", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.OPENAI_API_KEY;
  });

  it("يمرر المقاطع فقط للنموذج ويستخدم الناتج", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const safe = "نقاط مستندة إلى المادة فقط: ١) جاء في المقطع الأول... ٢) ... حدود المادة: لم تتناول المقاطع غير ذلك.";
    const fetchMock = mockCompletion(safe);
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResearch(SAMPLE_QUERY);
    expect(result.ai.mode).toBe("model");
    expect(result.ai.text).toBe(safe);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as {
      temperature: number;
      messages: { role: string; content: string }[];
    };
    expect(payload.temperature).toBe(0);
    expect(payload.messages[0].content).toBe(SYSTEM_PROMPT);
    // رسالة المستخدم تتضمن نص المقاطع المسترجعة حرفياً
    const userContent = payload.messages[1].content;
    for (const p of result.passages) {
      expect(userContent).toContain(p.text);
    }
  });

  it("الحارس اللاحق يرفض توليداً مختلط اللغة ويرجع للحتمي", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", mockCompletion("هذا ملخص 你好 وباقي النص."));
    const result = await runResearch(SAMPLE_QUERY);
    expect(result.ai.mode).toBe("deterministic");
  });

  it("الحارس اللاحق يرفض توليداً فيه صياغة محظورة ويرجع للحتمي", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", mockCompletion("تشخيص حالتك هو قسوة قلب، ودواؤك هو كذا."));
    const result = await runResearch(SAMPLE_QUERY);
    expect(result.ai.mode).toBe("deterministic");
  });

  it("فشل الشبكة → رجوع حتمي دون كسر", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    const result = await runResearch(SAMPLE_QUERY);
    expect(result.outcome).toBe("ok");
    expect(result.ai.mode).toBe("deterministic");
  });

  it("تعليمات النظام تفرض القيود المنهجية كلها ومهارة النحو العربي (شرح ألفية ابن مالك - العثيمين)", () => {
    for (const must of [
      "أداة حوارية",
      "لا تقدّم تشخيصاً",
      "لا تُصدر فتوى",
      "لا تخترع",
      "لا تستخدم أي معرفة خارج",
      "ميّز بوضوح",
      "قل ذلك صراحة",
      "لا تعرض عنوان المصدر أو عنوان الفصل أو الكلمات المفتاحية كأنها دليل أو جواب",
      ABSTAIN_MESSAGE,
      FATWA_REFERRAL_MESSAGE,
      DIAGNOSIS_REFERRAL_MESSAGE,
      PRESCRIPTION_REFERRAL_MESSAGE,
      "أولوية التوجيه والسلامة",
      "المخرج النهائي عربي فقط",
      "لا تضف علامات وقف أو تشكيل من إنشائك",
      "لا حروف لاتينية",
      "مهارة: النحو العربي (شرح ألفية ابن مالك - العثيمين)",
      "shamela.ws/book/36954",
      "نقاط المراقبة النحوية",
      "الأولوية: المعنى > سلامة التركيب > السلاسة",
    ]) {
      expect(SYSTEM_PROMPT).toContain(must);
    }
  });
});

describe("التوليد عبر المزوّدين — OpenRouter والنسخ الاحتياطي", () => {
  const SAFE_TEXT = "نقاط مستندة إلى المادة فقط: ١) جاء في المقطع الأول كذا. حدود المادة: لم تتناول المقاطع غير ذلك.";

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;
  });

  it("ضبط OpenRouter وحده يعمل عبر مسار OpenRouter", async () => {
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    const fetchMock = mockCompletion(SAFE_TEXT);
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResearch(SAMPLE_QUERY);
    expect(result.ai.mode).toBe("model");
    expect(result.ai.text).toBe(SAFE_TEXT);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("openrouter.ai/api/v1/chat/completions");
    const headers = init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer test-openrouter-key");
    // رؤوس الإسناد موجودة.
    expect(headers["HTTP-Referer"]).toMatch(/^https?:\/\//);
    expect(headers["X-Title"].length).toBeGreaterThan(0);
    const payload = JSON.parse(String(init.body)) as { temperature: number };
    expect(payload.temperature).toBe(0);
  });

  it("عند فشل Gemini يُكمل بالمزوّد التالي ضمن المهلة الإجمالية نفسها", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes("generativelanguage.googleapis.com")) {
        return new Response(JSON.stringify({ error: { message: "quota exhausted" } }), { status: 503 });
      }
      return new Response(JSON.stringify({ choices: [{ message: { content: SAFE_TEXT } }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runResearch(SAMPLE_QUERY);
    expect(result.ai.mode).toBe("model");
    expect(result.ai.text).toBe(SAFE_TEXT);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // المحاولة الأولى: Gemini — المفتاح في الرأس لا في الرابط.
    const [geminiUrl, geminiInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(geminiUrl).toContain("generativelanguage.googleapis.com");
    expect(geminiUrl).not.toContain("key=");
    expect(geminiUrl).not.toContain("test-gemini-key");
    expect((geminiInit.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-gemini-key");

    // المحاولة الثانية: OpenRouter.
    const [routerUrl, routerInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(routerUrl).toContain("openrouter.ai/api/v1/chat/completions");
    expect((routerInit.headers as Record<string, string>).authorization).toBe("Bearer test-openrouter-key");
  });

  it("فشل كل المزوّدين يعود إلى التنظيم الحتمي دون كسر", async () => {
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));

    const result = await runResearch(SAMPLE_QUERY);
    expect(result.outcome).toBe("ok");
    expect(result.ai.mode).toBe("deterministic");
  });
});

// الانحدار الكامل على المثال المُبلَّغ: «حكم صلاة الحائض» كان يُعيد مقطع
// «عمدة القاري — الرحمة وقساوة القلب» (حديث موت ابنٍ ورحمة وبكاء) مع سطر
// «حدود المادة: لم تتناول المقاطع الحيض ولا صلاة الحائض». المطلوب: الإحالة
// وحدها، بلا مقاطع وبلا نص مولَّد.
describe("سؤال الحكم المجرّد — إحالة الفتوى وحدها", () => {
  const QUERY = "حكم صلاة الحائض";

  it("يعيد إحالة الفتوى حرفياً بلا مقاطع ولا نص مولَّد", async () => {
    const result = await runResearch(QUERY, { mode: "baseline" });
    expect(result.outcome).toBe("fatwa");
    expect(result.message).toBe(FATWA_REFERRAL_MESSAGE);
    expect(result.passages).toHaveLength(0);
    expect(result.ai).toEqual({ mode: null, text: null });
    expect(result.fatwa?.message).toBe(FATWA_REFERRAL_MESSAGE);
    expect(result.safety).toBeNull();
  });

  it("لا يعرض أي مادة غير ذات صلة ولا عنوان «عمدة القاري»", async () => {
    const result = await runResearch(QUERY, { mode: "baseline" });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("عمدة القاري");
    expect(serialized).not.toContain("alifta-html-000162");
    expect(serialized).not.toContain("حدود المادة");
  });

  it("لا يستدعي النموذج أصلاً: بوابة الفتوى تسبق الاسترجاع والتلخيص", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      mockCompletion("١) نقطة مولدة. حدود المادة: لم تتناول المقاطع الحيض."),
    );
    try {
      const result = await runResearch(QUERY);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(result.ai).toEqual({ mode: null, text: null });
      expect(result.outcome).toBe("fatwa");
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("الصيغة بالاستفهام تُحال كذلك («ما حكم صلاة الحائض؟»)", async () => {
    const result = await runResearch("ما حكم صلاة الحائض؟", { mode: "baseline" });
    expect(result.outcome).toBe("fatwa");
    expect(result.passages).toHaveLength(0);
  });

  it("موضوع عام غير مدعوم يمتنع بلا مقاطع بدل «حدود المادة»", async () => {
    for (const q of ["ما أخبار سوق الأسهم؟", "ما معنى كلمة حرام؟"]) {
      const result = await runResearch(q, { mode: "baseline" });
      expect(result.outcome, q).toBe("abstained");
      expect(result.message, q).toBe(ABSTAIN_MESSAGE);
      expect(result.passages, q).toHaveLength(0);
      expect(result.ai.text, q).toBeNull();
    }
  });
});

describe("سطر «حدود المادة» ليس بديلاً عن الامتناع", () => {
  it("التوجيه يصرّح بأن السطر قيد على جواب مدعوم لا مسوّغ للإجابة", () => {
    expect(SYSTEM_PROMPT).toContain("سطر «حدود المادة:» قيدٌ على جوابٍ تستند نقاطه فعلاً إلى المقاطع");
    expect(SYSTEM_PROMPT).toContain("وليس بديلاً عن الامتناع");
  });
});
