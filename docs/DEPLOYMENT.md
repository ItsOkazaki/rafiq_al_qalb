# النشر — Deployment

البنية الوحيدة المعتمدة: **خادم Node كامل** لـNext.js (App Router).
لا توجد نسخة ثابتة (static export)؛ مسار البحث يعمل عبر `/api/research`.

## Vercel (الهدف الحالي)

1. اربط المستودع بمشروع Vercel واحد.
2. اضبط متغيرات البيئة في المشروع (Settings → Environment Variables):

| المتغير | الوظيفة | إلزامي؟ |
|---|---|---|
| `GEMINI_API_KEY` | مفتاح Gemini لتفعيل تنظيم المقطع المسترجَع | لا — بدونه يعمل التنظيم الحتمي |
| `AI_PROVIDER` | `gemini` \| `openrouter` \| `openai` | لا |
| `GEMINI_CHAT_MODEL` | اسم النموذج (افتراضي `gemini-3.5-flash-lite`) | لا |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` | بديل OpenAI | لا |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | بديل OpenRouter | لا |
| `DATABASE_URL` | سجل تتبّع جلسات البحث (PostgreSQL/Neon) | لا — البحث يعمل بدونه |
| `NEXT_PUBLIC_SITE_URL` | رابط مطلق لصور Open Graph (يُضبط تلقائياً على Vercel عبر `VERCEL_URL`) | لا |

3. Deploy. لا يحتاج البناء إلى أي سرّ؛ المفاتيح تُقرأ في وقت التشغيل فقط.

### قاعدة البيانات (اختيارية)

```bash
# مرة واحدة على قاعدة Neon
psql "$DATABASE_URL" -f database-setup.sql
# أو من لوحة Neon: الصق محتوى database-setup.sql في SQL Editor
```

بدون قاعدة بيانات: البحث يعمل كاملاً، وتسجيل الجلسات يتوقف بصمت (سلوك مقصود).

## التحقق بعد النشر

```bash
curl -s https://YOUR-DEPLOYMENT/api/health
# {"ok":true,"database":"not-configured","ai":{"configured":true,...},"corpus":{"approvedChunks":486}}

curl -s -X POST https://YOUR-DEPLOYMENT/api/research \
  -H 'content-type: application/json' \
  -d '{"query":"أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن"}'
```

المتوقع: Arabic JSON with up to four passages, each carrying source, position and the
official link; `ai.mode` = `model` when a key is configured, `deterministic` otherwise.

## خيارات استضافة أخرى

أي مضيف يدعم Next.js 16 / Node 24 يعمل: `npm ci && npm test && npm run build && npm start`.

## CI والتجديد

`.github/workflows/refresh-alifta-html.yml` يعيد بناء corpus جامع السنة من الصفحات
الرسمية (تشغيل يدوي `workflow_dispatch`، وعلى كل دفعة إلى `main`). الوظيفة تشغّل
الاختبارات (68 اختبار وحدة + 33 اختبار زاحف)، ثم الـingest، ثم بوابة الجودة، ثم تلتزم بالـcorpus الناتج — ولا تكتب corpus
مرفوضاً في مسارات التطبيق أبداً.
