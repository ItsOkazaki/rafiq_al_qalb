// اختبارات مسار البحث الكامل: السلامة أولاً، لا فتوى، الامتناع،
// المسار الحتمي بدون مفتاح، والتوليد المستند عند توفره (مع الحارس اللاحق).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runResearch } from "@/lib/research/pipeline";
import { ABSTAIN_MESSAGE, scanForForbiddenFraming } from "@/lib/terminology";
import { SYSTEM_PROMPT } from "@/lib/ai/provider";

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
    // المصادر المعتمدة المسموح بها في الاسترجاع
    const allowedSourceIds = new Set([
      "albadr-daa-dawaa",
      "binbaz-tawba-musaaib",
      "binbaz-majmou-fatawa",
      "ksu-quran-project",
      "sahih-bukhari",
      "ibn-taymiyyah-amrad",
    ]);
    for (const passage of result.passages) {
      expect(allowedSourceIds.has(passage.source.sourceId)).toBe(true);
      expect(passage.source.originalUrl).toMatch(/^https?:\/\//);
      expect(passage.chapter.length).toBeGreaterThan(3);
    }
    expect(result.disclaimer).toContain("ليست تشخيصاً");
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

  it("تعليمات النظام تفرض القيود المنهجية كلها", () => {
    for (const must of [
      "أداة حوارية",
      "لا تقدّم تشخيصاً",
      "لا تُصدر فتوى",
      "لا تخترع",
      "لا تستخدم أي معرفة خارج",
      "ميّز بوضوح",
      "قل ذلك صراحة",
    ]) {
      expect(SYSTEM_PROMPT).toContain(must);
    }
  });
});
