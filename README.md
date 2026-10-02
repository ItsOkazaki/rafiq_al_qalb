# رفيق القلوب — Evidence-Gated AI RAG

نظام بحث عربي موثّق للمادة الإسلامية المعتمدة. النسخة الحالية تجعل الذكاء الاصطناعي جزءاً من **النواة**: فهم السؤال، إنشاء خطة بحث، البحث الدلالي، دمج البحث اللفظي مع الدلالي، إعادة ترتيب الأدلة، بوابة كفاية الدليل، توليد ادعاءات مرتبطة بالأدلة، ثم التحقق من كل ادعاء قبل عرضه.

> **الفكرة:** لا يكفي أن يعرف النموذج شيئاً؛ يجب أن يجد دليلاً معتمداً، ويُثبت إسناد الصياغة إليه، وإلا يمتنع.

## البنية

```text
Question
  ↓
Safety / Fatwa / Prescription Policy
  ↓
Local token-friendly query plan
  ↓
Approved lexical/topic retrieval
  └── optional Gemini embeddings when explicitly enabled
  ↓
AI Re-ranking
  ↓
Evidence Gate
  ↓
Claim Generation
  ↓
Claim Verification
  ↓
Verified Answer + Evidence Map
  ↓
Neon (private operational/evaluation telemetry)
```

المادة نفسها تبقى في `src/lib/corpus/` و`src/lib/sources/`. Neon ليس مصدراً معرفياً؛ هو سجل تشغيل وقياس.

## التشغيل

1. انسخ `.env.example` إلى `.env.local`.
2. ضع `DATABASE_URL` الخاص بـ Neon.
3. اختر مزود AI عبر `AI_PROVIDER` ثم ضع مفتاح Gemini أو OpenRouter؛ OpenAI يبقى خياراً متاحاً عند توفر رصيد.
4. نفّذ `database-setup.sql` مرة واحدة في Neon.
5. ثبّت الاعتمادات ثم شغّل: `npm run dev`.

### متغيرات مهمة

| المتغير | الاستخدام |
|---|---|
| `DATABASE_URL` | Neon للـtelemetry والتقييم |
| `AI_PROVIDER` | `gemini` أو `openrouter` أو `openai` |
| `GEMINI_API_KEY` | مفتاح Gemini Developer API |
| `GEMINI_CHAT_MODEL` | الافتراضي `gemini-3.5-flash-lite` |
| `GEMINI_EMBEDDING_MODEL` | الافتراضي `gemini-embedding-2` |
| `OPENROUTER_API_KEY` | مفتاح OpenRouter |
| `OPENROUTER_MODEL` | الافتراضي `qwen/qwen3.8-27b:free` |
| `OPENROUTER_EMBEDDING_MODEL` | الافتراضي `liquid/lfm-2.5-embedding-350m:free` |
| `EMBEDDING_PROVIDER` | لتخصيص مزود الـembedding بشكل مستقل عن chat |
| `OPENAI_API_KEY` | خيار OpenAI عند توفر الرصيد |
| `AI_TOKEN_SAVER` | تشغيل وضع التوفير الافتراضي |
| `AI_PLANNER_MODE` | `local` افتراضياً أو `ai` عند الحاجة إلى مخطط Gemini |
| `AI_USE_EMBEDDINGS` | تفعيل البحث الدلالي اختيارياً |
| `AI_RERANK_CANDIDATES` | عدد المرشحين قبل إعادة الترتيب (6 افتراضياً) |
| `AI_FINAL_PASSAGES` | الحد النهائي للمقاطع (3 افتراضياً) |

## التحقق والقياس

مجموعة benchmark ثابتة من **40 سؤالاً** موجودة في `benchmarks/questions.json`. نشغّل السؤال نفسه بمسارين:

- `baseline`: البحث اللفظي/الموضوعي الموجود في النظام الأصلي.
- `ai`: الخطة المحلية + retrieval من corpus المعتمد + AI reranking + evidence gate + claim verification؛ ويمكن تفعيل embeddings عند الحاجة.

الأمر:

```bash
npm run benchmark -- --url https://YOUR-VERCEL-URL
```

النتيجة تحفظ في `benchmarks/results/latest.json`، ويمكن للـrunner حفظ الملخص والحالات في Neon عندما يكون `DATABASE_URL` متاحاً. لا توجد أرقام مختلقة في المستودع؛ أرقام العرض يجب أن تأتي من run فعلي.

## اختبارات loop engineering

```bash
npm run loop:check
```

هذا الأمر يشغّل أولاً فحص syntax واختبار regression محلياً على كامل مجموعة الـ40 سؤالاً مع مزوّد AI وهمي ثابت، بما فيها حالات الامتناع والسلامة والهلوسة وحالة الثقة المنخفضة في «تكرار الذنب والانتكاس». إذا كانت `node_modules` مثبتة، يكمل تلقائياً بـ`test` و`typecheck` و`build`. هذه الدورة المحلية لا تحتاج إلى نشر Vercel في كل تعديل.

ثم بعد نشر نسخة معاينة:

```bash
npm run benchmark -- --url https://YOUR-VERCEL-URL
```

نراجع الحالات الفاشلة، نغيّر **سبباً واحداً في كل دورة**، ثم نعيد نفس مجموعة الـ40 سؤالاً. الهدف ليس زيادة التعقيد بل تقليل أخطاء الاسترجاع، التوثيق والامتناع.

## واجهات المراجعة

- `/hiwar` — المسار الفعلي للمستخدم والحوار البحثي.
- `/maktaba` — المكتبة وسجل المصادر.
- `/lab` — شرح AI pipeline ومؤشرات القياس للجنة التحكيم والفريق.
- `/api/health` — فحص مزود AI، embedding model، Neon، وحالة corpus.

## Neon

التوثيق التشغيلي لا يؤثر في صحة الإجابة: إذا فشل اتصال Neon، لا تُسقط النتيجة. يتم حفظ الاستعلام، النتيجة، الـtop IDs، reranking، evidence gate، claims، conflicts، latency وبيانات المزود عند توفر الاتصال.

## المصادر والحقوق

راجِع `docs/SOURCES-AND-LICENSES.md` و`docs/RIGHTS-AND-RELEASE-CHECK.md` قبل النشر. ميّز دائماً بين `literal` و`curated-summary` ولا تقدّم الأخيرة على أنها نقل حرفي.


### Gemini free-tier resilience
الوضع الافتراضي صديق للـfree tier: الخطة محلية، لا توجد embedding request في كل سؤال، ويتم إرسال عدد صغير من المقاطع إلى Gemini. المسار المعتاد يستخدم re-ranking ثم claim generation ثم verification، مع ميزانية output صغيرة لكل مرحلة. embeddings متاحة اختيارياً، وفشلها لا يمنع fallback إلى retrieval المعتمد.

### Gemini capacity resilience
العميل يعيد محاولة محدودة لأخطاء 408/429/5xx ويمكنه التحول إلى `gemini-3.1-flash-lite` عند تعذر النموذج الأساسي مؤقتاً. لا تُضاف أي مفاتيح فعلية إلى المستودع.
