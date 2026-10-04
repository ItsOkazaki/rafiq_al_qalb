// تحقق وقت التشغيل من استجابة /api/research: القبول للشكل السليم
// والرفض لأي خلل في الحقول الجوهرية قبل العرض.

import { describe, expect, it } from "vitest";
import { parseResearchResult } from "@/lib/api-shape";

function validFixture() {
  return {
    outcome: "ok",
    query: "أشعر أن قلبي قاسٍ",
    topics: [{ topic: { id: "qaswat-al-qalb", title: "قسوة القلب" }, score: 5 }],
    keywords: ["قسوة القلب"],
    passages: [
      {
        chunkId: "dd-002",
        text: "نص المقطع المسترجع من المصدر المعتمد.",
        chapter: "فصل في ذم المعاصي",
        source: {
          sourceId: "albadr-daa-dawaa",
          slug: "al-daa-wal-dawaa",
          title: "الداء والدواء",
          author: "ابن قيم الجوزية",
          publisher: "موقع البدر",
          registryUrl: "https://www.al-badr.net/sub/376",
          originalUrl: "https://www.al-badr.net/sub/376",
        },
      },
    ],
    ai: { mode: "deterministic", text: "تنظيم آلي حتمي." },
    disclaimer: "إخلاء مسؤولية.",
    message: null,
    safety: null,
    fatwa: null,
    suggestions: [{ slug: "qaswat-al-qalb", title: "قسوة القلب" }],
  };
}

describe("التحقق من شكل استجابة البحث", () => {
  it("يقبل الاستجابة السليمة كاملة", () => {
    expect(parseResearchResult(validFixture())).not.toBeNull();
  });

  it("يرفض القيم غير الكائنية", () => {
    expect(parseResearchResult(null)).toBeNull();
    expect(parseResearchResult("نص")).toBeNull();
    expect(parseResearchResult([])).toBeNull();
  });

  it("يرفض نتيجة خارج القيم المعروفة", () => {
    const broken = { ...validFixture(), outcome: "weird-outcome" };
    expect(parseResearchResult(broken)).toBeNull();
  });

  it("يرفض غياب المصفوفات الجوهرية أو نوعها", () => {
    expect(parseResearchResult({ ...validFixture(), passages: "ليس مصفوفة" })).toBeNull();
    expect(parseResearchResult({ ...validFixture(), keywords: [1, 2] })).toBeNull();
    expect(parseResearchResult({ ...validFixture(), topics: "غير موجود" })).toBeNull();
  });

  it("يرفض مقطعاً بلا بيانات مصدر كاملة", () => {
    const broken = validFixture();
    broken.passages = [{ chunkId: "x", text: "نص", chapter: "فصل", source: { sourceId: "s" } }] as never;
    expect(parseResearchResult(broken)).toBeNull();
  });

  it("يرفض وضعاً غير صالح للذكاء", () => {
    expect(parseResearchResult({ ...validFixture(), ai: { mode: "سحري", text: "نص" } })).toBeNull();
    expect(parseResearchResult({ ...validFixture(), ai: null })).toBeNull();
  });
});
