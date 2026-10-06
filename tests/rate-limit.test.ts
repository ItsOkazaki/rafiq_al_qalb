// اختبارات حدود /api/research: العدّاد المحلي، مفتاح العميل المشتق بـHMAC،
// حد حجم الجسم (٨ ك.ب)، حد نص البحث، وسلوك المسار الكامل عند التجاوز،
// ومقاومة تجاوز الحد بترويسات يكتبها العميل (User-Agent / X-Forwarded-For).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  clientIpFromHeaders,
  platformHeadersTrusted,
  clientKeyFor,
  consumeLocalBucket,
  resetLocalBuckets,
  resetSecretCache,
  windowStart,
} from "@/lib/rate-limit";
import { MAX_BODY_BYTES, readCappedBody } from "@/lib/http-limits";

const { runResearch } = vi.hoisted(() => ({
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

vi.mock("@/lib/research/pipeline", () => ({ runResearch }));

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
  it("حتمي للعنوان نفسه، ومختلف لكل عنوان ولكل سرّ", () => {
    const base = clientKeyFor("secret-1", "1.2.3.4");
    expect(base).toMatch(/^[0-9a-f]{64}$/);
    expect(clientKeyFor("secret-1", "1.2.3.4")).toBe(base);
    expect(clientKeyFor("secret-1", "5.6.7.8")).not.toBe(base);
    expect(clientKeyFor("secret-2", "1.2.3.4")).not.toBe(base);
  });

  it("خلف وكيل موثوق: لا يشتق عنوان العميل من أول عنصر في X-Forwarded-For (يكتبه العميل)", () => {
    process.env.VERCEL = "1"; // نمثّل النشر على المنصة حيث الوكيل يضيف العنصر الأخير
    // وكيل موثوق واحد أضاف العنوان الحقيقي في النهاية.
    const spoofed = new Headers({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" });
    expect(clientIpFromHeaders(spoofed, 1)).toBe("9.9.9.9");
    // تغيير القيمة التي يكتبها العميل لا يغيّر العنوان المستنتج.
    const otherSpoof = new Headers({ "x-forwarded-for": "2.2.2.2, 9.9.9.9" });
    expect(clientIpFromHeaders(otherSpoof, 1)).toBe("9.9.9.9");
    // وكيلان موثوقان: القفزة الثانية من اليمين.
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "7.7.7.7, 8.8.8.8, 9.9.9.9" }), 2)).toBe("8.8.8.8");
    delete process.env.VERCEL;
  });

  it("قرار الثقة بترويسات المنصة: المنصة أو ضبط صريح، وغير ذلك لا", () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.TRUST_PLATFORM_HEADERS;
    expect(platformHeadersTrusted()).toBe(false);
    process.env.VERCEL = "1";
    expect(platformHeadersTrusted()).toBe(true);
    delete process.env.VERCEL;
    process.env.VERCEL_ENV = "production";
    expect(platformHeadersTrusted()).toBe(true);
    delete process.env.VERCEL_ENV;
    process.env.TRUST_PLATFORM_HEADERS = "true";
    expect(platformHeadersTrusted()).toBe(true);
    process.env.TRUST_PLATFORM_HEADERS = "no";
    expect(platformHeadersTrusted()).toBe(false);
    delete process.env.TRUST_PLATFORM_HEADERS;
  });

  it("على المنصة تُقرأ ترويساتها، ويسقط إلى unknown بلا ترويسة عنوان", () => {
    process.env.VERCEL = "1";
    try {
      expect(
        clientIpFromHeaders(new Headers({ "x-vercel-forwarded-for": "4.4.4.4", "x-forwarded-for": "1.1.1.1" }), 1),
      ).toBe("4.4.4.4");
      expect(clientIpFromHeaders(new Headers({ "x-real-ip": "5.5.5.5", "x-forwarded-for": "1.1.1.1" }), 1)).toBe("5.5.5.5");
      expect(clientIpFromHeaders(new Headers({ "user-agent": "agent" }), 1)).toBe("unknown");
    } finally {
      delete process.env.VERCEL;
    }
  });

  it("خارج المنصة ترويسات المنصة يكتبها العميل فتُتجاهل (لا دلو جديداً لكل طلب)", () => {
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.TRUST_PLATFORM_HEADERS;
    // تدوير x-real-ip أو x-vercel-forwarded-for لا يغيّر العنوان المستنتج.
    for (const spoof of ["1.1.1.1", "2.2.2.2", "3.3.3.3"]) {
      expect(clientIpFromHeaders(new Headers({ "x-real-ip": spoof }), 1)).toBe("unknown");
      expect(clientIpFromHeaders(new Headers({ "x-vercel-forwarded-for": spoof }), 1)).toBe("unknown");
      expect(clientIpFromHeaders(new Headers({ "x-real-ip": spoof, "x-forwarded-for": "9.9.9.9" }), 1)).toBe("unknown");
      // الترويسة بعنصر واحد يكتبه العميل: أخطر حالة، لأن «العنصر الأيمن» يصير قيمته هو.
      expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": spoof }), 1)).toBe("unknown");
      expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": `${spoof}, 9.9.9.9` }), 1)).toBe("unknown");
    }
  });

  it("ضبط المشغّل الصريح يعيد الثقة بترويسات المنصة (وسيط أمام التطبيق)", () => {
    process.env.TRUST_PLATFORM_HEADERS = "1";
    try {
      expect(clientIpFromHeaders(new Headers({ "x-real-ip": "5.5.5.5" }), 1)).toBe("5.5.5.5");
    } finally {
      delete process.env.TRUST_PLATFORM_HEADERS;
    }
    process.env.TRUST_PLATFORM_HEADERS = "0";
    process.env.VERCEL = "1";
    try {
      expect(clientIpFromHeaders(new Headers({ "x-real-ip": "5.5.5.5" }), 1)).toBe("unknown");
    } finally {
      delete process.env.TRUST_PLATFORM_HEADERS;
      delete process.env.VERCEL;
    }
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
    delete process.env.TRUSTED_PROXY_HOPS;
    // اختبارات المسار تمثّل النشر على المنصة: الوكيل الموثوق موجود.
    process.env.VERCEL = "1";
  });

  afterEach(() => {
    delete process.env.VERCEL;
    delete process.env.TRUST_PLATFORM_HEADERS;
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

  it("تدوير User-Agent لا يمنح دلواً جديداً (تجاوز مرفوض)", async () => {
    const body = JSON.stringify({ query: "استعلام" });
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      const ok = await POST(post(body, { "user-agent": "agent-a", "x-forwarded-for": "9.9.9.9" }));
      expect(ok.status, `طلب ${i + 1}`).toBe(200);
    }
    // العميل نفسه يبدّل وكيله النصي فقط: يجب أن يبقى محسوباً على الدلو نفسه.
    const rotated = await POST(post(body, { "user-agent": "agent-b", "x-forwarded-for": "9.9.9.9" }));
    expect(rotated.status).toBe(429);
    const rotatedAgain = await POST(post(body, { "user-agent": "curl/9.0", "x-forwarded-for": "9.9.9.9" }));
    expect(rotatedAgain.status).toBe(429);
  });

  it("حقن أول عنصر في X-Forwarded-For لا يمنح دلواً جديداً (تجاوز مرفوض)", async () => {
    const body = JSON.stringify({ query: "استعلام" });
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      const ok = await POST(post(body, { "x-forwarded-for": "9.9.9.9" }));
      expect(ok.status, `طلب ${i + 1}`).toBe(200);
    }
    // يضيف العميل عنواناً من عنده قبل العنوان الذي أثبته الوكيل الموثوق.
    const spoofed = await POST(post(body, { "x-forwarded-for": "1.1.1.1, 9.9.9.9" }));
    expect(spoofed.status).toBe(429);
    // ويبدّل العنوان المحقون في كل طلب — بقي على الدلو نفسه.
    for (const fake of ["2.2.2.2", "3.3.3.3", "8.8.8.8"]) {
      const attempt = await POST(post(body, { "x-forwarded-for": `${fake}, 9.9.9.9` }));
      expect(attempt.status, `حقن ${fake}`).toBe(429);
    }
  });

  it("عميلان حقيقيان مختلفان خلف الوكيل نفسه لا يتقاسمان الدلو", async () => {
    const body = JSON.stringify({ query: "استعلام" });
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      const ok = await POST(post(body, { "x-forwarded-for": "1.1.1.1, 9.9.9.9" }));
      expect(ok.status, `طلب ${i + 1}`).toBe(200);
    }
    expect((await POST(post(body, { "x-forwarded-for": "1.1.1.1, 9.9.9.9" }))).status).toBe(429);
    // عنوان حقيقي مختلف (العنصر الذي أثبته الوكيل) → دلو مستقل.
    expect((await POST(post(body, { "x-forwarded-for": "1.1.1.1, 7.7.7.7" }))).status).toBe(200);
  });
});

