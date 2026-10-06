// ─────────────────────────────────────────────────────────────────────────────
// تحديد الطلبات على /api/research — ٣٠ طلباً في الدقيقة لكل عميل.
//
// تحديد هوية العميل: مفتاح HMAC-SHA256 مشتق من **عنوان العميل وحده** بسرّ خادوم.
// السرّ يُخزَّن في PostgreSQL (جدول app_secrets) إن كانت القاعدة متاحة، وإلا وقع
// النظام على سرّ محلي عشوائي داخل العملية — وفي هذه الحالة يعمل العدّاد لكل مثيل
// على حدة.
//
// قاعدة مقاومة التجاوز (مهمة): كل عنصر في بصمة العميل يجب ألا يكون قابلاً للكتابة
// من العميل نفسه، وإلا صار الحد اختيارياً:
//   ١) أول عنصر في X-Forwarded-For يكتبه العميل، فلا يُقرأ أبداً. نأخذ العنصر الذي
//      أضافه آخر وكيل موثوق (من اليمين بعدد قفزات TRUSTED_PROXY_HOPS)، ونفضّل
//      ترويسات المنصة التي تُكتب من طرفها (x-vercel-forwarded-for ثم x-real-ip).
//   ٢) User-Agent لم يعد جزءاً من المفتاح إطلاقاً: كان تدويره وحده كافياً للحصول
//      على دلو جديد لكل طلب، أي تجاوز الحد بلا نهاية.
//   ٣) ترويسات المنصة (x-vercel-forwarded-for وx-real-ip) تُقرأ فقط عندما نكون
//      فعلاً على المنصة أو بضبط صريح من المشغّل؛ وخارج ذلك هي ترويسات يكتبها
//      العميل، فقراءتها تمنح كل طلب عنواناً جديداً أي دلواً جديداً.
//   ٤) لا يُشتق المفتاح من أي ترويسة يقبلها الخادم كما هي من العميل.
//
// لا يُخزَّن أي نص استعلام في أي جزء من هذا المسار.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, randomBytes } from "node:crypto";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const RATE_LIMIT_MAX = 30;
export const RATE_LIMIT_WINDOW_MS = 60_000;
const SECRET_PURPOSE = "rate-limit";
const LOCAL_BUCKET_PRUNE_AT = 10_000;

