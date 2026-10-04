// اختبارات مباشرة لكاشف السلامة: صيغ الفعل من «انتحر»، بقاء «الموت» وحده
// خارج التفعيل، ومعاملة النفي لكل وقوع على حدة دون أن يخفي تأكيداً منفصلاً.

import { describe, expect, it } from "vitest";
import { detectSafetyRisk } from "@/lib/safety";

describe("كاشف السلامة — صيغ الفعل من «انتحر»", () => {
  it("يفعّل السلامة على العبارات النشطة المبلَّغ عنها", () => {
    for (const phrase of ["أريد أن أنتحر", "سأنتحر", "حا انتحر"]) {
      expect(detectSafetyRisk(phrase), phrase).toBe(true);
    }
  });

  it("يفعّل السلامة على الصيغ المصرَّفة الأخرى من الجذر نفسه", () => {
    for (const phrase of ["ينتحر صديقي", "أفكر أن انتحر", "من ينتحر فقد خسر"]) {
      expect(detectSafetyRisk(phrase), phrase).toBe(true);
    }
  });

  it("يبقي الاسم «انتحار» مفعِّلاً كما كان", () => {
    expect(detectSafetyRisk("أفكر في الانتحار")).toBe(true);
    expect(detectSafetyRisk("انتحار")).toBe(true);
  });
});

describe("كاشف السلامة — لا تفعيل للموضوع العام", () => {
  it("«الموت» وحده والخوف منه ليسا علامة خطر", () => {
    expect(detectSafetyRisk("الموت")).toBe(false);
    expect(detectSafetyRisk("الخوف من الموت")).toBe(false);
  });

  it("الأسئلة البحثية العامة عن أحكام العبادات لا تفعّل السلامة", () => {
    expect(detectSafetyRisk("ما شروط التوبة النصوح؟")).toBe(false);
  });
});

describe("كاشف السلامة — النفي لكل وقوع على حدة", () => {
  it("النفي الصريح الكامل يبقى غير مفعِّل", () => {
    expect(detectSafetyRisk("لا أريد الموت")).toBe(false);
    expect(detectSafetyRisk("لا اريد ان اموت")).toBe(false);
    expect(detectSafetyRisk("لا أتمنى الموت")).toBe(false);
    expect(detectSafetyRisk("ما ودي أموت")).toBe(false);
  });

  it("النفي لا يخفي عبارة خطرة مؤكدة منفصلة في الجملة نفسها", () => {
    expect(detectSafetyRisk("لا أريد الموت لكنني سأنتحر")).toBe(true);
    expect(detectSafetyRisk("ما ودي أموت بس حاسس إني حا انتحر")).toBe(true);
  });
});
