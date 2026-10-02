# نشر رفيق القلوب — Vercel + Neon + Gemini / OpenRouter

## لماذا هذا الإصدار؟

مسار الذكاء الاصطناعي لم يعد مربوطاً بـ OpenAI. يمكنك تشغيل نفس Evidence-Gated RAG باستخدام Gemini أو OpenRouter، مع إبقاء OpenAI كخيار للبيئات التي تتوفر فيها اعتمادات مدفوعة.

Gemini لديه نماذج ذات سعر Free Tier، ومنها `gemini-3.5-flash-lite`، كما أن `gemini-embedding-2` مدرج بسعر Free Tier للنص. الحدود الفعلية تعتمد على المشروع والحساب وتُفرض كـ RPM/TPM/RPD. راجع صفحة Rate Limits في Google AI Studio إذا ظهرت 429. 

OpenRouter لديه خطة مجانية مع نماذج مجانية، وحالياً يذكر 50 طلباً يومياً للخطة المجانية. لا تجعل benchmark الكامل يعتمد عليه وحده إذا تجاوز حد الطلبات اليومي. 

## 1) Neon

شغّل `database-setup.sql` مرة واحدة على مشروع Neon المرتبط بفريقك، ثم ضع connection string المجمّع/SSL في `DATABASE_URL`.

## 2) إعداد Gemini — الموصى به للاختبار بدون رصيد OpenAI

في Vercel Preview أو في `.env.local`:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_CHAT_MODEL=gemini-3.5-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
DATABASE_URL=...
AI_TIMEOUT_MS=10000
AI_RERANK_CANDIDATES=6
AI_FINAL_PASSAGES=3
```

لا تحتاج إلى `OPENAI_API_KEY` في هذا الوضع.

مسار `/api/research` مضبوط على `runtime = nodejs` و`maxDuration = 120` ثانية، مع مهلة AI افتراضية 10 ثوانٍ لكل استدعاء، حتى يبقى المسار ضمن حد زمني واضح عند تشغيله كـ Vercel Function.

أنشئ مفتاح Gemini من Google AI Studio، ولا تضعه في GitHub. كل الاستدعاءات تستخدم REST الرسمي لـ Gemini: `generateContent` للنص و`batchEmbedContents` للتضمينات.

## 3) إعداد OpenRouter — بديل مجاني

```text
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=qwen/qwen3.8-27b:free
OPENROUTER_EMBEDDING_MODEL=liquid/lfm-2.5-embedding-350m:free
DATABASE_URL=...
```

اترك `:free` في معرفات النماذج. الخطة المجانية محدودة إلى 50 طلباً يومياً بحسب صفحة التسعير الحالية، كما أن النماذج/السعة المجانية قد تتغير.

## 4) خلط المزودين

يمكن تشغيل chat من OpenRouter مع embeddings من Gemini:

```text
AI_PROVIDER=openrouter
EMBEDDING_PROVIDER=gemini
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=qwen/qwen3.8-27b:free
GEMINI_API_KEY=...
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
```

وهذا مفيد إذا أردت توزيع حدود الاستخدام بين مزودين.

## 5) OpenAI للبيئة التنافسية إن توفرت اعتمادات

```text
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
DATABASE_URL=...
```

## 6) تحقق من صحة البيئة

بعد redeploy افتح:

```text
/api/health
/api/health?probe=1
/hiwar
/lab
```

مع `probe=1` يجب أن تكون chat وembedding ناجحتين. لا تضع رابط `/api/health?probe=1` في polling متكرر؛ كل probe يستهلك طلباً من مزود الذكاء الاصطناعي.

## 7) Benchmark

```bash
npm install
npm run test
npm run typecheck
npm run benchmark -- --url https://YOUR-PREVIEW.vercel.app
```

Gemini هو الأنسب لتجربة benchmark موسعة ضمن free tier، لكن راقب RPM/TPM/RPD. OpenRouter المجاني محدود بـ 50 طلباً في اليوم، لذلك استخدمه للـ smoke/عينات أصغر أو وزّع الاستدعاءات بين المزودين.

## 8) إطلاق الإنتاج

ثبت commit واضحاً، شغّل `npm run release:check`، ثم احفظ نتيجة benchmark الفعلية في `benchmarks/results/latest.json` وارفع النسخة المستقرة فقط.


### Gemini reliability note
The Gemini embedding path batches retrieval embeddings in small groups, validates response counts, and requests 768-dimensional vectors. This avoids relying on one oversized batch during serverless execution. The health probe also validates a small embedding batch.

GEMINI_CHAT_FALLBACK_MODEL=gemini-3.1-flash-lite

في حال ظهور 503/429 عابر من Gemini، يعيد التطبيق المحاولة بتأخير متزايد ثم ينتقل تلقائياً إلى نموذج محادثة احتياطي مضبوط. لا يتم تجاوز بوابة الدليل بسبب هذا الاسترداد.