/** بداية النافذة الزمنية الثابتة التي تحتوي اللحظة المعطاة. */
export function windowStart(now: number, windowMs: number = RATE_LIMIT_WINDOW_MS): number {
  return Math.floor(now / windowMs) * windowMs;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

// ── العدّاد المحلي داخل العملية (مسار الوقوع عند غياب قاعدة البيانات) ────────
const localBuckets = new Map<string, { windowStart: number; count: number }>();

export function consumeLocalBucket(
  key: string,
  now: number = Date.now(),
  max: number = RATE_LIMIT_MAX,
  windowMs: number = RATE_LIMIT_WINDOW_MS,
): RateLimitDecision {
  const start = windowStart(now, windowMs);
  if (localBuckets.size > LOCAL_BUCKET_PRUNE_AT) {
    for (const [k, v] of localBuckets) {
      if (v.windowStart !== start) localBuckets.delete(k);
    }
  }
  const bucket = localBuckets.get(key);
  if (!bucket || bucket.windowStart !== start) {
    localBuckets.set(key, { windowStart: start, count: 1 });
    return { allowed: true, remaining: max - 1, retryAfterSeconds: 0 };
  }
  if (bucket.count >= max) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.windowStart + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  bucket.count += 1;
  return { allowed: true, remaining: max - bucket.count, retryAfterSeconds: 0 };
}

/** للاختبار فقط. */
export function resetLocalBuckets(): void {
  localBuckets.clear();
}

// ── مفتاح العميل المشتق ─────────────────────────────────────────────────────
/**
 * المفتاح مشتق من عنوان العميل وحده. لا يُخلط معه User-Agent ولا أي ترويسة أخرى
 * يكتبها العميل: خلط قيمة يسيطر عليها العميل يعني أن العميل يستطيع توليد عدد غير
 * محدود من المفاتيح، أي إلغاء الحد عملياً.
 */
export function clientKeyFor(secret: string, ip: string): string {
  return createHmac("sha256", secret).update(`rate-limit|${ip}`).digest("hex");
}

/**
 * عدد قفزات الوكيل الموثوق بين العميل وبيننا. الافتراضي ١ (منصة واحدة مثل
 * Vercel). يزداد عند وجود وسيط إضافي مضبوط (nginx أمام المنصة مثلاً).
 */
export const DEFAULT_TRUSTED_PROXY_HOPS = 1;

export function trustedProxyHops(): number {
  const raw = Number(process.env.TRUSTED_PROXY_HOPS ?? DEFAULT_TRUSTED_PROXY_HOPS);
  if (!Number.isFinite(raw)) return DEFAULT_TRUSTED_PROXY_HOPS;
  const hops = Math.floor(raw);
  return hops >= 1 ? hops : DEFAULT_TRUSTED_PROXY_HOPS;
}

/**
 * هل تُقرأ ترويسات المنصة (`x-vercel-forwarded-for` و`x-real-ip`) بوصفها موثوقة؟
 *
 * على Vercel تكتب المنصة هاتين الترويستين وتعيد كتابة ما يرسله العميل، فهما دليل
 * سليم على عنوانه. أما على استضافة ذاتية بلا وكيل يضبطهما فهما ترويستان عاديتان
 * يكتبهما العميل — وقراءتهما هناك تعني أن كل طلب يختار عنوانه، أي دلو جديد لكل
 * طلب، أي إلغاء الحد عملياً. لذلك:
 *   ١) على المنصة (متغيرات `VERCEL*` التي يضبطها النشر) تُقرأان.
 *   ٢) وخارجها تُقرأان فقط إذا ضبط المشغّل `TRUST_PLATFORM_HEADERS=1` صراحةً
 *      (وسيط أمام التطبيق يكتبهما بنفسه، مثل nginx مع `proxy_set_header`).
 *   ٣) وعدا ذلك لا يُعتمد أي ترويسة عنوان: `X-Forwarded-For` بعنصر واحد يكتبه
 *      العميل يمنحه عنواناً جديداً لكل طلب، فيسقط العنوان إلى `"unknown"` (دلو
 *      واحد مشترك). ضبط `TRUSTED_PROXY_HOPS` وحده لا يكفي لذلك.
 *
 * ضبط الاستضافة الذاتية المتعددة المستخدمين: `TRUST_PLATFORM_HEADERS=1` خلف وسيط
 * يكتب الترويسات بنفسه (nginx: `proxy_set_header X-Real-IP $remote_addr;`) مع
 * `TRUSTED_PROXY_HOPS` بعدد الوكلاء، وإلا اشترك كل العملاء في دلو واحد.
 */
export function platformHeadersTrusted(): boolean {
  const explicit = (process.env.TRUST_PLATFORM_HEADERS ?? "").trim().toLowerCase();
  if (["1", "true", "yes"].includes(explicit)) return true;
  if (["0", "false", "no"].includes(explicit)) return false;
  // المنصة تعرّف نفسها بأكثر من متغير، ولا يكتب العميل أياً منها: نأخذ بأيّ منها
  // حتى لا يكون غياب واحدٍ سبباً في إسقاط كل المستخدمين في دلو واحد مشترك.
  return Boolean(
    process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.VERCEL_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
  );
}

/**
 * عنوان العميل من ترويسات لا تُقبل من العميل كما هي:
 * ١) ترويسات المنصة/الوسيط التي يُعاد كتابتها من طرفه — وتُقرأ فقط عندما تكون
 *    المنصة موثوقة (انظر `platformHeadersTrusted`).
 * ٢) وإلا العنصر الذي أضافه آخر وكيل موثوق في X-Forwarded-For (من اليمين).
 * لا يُقرأ أول عنصر في X-Forwarded-For أبداً لأنه من إنشاء العميل.
 */
export function clientIpFromHeaders(headers: Headers, hops: number = trustedProxyHops()): string {
  if (platformHeadersTrusted()) {
    const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    if (vercel) return vercel;

    const realIp = headers.get("x-real-ip")?.split(",")[0]?.trim();
    if (realIp) return realIp;
  }

  // X-Forwarded-For يُقرأ فقط خلف وكيل موثوق. بلا وكيل موثوق يستحيل التمييز بين
  // عنصر أضافه الوكيل وعنصر كتبه العميل: ترويسة بعنصر واحد يرسلها العميل تصير هي
  // «العنصر الأيمن» بنفسها، فيحصل كل طلب على عنوان جديد أي دلو جديد، ويلغى الحد
  // (وهذا ما وقع فعلاً في فحص حي: ٦٠/٦٠ طلباً ناجحاً بتدوير عنصر واحد).
  // لذلك الافتراض الآمن: بلا ثقة بالوكيل لا تُقرأ الترويسة إطلاقاً ويسقط العنوان
  // إلى "unknown" — أي دلو واحد مشترك. الفشل هنا باتجاه التشديد لا باتجاه التجاوز.
  if (!platformHeadersTrusted()) return "unknown";

  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return "unknown";
  const parts = forwarded
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "unknown";

  // آخر وكيل موثوق أضاف عنوان العميل الحقيقي في هذا الموضع.
  const index = parts.length - hops;
  return parts[index < 0 ? 0 : index] ?? "unknown";
}

export function requestFingerprint(request: Request): { ip: string } {
  return { ip: clientIpFromHeaders(request.headers) };
}

// ── سرّ الخادوم: قاعدة البيانات أولاً، ثم الوقوع المحلي ─────────────────────
let cachedSecret: string | null = null;
let secretPromise: Promise<string> | null = null;

async function secretFromDatabase(): Promise<string | null> {
  if (!db) return null;
  try {
    const existing = await db.execute(
      sql`SELECT secret FROM app_secrets WHERE purpose = ${SECRET_PURPOSE}`,
    );
    const first = existing.rows?.[0] as { secret?: string } | undefined;
    if (first?.secret) return first.secret;
    const generated = randomBytes(32).toString("hex");
    await db.execute(
      sql`INSERT INTO app_secrets (purpose, secret) VALUES (${SECRET_PURPOSE}, ${generated})
          ON CONFLICT (purpose) DO NOTHING`,
    );
    const again = await db.execute(
      sql`SELECT secret FROM app_secrets WHERE purpose = ${SECRET_PURPOSE}`,
    );
    const row = again.rows?.[0] as { secret?: string } | undefined;
    return row?.secret ?? generated;
  } catch {
    return null;
  }
}

export async function getRateLimitSecret(): Promise<string> {
  if (cachedSecret) return cachedSecret;
  if (!secretPromise) {
    secretPromise = (async () => {
      const fromDb = await secretFromDatabase();
      // الوقوع المحلي: سرّ عشوائي خاص بهذه العملية — يشاركه كل الطلبات
      // على المثيل نفسه، وتصبح المفاتيح غير قابلة للتتبع عبر إعادة التشغيل
      // (سلوك مقبول لأن القاعدة هي المسار الموزّع المقصود).
      return fromDb ?? randomBytes(32).toString("hex");
    })();
  }
  cachedSecret = await secretPromise;
  return cachedSecret;
}

/** للاختبار فقط. */
export function resetSecretCache(): void {
  cachedSecret = null;
  secretPromise = null;
}

// ── العدّاد الموزّع في قاعدة البيانات ───────────────────────────────────────
async function consumeDatabaseBucket(key: string, now: number): Promise<RateLimitDecision | null> {
  if (!db) return null;
  const start = new Date(windowStart(now)).toISOString();
  try {
    const res = await db.execute(sql`
      INSERT INTO research_rate_limits (client_key, window_start, request_count)
      VALUES (${key}, ${start}::timestamptz, 1)
      ON CONFLICT (client_key, window_start)
      DO UPDATE SET request_count = research_rate_limits.request_count + 1
      RETURNING request_count
    `);
    // تنظيف النوافذ القديمة بأفضل جهد حتى لا يتراكم الجدول.
    const pruneBefore = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    void db
      .execute(sql`DELETE FROM research_rate_limits WHERE window_start < ${pruneBefore}::timestamptz`)
      .catch(() => {});
    const count = Number((res.rows?.[0] as { request_count?: number | string } | undefined)?.request_count ?? 0);
    if (!Number.isFinite(count) || count <= 0) return null;
    if (count > RATE_LIMIT_MAX) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowStart(now) + RATE_LIMIT_WINDOW_MS - now) / 1000),
      );
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }
    return { allowed: true, remaining: RATE_LIMIT_MAX - count, retryAfterSeconds: 0 };
  } catch {
    return null;
  }
}

/**
 * القرار النهائي للطلب: مفتاح عميل مشتق بـHMAC، ثم العدّاد الموزّع إن كانت
 * قاعدة البيانات متاحة، وإلا العدّاد المحلي داخل العملية.
 */
export async function consumeRateLimit(request: Request): Promise<RateLimitDecision> {
  const secret = await getRateLimitSecret();
  const { ip } = requestFingerprint(request);
  const key = clientKeyFor(secret, ip);
  const distributed = await consumeDatabaseBucket(key, Date.now());
  if (distributed) return distributed;
  return consumeLocalBucket(key);
}
