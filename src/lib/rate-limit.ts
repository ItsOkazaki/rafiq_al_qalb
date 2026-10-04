// ─────────────────────────────────────────────────────────────────────────────
// تحديد الطلبات على /api/research — ٣٠ طلباً في الدقيقة لكل عميل.
//
// تحديد هوية العميل: مفتاح HMAC-SHA256 مشتق من (أول عنوان في
// X-Forwarded-For + User-Agent) بسرّ خادوم. السرّ يُخزَّن في PostgreSQL
// (جدول app_secrets) إن كانت القاعدة متاحة، وإلا وقع النظام على سرّ محلي
// عشوائي داخل العملية — وفي هذه الحالة يعمل العدّاد لكل مثيل على حدة.
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
export function clientKeyFor(secret: string, ip: string, userAgent: string): string {
  return createHmac("sha256", secret).update(`${ip}|${userAgent}`).digest("hex");
}

export function requestFingerprint(request: Request): { ip: string; userAgent: string } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") ?? "";
  return { ip, userAgent };
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
  const { ip, userAgent } = requestFingerprint(request);
  const key = clientKeyFor(secret, ip, userAgent);
  const distributed = await consumeDatabaseBucket(key, Date.now());
  if (distributed) return distributed;
  return consumeLocalBucket(key);
}
