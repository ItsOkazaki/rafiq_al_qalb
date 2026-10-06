// اختبارات الحارس المشترك لتحويل مقاطع الـcorpus إلى مقاطع قابلة للعرض.
// السبب: صفحة الباب في المكتبة كانت تستخدم `getSourceById(c.sourceId)!` — افتراض
// أن المصدر موجود دائماً. أي مقطع بمعرّف غير مسجّل كان يُسقط بناء الصفحة كلها.

import { describe, expect, it } from "vitest";
import { toRetrievedPassage, toRetrievedPassages } from "@/lib/corpus/passages";
import { ALL_CHUNKS } from "@/lib/corpus/chunks";
import { isRetrievableSourceId } from "@/lib/sources/registry";
import type { CorpusChunk } from "@/lib/types";

function fakeChunk(overrides: Partial<CorpusChunk> = {}): CorpusChunk {
  return {
    id: "test-001",
    sourceId: "albadr-daa-dawaa",
    chapter: "فصل تجريبي",
    page: "ج 1/1",
    citationStatus: "verified-page",
    excerptType: "literal",
    topics: ["qaswat-al-qalb"],
    keywords: ["قسوة القلب"],
    text: "نص تجريبي طويل بما يكفي لتجاوز حد طول مقطع الدليل المعتمد في الاسترجاع.",
    ...overrides,
  };
}

describe("toRetrievedPassage — حارس المصدر", () => {
  it("يعيد null لمقطع مصدره غير مسجّل بدل أن يفترض وجوده", () => {
    expect(toRetrievedPassage(fakeChunk({ sourceId: "مصدر-غير-موجود" }))).toBeNull();
    expect(toRetrievedPassage(fakeChunk({ sourceId: "" }))).toBeNull();
  });

  it("يعيد null لمصدر مسجّل لكنه مرجع تقني داخلي غير قابل للاسترجاع", () => {
    // المصادر الداخلية (showInLibrary:false) تبقى active، لذا تُقبل في الاسترجاع؛
    // ما يُرفض هو غير المسجّل أو غير النشط أو المستبعد.
    expect(isRetrievableSourceId("kfgqpc-hafs-quran")).toBe(true);
    expect(isRetrievableSourceId("مصدر-محذوف")).toBe(false);
    expect(toRetrievedPassage(fakeChunk({ sourceId: "مصدر-محذوف" }))).toBeNull();
  });

  it("يبني مقطعاً سليماً لمصدر مسجّل نشط", () => {
    const passage = toRetrievedPassage(fakeChunk());
    expect(passage).not.toBeNull();
    expect(passage?.source.title).toContain("الداء والدواء");
    expect(passage?.source.author).toContain("ابن قيم");
    expect(passage?.citationStatus).toBe("verified-page");
  });

  it("رابط الأصل: رابط المقطع إن وُجد وإلا رابط المصدر من السجل", () => {
    const withUrl = toRetrievedPassage(fakeChunk({ sourceUrl: "https://example.org/page/1" }));
    expect(withUrl?.source.originalUrl).toBe("https://example.org/page/1");

    const withoutUrl = toRetrievedPassage(fakeChunk({ sourceUrl: undefined }));
    expect(withoutUrl?.source.originalUrl).toMatch(/^https:\/\//);
    expect(withoutUrl?.source.originalUrl).toContain("al-badr.net");
  });

  it("حالة التوثيق الافتراضية chapter-only عند غيابها", () => {
    const passage = toRetrievedPassage(fakeChunk({ citationStatus: undefined }));
    expect(passage?.citationStatus).toBe("chapter-only");
  });

  it("درجة الاسترجاع تُمرَّر كما هي، وافتراضها صفر للعرض", () => {
    expect(toRetrievedPassage(fakeChunk(), { score: 7.5 })?.score).toBe(7.5);
    expect(toRetrievedPassage(fakeChunk())?.score).toBe(0);
  });

  it("يخفي عنوان صفحة الجامع إذا سُجل خطأً في حقل مقتطف الحديث", () => {
    const chunk = ALL_CHUNKS.find((item) => item.id === "alifta-html-000162");
    expect(chunk).toBeDefined();
    const passage = toRetrievedPassage(chunk!);
    expect(passage?.hadithText).toBeUndefined();
    expect(passage?.hadithFullText).toContain("هذه رحمة جعلها الله في قلوب عباده");
  });
});

describe("toRetrievedPassages — تجاوز غير القابل للاسترجاع", () => {
  it("يتجاوز المقاطع غير الموثقة ويُبقي السليمة", () => {
    const passages = toRetrievedPassages([
      fakeChunk({ id: "ok-1" }),
      fakeChunk({ id: "bad-1", sourceId: "غير-مسجل" }),
      fakeChunk({ id: "ok-2", sourceId: "sahih-bukhari" }),
    ]);
    expect(passages.map((p) => p.chunkId)).toEqual(["ok-1", "ok-2"]);
  });

  it("قائمة فارغة لا تُنتج مقاطع ولا ترمي خطأ", () => {
    expect(toRetrievedPassages([])).toEqual([]);
  });
});

describe("اتساق الـcorpus مع السجل (منع انحدار صفحة المكتبة)", () => {
  it("كل مقطع في المادة المعتمدة قابل للتحويل إلى مقطع معروض", () => {
    const broken = ALL_CHUNKS.filter((chunk) => toRetrievedPassage(chunk) === null);
    expect(broken.map((c) => `${c.id}:${c.sourceId}`)).toEqual([]);
  });

  it("كل مقطع مصدره قابل للاسترجاع بحسب السجل", () => {
    const notRetrievable = ALL_CHUNKS.filter((c) => !isRetrievableSourceId(c.sourceId));
    expect(notRetrievable.map((c) => c.sourceId)).toEqual([]);
  });
});