// ── أجسام مشوَّهة: كان الجسم `null` يرمي استثناءً غير ملتقط فيظهر ٥٠٠ بلا جسم ──
describe("مسار /api/research مع أجسام ليست كائناً", () => {
  beforeEach(() => {
    resetLocalBuckets();
    resetSecretCache();
    delete process.env.DATABASE_URL;
    delete process.env.TRUSTED_PROXY_HOPS;
  });

  it("الجسم `null` → ٤٠٠ لا ٥٠٠", async () => {
    const res = await POST(post("null"));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBeTruthy();
  });

  it("الجسم مصفوفة → ٤٠٠", async () => {
    expect((await POST(post("[1,2]"))).status).toBe(400);
  });

  it.each(["5", '"نص"', "true", "-1", "1e9"])(
    "الجسم قيمة أولية %s → ٤٠٠",
    async (body) => {
      expect((await POST(post(body))).status).toBe(400);
    },
  );

  it("كائن بلا حقل query يبقى ٢٠٠: العقد أن الأنبوب يعيد outcome=invalid برسالة إرشاد، لا رفضاً من المسار", async () => {
    const res = await POST(post("{}"));
    expect(res.status).toBe(200);
    expect(runResearch).toHaveBeenCalledWith("", { mode: "ai" });
  });

  it("query من نوع غير نصي يبقى ٢٠٠ بالعقد نفسه (لا ٥٠٠ ولا ٤٠٠)", async () => {
    const res = await POST(post(JSON.stringify({ query: { nested: true } })));
    expect(res.status).toBe(200);
    expect(runResearch).toHaveBeenCalledWith("", { mode: "ai" });
  });
});

