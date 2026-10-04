# رفيق القلوب — Rafiq Al-Qulub

<div dir="rtl">

**أداة حوارية للخطباء والوعاظ والباحثين وطلاب العلم: تسترجع المادة العلمية حصراً من مصادر مفهرسة معتمدة، مع إسناد المصدر والموضع والرابط، وامتناع صريح عند غياب الدليل. لا تشخّص، ولا تُفتي، ولا تصف علاجاً.**

[العرض الحي](https://rafiq-al-qalbv2.vercel.app) · [الحوار البحثي](https://rafiq-al-qalbv2.vercel.app/hiwar) · [المكتبة](https://rafiq-al-qalbv2.vercel.app/maktaba) · [مختبر الأدلة للجنة التحكيم](https://rafiq-al-qalbv2.vercel.app/lab) · [فهرس الوثائق](docs/README.md)

> **حالة المستودع:** عام (Public) وجاهز للتحكيم والمراجعة — قائمة التسليم في `docs/CHALLENGE-DELIVERY-CHECKLIST.md`.
> **الترخيص:** كود التطبيق MIT (`LICENSE`)؛ أما المصادر والخطوط فلكل منها شروطه الموثقة أدناه.

</div>

---

## ١. المشكلة والحل

المادة الوعظية والعلمية في أبواب العبادات القلبية (أثر الذنوب، قسوة القلب، التوبة، الغفلة، الهم والقلق…) مشتتة بين الكتب والمواقع والفتاوى، ومستخرجات البحث تعطي روابط لا نصوصاً، وأدوات الذكاء الاصطناعي العامة تُجيب بثقة بلا إسناد.

**رفيق القلوب يعكس التصميم المعتاد:** الاسترجاع أولاً والنموذج أخيراً.

1. يصف المستخدم موضوعه بلغته.
2. يحدد النظام الباب البحثي من بين **١٢ باباً** والكلمات المفتاحية.
3. يسترجع **مقاطع فعلية** من corpus مفهرس مسبقاً — لا روابط، ولا بحث من الإنترنت المفتوح.
4. يعرض لكل مقطع: المصدر، الجزء/الصفحة، الرابط الأصلي، ونص المتن الكامل عند توفره.
5. إن لم تكفِ المادة: **امتناع صريح** («لم نجد مادة كافية…») بدل التخمين.

## ٢. الحدود الصارمة (ليست شعارات — لها مسارات وسياسات في الكود)

| الحالة | السلوك | الموضع |
|---|---|---|
| خطر على السلامة (إيذاء النفس…) | إيقاف المحتوى الديني ورد مساعدة فورية | `src/lib/safety.ts` |
| سؤال يشبه التشخيص («هل أنا مصاب…») | لا تشخيص + إحالة | `src/lib/policy/diagnosis.ts` |
| سؤال حلال/حرام أو طلب فتوى | لا فتوى + إحالة إلى أهل العلم | `src/lib/policy/fatwa.ts` |
| طلب وصفة أو علاج شخصي | لا وصفات + إحالة | `src/lib/policy/prescription.ts` |
| طلب صفحة/نص غير مفهرس | لا اختلاق + امتناع | `src/lib/research/pipeline.ts` |
| غياب مادة كافية | `ABSTAIN_MESSAGE` | `src/lib/terminology.ts` |

## ٣. كيف يعمل — ست مراحل فعلية

```
وصف المستخدم
   ↓
[1] بوابات السياسة (سلامة → تشخيص → فتوى → وصف  → طلب غير مفهرس)
   ↓
[2] تطبيع عربي محلي + تقطيع (بلا أي خدمة خارجية): src/lib/text/arabic.ts
   ↓
[3] تحديد الباب البحثي + الكلمات المفتاحية (١٢ باباً): src/lib/rag/*.ts
   ↓
[4] استرجاع مضبوط من المصادر المعتمدة فقط:
     - عتبة صلة + حد أقصى ٤ مقاطع + تنويع المصادر
     - سؤال «تفسير آية»: يُحصر في مقاطع تحمل نص الآية ومرجعها
     - سؤال «رأي/قول» عالمٍ بعينه: لا يُسند إلا لمصدر مسجّل لذلك العالم
   ↓
[5] بوابة الدليل: لا مادة كافية → امتناع صريح
   ↓
[6] تنظيم مُقيَّد: استدعاء نموذج واحد يُعيد ترتيب المقاطع المسترجعة فقط،
     ثم حارس مخرجات عربي يرفض أي صياغة محظورة؛ وإن غاب المفتاح أو رُفض
     المخرج → تنظيم حتمي من المقاطع نفسها.
```

الاسترجاع **واحد في الوضعين** (لا يتغير بوجود النموذج): `POST /api/research` يقبل `mode: "ai" | "baseline"`، والقياس يثبت التطابق (`retrieval_identical_between_modes = true`). النموذج لا يبحث ولا يسترجع.

- **بطاقة التميز في التلخيص الآلي (مهارة النحو العربي):** تُحقن في `SYSTEM_PROMPT` (`src/lib/ai/provider.ts`) **مهارة النحو العربي للتلخيص المحكم المستخرجة من ألفية ابن مالك [شرح الشيخ محمد بن صالح العثيمين]** ([المكتبة الشاملة — 36954](https://shamela.ws/book/36954))، وتشمل سير عمل داخلياً من ٤ خطوات و١٠ نقاط مراقبة نحوية لضبط سلامة الإعراب، دقة المعنى الأصلي، وسلاسة الأسلوب الفصيح دون إضافة خارج الدليل (معروضة بالتفصيل للجنة في `/lab#nahw-skill`).

## ٤. المصادر والـcorpus (الأعداد محسوبة من الملفات في هذا الـcommit)

| # | المصدر | المقاطع |
|---|---|---:|
| 1 | جامع خادم الحرمين الشريفين للسنة النبوية — **مقاطع دليل مولَّدة من صفحات المتون الرسمية** | 271 |
| 2 | جامع السنة — مداخل فهرسة موضوعية (سياق بحثي) | 126 |
| 3 | الداء والدواء — ابن قيم الجوزية (موقع البدر) | 35 |
| 4 | صحيح البخاري — أحاديث مختارة | 15 |
| 5 | أمراض القلوب وشفاؤها — ابن تيمية | 15 |
| 6 | مجموع فتاوى ومقالات ابن باز (مختارات موضعية) | 11 |
| 7 | التوبة إلى الله والضراعة إليه عند نزول المصائب — ابن باز (الموقع الرسمي) | 6 |
| 8 | مشروع المصحف الإلكتروني — جامعة الملك سعود (نص القرآن وتفسيره) | 7 |
| | **الإجمالي** | **486** |

- بوابة `npm run alifta:verify` تتحقق آلياً: 271 مقطعاً، **278/280** صفحة متن رسمية ناجحة، **271/271** تحمل المتن الكامل (لا مقتطفات بحث)، **10** بشرح رسمي موثّق، و**كل الأبواب الاثنا عشر ≥ ٣ مقاطع**.
- القاعدة: مصدر لا يدخل الاسترجاع إلا إذا كان مسجّلاً `active` في `src/lib/sources/registry.ts` وغير مستبعد؛ والتفصيل في `docs/SOURCES-AND-LICENSES.md` و`docs/VERIFICATION-AUDIT.md`.

## ٥. الواجهات ومسارات الـAPI

| المسار | الوصف |
|---|---|
| `/` | الصفحة التعريفية + حالة النظام |
| `/hiwar` | **الحوار البحثي** — المسار الرئيسي: وصف → أبواب → مقاطع موثقة أو امتناع/إحالة |
| `/hala` | لمحة بحثية: أسئلة ملاحة لتحديد الموضوع والكلمات المفتاحية |
| `/maktaba` + `/maktaba/[topic]` + `/maktaba/kutub/[slug]` | المكتبة: ١٢ باباً و٧ بطاقات مصادر |
| `/lab` | مختبر الأدلة: المراحل الفعلية والمقاييس وطريقة القياس (مصمَّم للجنة) |
| `/wasfa` | سياسة عدم الوصف |
| `GET /api/health` | `{ ok, database, ai:{configured, mode}, corpus:{approvedChunks} }` |
| `POST /api/research` | `{ query, mode?: "ai" \| "baseline" }` → مقاطع + نتيجة + رسائل السياسة |
| `POST /api/benchmark/conflict` | فحص تعارض اصطناعي (يتطلب مزوّداً مُعدّاً، وإلا `503`) |

## ٦. التشغيل السريع

```bash
git clone https://github.com/ItsOkazaki/rafiq_al_qalb.git
cd rafiq_al_qalb
npm install                 # أو npm ci لتثبيت حرفي من package-lock
npm run dev                 # http://localhost:3000
```

لا يحتاج التشغيل إلى أي مفتاح أو قاعدة بيانات: بلا مفتاح يعمل المسار الحتمي كاملاً. لإنتاج نسخة نهائية:

```bash
npm run build && npm start
```

**المتطلبات:** Node.js ≥ 22.9 (CI يستخدم 24)، npm، ولا شيء غير ذلك. FFmpeg أو خطوط خارجية غير مطلوبة.

## ٧. الأوامر (كلها موجودة في `package.json` ومُشغَّلة فعلاً)

| الأمر | ماذا يفعل | يحتاج شبكة؟ |
|---|---|---|
| `npm run dev` | تشغيل التطوير | لا |
| `npm run build` | بناء الإنتاج (يتحقق من TypeScript أيضاً) | لا |
| `npm start` | تشغيل بناء الإنتاج | لا |
| `npm run lint` | ESLint | لا |
| `npm run typecheck` | `tsc --noEmit` | لا |
| `npm test` | ٦٨ اختبار وحدة (Vitest: الاسترجاع، المسار، التنظيم الحتمي، بطاقة الدليل) | لا |
| `npm run smoke` | فحص زمن تشغيل: ٤٠ حالة + ١٠ فحوص صريحة | لا |
| `npm run benchmark -- --url <URL> [--limit N]` | قياس حقيقي على الـAPI ويكتب `benchmarks/results/latest.json` | نعم (للـURL) |
| `npm run verify:quran-font` | وجود خط حفص + مطابقة بصمته + ربط CSS | لا |
| `npm run alifta:test` | ٣٣ اختبار انحدار للزاحف (Offline، DOM حقيقي) | لا |
| `npm run alifta:manifest` | ١٧ هدفاً تغطي الأبواب الاثني عشر + العتبات | لا |
| `npm run alifta:verify` | بوابة جودة corpus المولَّد | لا |
| `npm run alifta:ingest` | سحب المتون الرسمية وبناء corpus (بوابات قبول قبل الكتابة) | نعم |
| `npm run alifta:live-check` / `npm run alifta:capture` | فحص حي/حفظ fixtures من الموقع الرسمي | نعم |

## ٨. متغيرات البيئة (كلها اختيارية)

انسخ `.env.example` إلى `.env.local`. القيم الحقيقية تبقى خارج Git.

| المتغير | الوظيفة | الافتراضي |
|---|---|---|
| `DATABASE_URL` | تسجيل جلسات البحث في PostgreSQL (اختياري تماماً؛ غيابه لا يعطّل البحث) | — |
| `AI_PROVIDER` | `gemini` \| `openrouter` \| `openai` | يُستنتج من المفتاح |
| `GEMINI_API_KEY` / `GEMINI_CHAT_MODEL` | مزوّد التنظيم الأساسي | `gemini-3.5-flash-lite` |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | مزوّد بديل | `qwen/qwen3.8-27b:free` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | مزوّد بديل | `gpt-4o-mini` |
| `AI_TIMEOUT_MS` | مهلة استدعاء المزوّد (الحد الأدنى ٣٠٠٠) | `10000` في الكود (والمثال يضبط 20000) |
| `NEXT_PUBLIC_SITE_URL` | روابط OG المطلقة | من `VERCEL_URL` |
| `JINA_API_KEY` | رفع حدود Jina أثناء سحب جامع السنة عند الحجب (صيانة فقط) | — |
| `ALLOW_CORPUS_SHRINK` | السماح صراحةً باستبدال corpus أكبر بأصغر بعد مراجعة يدوية | معطّل |

## ٩. ما الذي تحقّق فعلاً (نتائج التشغيل في هذه النسخة)

| الفحص | النتيجة |
|---|---|
| `npm ci` (من نسخة نظيفة) | تثبيت حرفي من `package-lock.json` بلا أخطاء — الرقم الفعلي يُطبع في سطر `added …` |
| `npm run typecheck` / `npm run lint` | PASS / PASS |
| `npm test` | **٦٨/٦٨** اختباراً (٤ ملفات) |
| `npm run build` | PASS — ٢٧ صفحة ثابتة/مُسبقة التوليد + ٣ مسارات API، وبلا أخطاء أنواع |
| `npm run smoke` | `{"ok":true,"benchmarkCases":40,"benchmarkFailures":0,"explicitChecks":10}` |
| `npm run alifta:test` | **٣٣/٣٣** PASS |
| `npm run alifta:manifest` | PASS — ١٧ هدفاً/١٢ باباً، العتبات ١٠٠ مقطع و٣ لكل باب |
| `npm run alifta:verify` | PASS — ٢٧١ مقطعاً، ٢٧٨/٢٨٠ صفحة، ١٢/١٢ باباً فوق العتبة |
| `npm run verify:quran-font` | PASS — خط حفص المُضمَّن مطابق لبصمته (`sha256`) |
| `npm run build && npm start` + ٦ استدعاءات حية | مادة/امتناع/تشخيص/فتوى/سلامة — كلها في مسارها الصحيح |

## ١٠. القياس (Benchmark)

المجموعة ثابتة: `benchmarks/questions.json` — **٤٠ حالة** (أسئلة مباشرة، عامية، خارج النطاق، فتوى/سلامة/وصف، متعددة المصادر، ومحاولات دفع النظام لاختلاق صفحة). لا محادثات مستخدمين حقيقية.

**آخر تشغيل موثّق — 2026-10-03، بناء إنتاج محلي بلا مفتاح مزوّد (المسار الحتمي):**
`npm run benchmark -- --url http://127.0.0.1:3000`

| المقياس | القيمة |
|---|---:|
| `outcome_accuracy` | **1.00** |
| `abstention_accuracy` | **1.00** |
| `retrieval_source_hit_at_4` | **1.00** |
| `topic_hit` | **1.00** |
| `retrieval_source_recall` | 0.9063 |
| `retrieval_chunk_hit_at_4` | 0.6538 |
| `retrieval_chunk_recall` | 0.3942 |
| `retrieval_identical_between_modes` | true |
| `model_organization_rate` | — (لا مفتاح محلياً؛ يُقاس على البيئة المنشورة) |

الملف الكامل `benchmarks/results/latest.json` مُلتزَم في Git بوصفه الدليل الآلي للتشغيل (بلا أي تحرير يدوي)؛ ولا يتغير إلا بتشغيل جديد. قاعدة النزاهة موثقة في `docs/BENCHMARK.md`.

## ١١. النشر

- **المنصة:** Vercel — المشروع الحي: <https://rafiq-al-qalbv2.vercel.app> (`GET /api/health` → `{"ok":true,"database":"connected","ai":{"configured":true,"provider":"Gemini","chatModel":"gemini-3.5-flash-lite","mode":"grounded-model-with-deterministic-fallback"},"corpus":{"approvedChunks":486}}`).
- **آلية النشر:** مشروع Vercel مرتبط بالمستودع، وكل دفع إلى الفرع الرئيسي `main` يُبنى ويُنشر تلقائياً؛ لا رفع يدوي ولا
  خطوة نشر منفصلة.
- **مفتاح المزوّد:** بيئة الإنتاج مضبوطة بمفتاح المزوّد وقاعدة البيانات، وعليها يعمل مسار التنظيم المقيَّد مع الرجوع التلقائي للمسار الحتمي. التحقق بلا كشف أي مفتاح: افتح مسار `/api/health` على الموقع، فتُعرض
  حالة المزوّد واسم النموذج وعدد المقاطع المعتمدة.
- **بدون أي إعداد:** التطبيق ينشر ويعمل كاملاً بلا متغيرات؛ أضف `DATABASE_URL` فقط إن أردت تسجيل الجلسات.
- الخطوات والتحقق بعد النشر في `docs/DEPLOYMENT.md`.

## ١٢. تحديث الـcorpus (تلقائي ويدوي)

- **آلياً:** `.github/workflows/refresh-alifta-html.yml` — عند push إلى `main` أو عبر `workflow_dispatch`: `npm ci` → اختبارات التطبيق → اختبارات الزاحف → فحص الـmanifest → السحب → `alifta:verify` → assert أن الـcorpus غير فارغ → التزام النتائج. آخر تشغيل موثّق على `main` نجح على GitHub Actions (Run `37144086722`) باستخدام `npm ci` مع `--autostash`.
- **يدوياً:** نفس الأوامر محلياً: `npm run alifta:test && npm run alifta:manifest && npm run alifta:ingest && npm run alifta:verify`.
- **حماية البيانات:** أي تشغيل فاشل أو دون العتبة (١٠٠ مقطع، ٣ لكل باب) **لا يلمس** الـcorpus المعتمد؛ يكتب تشخيصه في `scripts/alifta-html/reports/` ويخرج بخطأ — مثبت باختبار انحدار آلي.

## ١٣. الخطوط والتراخيص

| العنصر | الترخيص |
|---|---|
| كود التطبيق | MIT (`LICENSE`) |
| خطوط الواجهة (Amiri، IBM Plex Sans Arabic، Aref Ruqaa) | SIL OFL 1.1 عبر npm |
| خط الآيات: KFGQPC HAFS Uthmanic Script v2.2 | ترخيص المجمع المضمَّن في ملف الخط: استخدام/نسخ/توزيع مجاناً، ويُمنع التعديل — لذلك يُخدَم بايتاً ببايت بلا تحويل ولا تجزئة. البصمة والتفاصيل في `public/fonts/README.md` و`docs/FONT-LICENSE.md` |
| نصوص المصادر | مقتطفات قصيرة منسوبة مع روابطها الأصلية؛ انظر `docs/SOURCES-AND-LICENSES.md` و`docs/RIGHTS-AND-RELEASE-CHECK.md` |

## ١٤. الخصوصية والأمان

- لا حسابات ولا ملفات تعريف: الاستعلام لا يُربط بهوية، وسجل الجلسات (إن فُعّل) كمّي بحثي فقط.
- عند توصيل مزوّد، يُرسل **الاستعلام + المقاطع المسترجعة** فقط لصياغة الملخّص؛ لا تُرسل بيانات هوية ولا ملفات.
- الأسرار لا تدخل Git: `.env*` متجاهَل، والفحص الآلي في `docs/RIGHTS-AND-RELEASE-CHECK.md`.
- لا سحب من الإنترنت المفتوح أثناء البحث، ولا تنفيذ أي كود من المصادر.

## ١٥. ما لم يُوصَل بعد (بصراحة)

| البند | الحالة |
|---|---|
| دمج فرع التسليم في `main` | **مفتوح** — وهو نفسه خطوة النشر، إذ ينشر Vercel من `main` تلقائياً |
| تشغيل البنشمارك على البيئة المنشورة (بمفتاح) لقياس `model_organization_rate` | **مفتوح** — التشغيل المحلي الحالي حتمي |
| فحص التعارض `POST /api/benchmark/conflict` | محلياً `CHECK` (بلا مزوّد)؛ يحتاج بيئة بمفتاح |
| اختبار UX مع ٥–٨ مستخدمين | **مفتوح** — البروتوكول جاهز: `docs/UX-TEST-PLAN.md` |
| فيديو العرض (≤ دقيقتان) | **مفتوح** — السيناريو جاهز: `docs/DEMO-SCRIPT.md` |
| البحث الدلالي/embeddings | غير موصول بقصد؛ العميل موجود في `src/lib/ai/embeddings.ts` كأساس هندسي معلَّق، والاسترجاع الحالي لفظي/موضوعي فقط |
| مسار Docling للملفات | اختياري وغير موصول بالتشغيل (`docs/OPTIONAL-DOCLING.md`) |
| `alifta:live-check` / `alifta:ingest` في هذه البيئة | يحتاجان وصولاً لشبكة `sunna.alifta.gov.sa` (متوفر في CI) |

## ١٦. بنية المستودع

```
src/app/            الصفحات (App Router) ومسارات API
src/components/     مكونات الواجهة (بطاقة الدليل، الهيكل، الزخارف)
src/lib/rag/        تحديد الأبواب، الكلمات المفتاحية، محرك الاسترجاع
src/lib/corpus/     corpus المعتمد (486 مقطعاً: 271 مولَّداً من جامع السنة + 215 منسّقاً)
src/lib/policy/     بوابات الفتوى/التشخيص/الوصف + السلامة
src/lib/ai/         مزوّد النموذج + حارس المخرجات (embeddings غير موصول)
src/lib/sources/    سجل المصادر المعتمدة والمستبعدات
scripts/alifta-html/  الزاحف + 33 اختبار انحدار + بوابات الجودة
benchmarks/         40 حالة ثابتة + مشغّل القياس
docs/               فهرس + 31 وثيقة (يبدأ من docs/README.md)
public/fonts/       خط حفص المُضمَّن + ترخيصه
```

## ١٧. خريطة التحكيم

كل معيار تحكيم مربوط بدليل قابل للفتح في الكود عبر `docs/JUDGE-RUBRIC-MAP.md`، مع قاعدتي نزاهة: (١) ما قبل نافذة التحدي موثّق في `docs/PRE-CHALLENGE-BASELINE.md` ولا يُنسب للنافذة، (٢) لا رقم أداء بلا تشغيل حقيقي ينتجه.

---

<details>
<summary><strong>English summary</strong></summary>

**Rafiq Al-Qulub** is a grounded Islamic-research assistant for preachers and researchers in heart-related topics. It maps a user's description to one of 12 research doors, retrieves real passages **only** from a pre-approved, source-registered corpus, shows source + part/page + original link, and **abstains explicitly** when evidence is insufficient. It never diagnoses, issues fatwas, or prescribes treatment.

- **Retrieval-first design:** the LLM never retrieves. It only re-organizes the passages that were already retrieved, under an Arabic output guard; without an API key the same answer is produced deterministically.
- **Corpus:** 486 approved chunks — 271 generated from official Al-Ifta pages (full matn, 278/280 pages verified, 12/12 doors covered) plus 215 curated chunks from 7 registered sources.
- **Reproducibility:** 68 unit tests, 33 offline crawler regression tests, manifest checks, a 40-case frozen benchmark, an offline runtime smoke test, and a SHA-256-checked Quran font gate — all runnable from `package.json`.
- **Last local benchmark (deterministic, no provider key):** outcome accuracy 1.00, abstention accuracy 1.00, source hit@4 1.00, topic hit 1.00, source recall 0.906, chunk hit@4 0.654.
- **Status:** repository is public and deployed on Vercel (<https://rafiq-al-qalbv2.vercel.app>); remaining optional post-deployment items (deployed benchmark run, UX testing, demo video) are tracked in `docs/CHALLENGE-DELIVERY-CHECKLIST.md`.

</details>
