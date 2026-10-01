# نشر رفيق القلوب — Vercel + Neon + OpenAI

## 1) Neon

افتح مشروع Neon المرتبط بفريقك وشغّل `database-setup.sql` مرة واحدة. استخدم connection string pool/SSL في Vercel كمتغير `DATABASE_URL`.

## 2) Vercel Environment Variables

لـProduction وPreview: 

```text
DATABASE_URL=...
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
AI_TIMEOUT_MS=20000
AI_RERANK_CANDIDATES=10
AI_FINAL_PASSAGES=4
```

يمكن استخدام أسماء `AI_*` البديلة؛ النظام يدعم `OPENAI_*` للتشغيل المباشر. لا تضع المفتاح في GitHub.

## 3) Preview first

انشر branch معاينة، ثم افتح:

```text
/api/health
/hiwar
/lab
```

يجب أن يظهر `aiConfigured: true`, نموذج embedding صحيح، و`database: configured`.

## 4) Benchmark

من جهاز الفريق:

```bash
npm install
npm run test
npm run typecheck
npm run benchmark -- --url https://YOUR-PREVIEW.vercel.app
```

إذا لم يتم إعداد Neon محلياً للrunner، يبقى benchmark صالحاً ويُحفظ محلياً فقط؛ إذا توفر `DATABASE_URL` فسيُحفظ أيضاً في جداول `benchmark_runs` و`benchmark_results`.

## 5) Production

بعد مراجعة النتائج الفعلية، انقل النسخة المستقرة إلى Production. احتفظ بـcommit/branch واضح يميز عمل التحدي عن حالة ما قبل التحدي وفق قواعد المسابقة.