// ── الفشل باتجاه التشديد: خارج المنصة لا تُقرأ أي ترويسة عنوان يكتبها العميل ──
describe("خارج المنصة: تدوير X-Forwarded-For لا يمنح دلواً جديداً", () => {
  beforeEach(() => {
    resetLocalBuckets();
    resetSecretCache();
    delete process.env.DATABASE_URL;
    delete process.env.TRUSTED_PROXY_HOPS;
    delete process.env.VERCEL;
    delete process.env.VERCEL_ENV;
    delete process.env.TRUST_PLATFORM_HEADERS;
  });

  it("٣٠ طلباً بعنصر XFF مختلف في كل طلب ثم ٤٢٩ (فحص حي كان ٦٠/٦٠ ناجحاً)", async () => {
    const body = JSON.stringify({ query: "استعلام" });
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      const ok = await POST(post(body, { "x-forwarded-for": `10.0.0.${i + 1}` }));
      expect(ok.status, `طلب ${i + 1}`).toBe(200);
    }
    const blocked = await POST(post(body, { "x-forwarded-for": "10.0.0.99" }));
    expect(blocked.status).toBe(429);
  });

  it("تدوير كل ترويسات العنوان معاً لا يمنح دلواً جديداً", async () => {
    const body = JSON.stringify({ query: "استعلام" });
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      await POST(
        post(body, {
          "user-agent": `agent-${i}`,
          "x-forwarded-for": `8.8.8.${i + 1}`,
          "x-real-ip": `9.9.9.${i + 1}`,
          "x-vercel-forwarded-for": `7.7.7.${i + 1}`,
        }),
      );
    }
    const blocked = await POST(
      post(body, {
        "user-agent": "agent-final",
        "x-forwarded-for": "8.8.8.200",
        "x-real-ip": "9.9.9.200",
        "x-vercel-forwarded-for": "7.7.7.200",
      }),
    );
    expect(blocked.status).toBe(429);
  });

  it("ضبط المشغّل الصريح يعيد تمييز العملاء خلف وسيطه", async () => {
    process.env.TRUST_PLATFORM_HEADERS = "1";
    const body = JSON.stringify({ query: "استعلام" });
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      const ok = await POST(post(body, { "x-forwarded-for": "1.1.1.1, 9.9.9.9" }));
      expect(ok.status, `طلب ${i + 1}`).toBe(200);
    }
    expect((await POST(post(body, { "x-forwarded-for": "1.1.1.1, 9.9.9.9" }))).status).toBe(429);
    // عميل حقيقي آخر خلف الوكيل نفسه لا يتأثر.
    expect((await POST(post(body, { "x-forwarded-for": "2.2.2.2, 8.8.8.8" }))).status).toBe(200);
  });
});
