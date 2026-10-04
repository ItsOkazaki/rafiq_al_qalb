# النشر — Deployment

البنية الوحيدة المعتمدة: **خادم Node كامل** لـNext.js (App Router).
لا توجد نسخة ثابتة (static export)؛ مسار البحث يعمل عبر `/api/research`.

## Vercel (الهدف الحالي)

1. اربط المستودع بمشروع Vercel واحد.
2. اضبط متغيرات البيئة في المشروع (Settings → Environment Variables):

| المتغير | الوظيفة | إلزامي؟ |
|---|---|---|
| `GEMINI_API_KEY` | مفتاح Gemini لتفعيل تنظيم المقطع المسترجَع (يُرسل في رأس الطلب فقط، لا في الرابط) | لا — بدونه يعمل التنظيم الحتمي |
| `AI_PROVIDER` | `gemini` \| `openrouter` \| `openai` — المضبوط أولاً والباقون مفاتيحهم احتياط | لا |
| `GEMINI_CHAT_MODEL` | اسم النموذج (افتراضي `gemini-3.5-flash-lite`) | لا |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` | بديل OpenAI | لا |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | OpenRouter موصول بالكامل: أساسي عند اختياره، واحتياط بعد جميني عند ضبطهما معاً | لا |
| `OPENROUTER_SITE_URL` / `OPENROUTER_SITE_NAME` | رؤوس إسناد OpenRouter (`HTTP-Referer` / `X-Title`) | لا — لها قيم افتراضية |
| `AI_TIMEOUT_MS` | مهلة إجمالية واحدة تتقاسمها كل محاولات المزوّدين في الطلب | لا |
| `DATABASE_URL` | سجل تتبّع جلسات البحث + العدّاد الموزّع لحد المعدل وسرّ مفاتيح العملاء (PostgreSQL/Neon) | لا — البحث يعمل بدونه |
| `NEXT_PUBLIC_SITE_URL` | رابط مطلق لصور Open Graph (يُضبط تلقائياً على Vercel عبر `VERCEL_URL`) | لا |

3. Deploy. لا يحتاج البناء إلى أي سرّ؛ المفاتيح تُقرأ في وقت التشغيل فقط.

### قاعدة البيانات (اختيارية)

```bash
# مرة واحدة على قاعدة Neon
psql "$DATABASE_URL" -f database-setup.sql
# أو من لوحة Neon: الصق محتوى database-setup.sql في SQL Editor
```

**طبق النقل قبل الاعتماد على مُحدِّد المعدل الموزّع.** ينشئ
`database-setup.sql` جدول `research_rate_limits` (العدّاد المشترك بين المثيلات)
وجدول `app_secrets` (سرّ اشتقاق مفاتيح العملاء بـHMAC). قبل تطبيق النقل — أو عند
غياب `DATABASE_URL` — يعمل المُحدِّد بعدّاد محلي داخل كل عملية، فيصبح الحد لكل
مثيل على حدة بدل أن يكون موزّعاً. النقل أيضاً يُبطل العمود القديم لنص الاستعلام
ويُخفي ما فيه من نصوص تاريخية.

بدون قاعدة بيانات: البحث يعمل كاملاً، وتسجيل الجلسات يتوقف بصمت (سلوك مقصود)،
ويبقى حد المعدل محلياً لكل عملية.

## الخصوصية وحدود الطلب على /api/research

- **حد المعدل:** ٣٠ طلباً في الدقيقة لكل عميل، بمفتاح عميل مشتق بـHMAC من
  (أول عنوان في `X-Forwarded-For` + `User-Agent`). التجاوز يعيد `429` مع رأس
  `retry-after`.
- **حد الجسم:** ٨ ك.ب تُقرأ بالبث؛ الأكبر يعيد `413`.
- **حد نص البحث:** ١٠٠٠ حرف؛ الأطول يعيد `400`.
- **لا يُخزَّن نص الاستعلام الخام** في قاعدة البيانات أبداً — تُسجَّل مشتقات
  النتيجة فقط (النتيجة، الأبواب، الكلمات المفتاحية، معرفات المقاطع).
- **مفاتيح المزوّدين لا تظهر في الروابط** (مفتاح Gemini في رأس `x-goog-api-key`
  فقط)، وسجلّات فشل المزوّدين مُهيكلة وآمنة الخصوصية: بلا مفاتيح ولا نصوص مستخدمين.

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
الاختبارات (99 اختبار وحدة + 33 اختبار زاحف)، ثم الـingest، ثم بوابة الجودة، ثم تلتزم بالـcorpus الناتج — ولا تكتب corpus
مرفوضاً في مسارات التطبيق أبداً.
