// اختبارات حدود /api/research: العدّاد المحلي، مفتاح العميل المشتق بـHMAC،
// حد حجم الجسم (٨ ك.ب)، حد نص البحث، وسلوك المسار الكامل عند التجاوز.

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  clientKeyFor,
  consumeLocalBucket,
  resetLocalBuckets,
  resetSecretCache,
  windowStart,
} from "@/lib/rate-limit";
import { MAX_BODY_BYTES, readCappedBody } from "@/lib/http-limits";

vi.mock("@/lib/research/pipeline", () => ({
  runResearch: vi.fn(async () => ({
    outcome: "ok",
    query: "نص اختبار",
    topics: [],
    keywords: [],
    passages: [],
    ai: { mode: "deterministic", text: "تنظيم آلي." },
    disclaimer: "إخلاء",
    message: null,
    safety: null,
    fatwa: null,
    suggestions: [],
  })),
}));

import { POST } from "@/app/api/research/route";

function post(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/research", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("العدّاد المحلي لحد المعدل", () => {
  it("يسمح بثلاثين طلباً في النافذة ويرفض الحادي والثلاثين", () => {
    const now = windowStart(Date.now()) + 5_000;
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      expect(consumeLocalBucket("client-a", now).allowed, `طلب ${i + 1}`).toBe(true);
    }
    const blocked = consumeLocalBucket("client-a", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("نافذة جديدة تعيد العدّاد، وعميل آخر لا يتأثر", () => {
    const now = windowStart(Date.now()) + 1_000;
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) consumeLocalBucket("client-b", now);
    expect(consumeLocalBucket("client-b", now).allowed).toBe(false);
    expect(consumeLocalBucket("client-b", now + RATE_LIMIT_WINDOW_MS).allowed).toBe(true);
    expect(consumeLocalBucket("client-c", now).allowed).toBe(true);
  });
});

describe("مفتاح العميل المشتق بـHMAC", () => {
  it("حتمي للتركيبة نفسها، ومختلف لكل عنصر", () => {
    const base = clientKeyFor("secret-1", "1.2.3.4", "agent");
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    expect(clientKeyFor("secret-1", "1.2.3.4", "agent")).toBe(base);
    expect(clientKeyFor("secret-1", "1.2.3.4", "agent-other")).not.toBe(base);
    expect(clientKeyFor("secret-1", "5.6.7.8", "agent")).not.toBe(base);
    expect(clientKeyFor("secret-2", "1.2.3.4", "agent")).not.toBe(base);
  });
});

describe("حد حجم الجسم (٨ ك.ب) بالبث", () => {
  it("يقبل جسماً ضمن الحد", async () => {
    const result = await readCappedBody(post(JSON.stringify({ query: "ضمن الحد" })));
    expect(result.ok).toBe(true);
  });

  it("يرفض جسماً أكبر من الحد دون قراءة بقية البث", async () => {
    const oversized = JSON.stringify({ query: "س".repeat(MAX_BODY_BYTES * 2) });
    const result = await readCappedBody(post(oversized));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too-large");
  });
});

describe("مسار /api/research مع الحدود", () => {
  beforeEach(() => {
    resetLocalBuckets();
    resetSecretCache();
    delete process.env.DATABASE_URL;
  });

  it("طلب سليم يعيد نتيجة البحث", async () => {
    const res = await POST(post(JSON.stringify({ query: "أشعر أن قلبي قاسٍ" })));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { outcome: string };
    expect(data.outcome).toBe("ok");
  });

  it("جسم أكبر من ٨ ك.ب → ٤١٣", async () => {
    const oversized = JSON.stringify({ query: "س".repeat(MAX_BODY_BYTES * 2) });
    const res = await POST(post(oversized));
    expect(res.status).toBe(413);
  });

  it("جسم غير صالح → ٤٠٠", async () => {
    const res = await POST(post("{ليس json"));
    expect(res.status).toBe(400);
  });

  it("نص بحث أطول من ١٠٠٠ حرف → ٤٠٠", async () => {
    const res = await POST(post(JSON.stringify({ query: "ك".repeat(1500) })));
    expect(res.status).toBe(400);
  });

  it("بعد ٣٠ طلباً من العميل نفسه → ٤٢٩ مع رأس إعادة المحاولة", async () => {
    const headers = { "user-agent": "rate-test-agent", "x-forwarded-for": "9.9.9.9" };
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      const ok = await POST(post(JSON.stringify({ query: "استعلام" }), headers));
      expect(ok.status, `طلب ${i + 1}`).toBe(200);
    }
    const blocked = await POST(post(JSON.stringify({ query: "استعلام" }), headers));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    // عميل مختلف (بصمة مختلفة) لا يتأثر.
    const other = await POST(
      post(JSON.stringify({ query: "استعلام" }), { ...headers, "x-forwarded-for": "8.8.8.8" }),
    );
    expect(other.status).toBe(200);
  });
});
