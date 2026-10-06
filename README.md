# رفيق القلوب — Rafiq Al-Qulub

<div dir="rtl">

**أداة بحث للخطباء والوعاظ والباحثين وطلاب العلم. تكتب سؤالك بلغتك، فتسترجع لك نصوصاً حقيقية
من مصادر مفهرسة معتمدة — مع اسم المصدر والجزء والصفحة والرابط الأصلي — وتمتنع صراحةً إن لم
تجد دليلاً كافياً. الأداة لا تُفتي ولا تُشخّص ولا تصف علاجاً.**

[العرض الحي](https://rafiq-al-qalbv2.vercel.app) · [الحوار البحثي](https://rafiq-al-qalbv2.vercel.app/hiwar) · [المكتبة](https://rafiq-al-qalbv2.vercel.app/maktaba) · [مختبر الأدلة للجنة التحكيم](https://rafiq-al-qalbv2.vercel.app/lab) · [فهرس الوثائق](docs/README.md)

> **حالة المستودع:** عام (Public) وجاهز للتحكيم والمراجعة. البنود التي لم تُنفَّذ مكتوبة صراحةً في القسم ١٥.
> **الترخيص:** كود التطبيق MIT (ملف `LICENSE`)؛ وأما المصادر والخطوط فلكلٍّ منها شروطه الموثقة في القسم ١٣.

</div>

---

## ١. المشكلة والحل

المادة العلمية والوعظية في أبواب العبادات القلبية (أثر الذنوب، قسوة القلب، التوبة، الغفلة،
الهمّ والقلق…) مبعثرة بين الكتب والمواقع والفتاوى. ومحركات البحث تعطي روابط لا نصوصاً، وأدوات
الذكاء الاصطناعي العامة تُجيب بثقة وبلا إسناد.

**رفيق القلوب يعكس الترتيب المعتاد:** الاسترجاع أولاً، والنموذج أخيراً.

1. يصف المستخدم موضوعه بلغته، عاميةً كانت أو فصحى.
2. يحدد النظام الباب البحثي من بين **١٢ باباً**، ويستخرج الكلمات المفتاحية.
3. يسترجع **نصوصاً فعلية** من مدوّنة مفهرسة مسبقاً (corpus) — لا روابط، ولا بحث في الإنترنت المفتوح.
4. يعرض لكل نص: المصدر، الجزء/الصفحة، الرابط الأصلي، ومتن الحديث كاملاً عند توفّره.
5. وإن لم تكفِ المادة: **امتناع صريح** برسالة «لم نجد مادة كافية…» بدل التخمين.

## ٢. الحدود الصارمة (ليست شعارات — لكل حدٍّ مسار وسياسة في الكود)

| الحالة | السلوك | الموضع في الكود |
|---|---|---|
| خطر على السلامة (إيذاء النفس، بأي لهجة) | إيقاف المحتوى الديني وردّ مساعدة فورية | `src/lib/safety.ts` |
| سؤال يشبه طلب تشخيص («هل أنا مصاب…») | لا تشخيص + توجيه عام لسؤال مختص مؤهل | `src/lib/policy/diagnosis.ts` |
| سؤال حلال/حرام أو طلب فتوى | لا فتوى + توجيه عام لسؤال أهل العلم | `src/lib/policy/fatwa.ts` |
| طلب وصفة أو جرعة أو علاج شخصي | لا وصفات + توجيه عام لسؤال مختص مؤهل | `src/lib/policy/prescription.ts` |
| طلب صفحة أو نص غير مفهرس | لا اختلاق + امتناع | `src/lib/research/pipeline.ts` |
| غياب مادة كافية | رسالة الامتناع المعيارية `ABSTAIN_MESSAGE` | `src/lib/terminology.ts` |

البوابات الأربع الأولى تعمل **قبل** الاسترجاع، فلا يمكن أن يسقط سؤال فتوى أو أزمة إلى ردّ
«مادة غير كافية» العام. وترتيبها ثابت: السلامة ← التشخيص ← الفتوى ← الوصفة.

## ٣. كيف يعمل — ست مراحل فعلية

```
وصف المستخدم
   ↓
[1] بوابات السياسة (سلامة ← تشخيص ← فتوى ← وصفة ← طلب غير مفهرس)
   ↓
[2] تطبيع عربي محلي + تقطيع، بلا أي خدمة خارجية: src/lib/text/arabic.ts
   ↓
[3] تحديد الباب البحثي + الكلمات المفتاحية (١٢ باباً): src/lib/rag/*.ts
   ↓
[4] استرجاع مضبوط من المصادر المعتمدة فقط:
     - عتبة صلة + حد أقصى ٤ نصوص + تنويع المصادر
     - سؤال «تفسير آية»: يُحصر في النصوص التي تحمل الآية ومرجعها
     - سؤال عن «رأي/قول» عالمٍ بعينه: لا يُسند إلا لمصدر مسجَّل لذلك العالم
   ↓
[5] بوابة الدليل: لا مادة كافية ← امتناع صريح
   ↓
[6] تنظيم مقيَّد: استدعاء نموذج واحد يعيد ترتيب النصوص المسترجعة فقط،
     ثم حارس مخرجات عربي يرفض أي صياغة محظورة؛ وإن غاب المفتاح أو رُفض
     المخرج ← تنظيم حتمي من النصوص نفسها.
```

الاسترجاع **واحد في الوضعين**: وجود النموذج لا يغيّره. `POST /api/research` يقبل
`mode: "ai" | "baseline"`، والقياس يثبت التطابق (`retrieval_identical_between_modes = true`).
النموذج لا يبحث ولا يسترجع؛ وظيفته الوحيدة صياغة ما استُرجع فعلاً.

**مهارة النحو العربي في التلخيص (بطاقة التميز).** يُحقن في `SYSTEM_PROMPT`
(`src/lib/ai/provider.ts`) سيرُ عملٍ من أربع خطوات وعشرُ نقاط مراقبة نحوية، مستخرجة من
ألفية ابن مالك بشرح الشيخ محمد بن صالح العثيمين
([المكتبة الشاملة — 36954](https://shamela.ws/book/36954)). غايتها ثلاثة أمور: سلامة الإعراب،
وأمانة المعنى الأصلي، وسلاسة الأسلوب الفصيح دون إضافة خارج الدليل. وهي معروضة بالتفصيل
للجنة في `/lab#nahw-skill`.

## ٤. المصادر والمدوّنة (الأعداد محسوبة من الملفات في هذه النسخة)

| # | المصدر | النصوص |
|---|---|---:|
| 1 | جامع خادم الحرمين الشريفين للسنة النبوية — **نصوص دليل مولَّدة من صفحات المتون الرسمية** | 271 |
| 2 | جامع السنة — مداخل فهرسة موضوعية (سياق بحثي) | 126 |
| 3 | الداء والدواء — ابن قيم الجوزية (موقع البدر) | 35 |
| 4 | صحيح البخاري — أحاديث مختارة | 15 |
| 5 | أمراض القلوب وشفاؤها — ابن تيمية | 15 |
| 6 | مجموع فتاوى ومقالات ابن باز (مختارات موضعية) | 11 |
| 7 | التوبة إلى الله والضراعة إليه عند نزول المصائب — ابن باز (الموقع الرسمي) | 6 |
| 8 | مشروع المصحف الإلكتروني — جامعة الملك سعود (نص القرآن وتفسيره) | 7 |
| | **الإجمالي** | **486** |

- بوابة `npm run alifta:verify` تتحقق آلياً من: ٢٧١ نصاً، و**٢٧٨/٢٨٠** صفحة متن رسمية ناجحة،
  و**٢٧١/٢٧١** تحمل المتن الكامل (لا مقتطفات بحثية)، و**١٠** منها بشرح رسمي موثَّق،
  وأن **كل باب من الأبواب الاثني عشر ≥ ٣ نصوص**.
- القاعدة: لا يدخل أي مصدر إلى الاسترجاع إلا إذا كان مسجَّلاً `active` في
  `src/lib/sources/registry.ts` وغير مستبعد. التفصيل في `docs/SOURCES-AND-LICENSES.md`
  و`docs/VERIFICATION-AUDIT.md`.

## ٥. الواجهات ومسارات الـAPI

| المسار | الوصف |
|---|---|
| `/` | الصفحة التعريفية: حدود الأداة، الأبواب الـ١٢، المصادر المعتمدة. حالة النظام ليست في الصفحة بل في `GET /api/health` |
| `/hiwar` | **الحوار البحثي** — المسار الرئيسي: وصف ← أبواب ← نصوص موثقة، أو امتناع/توجيه عام |
| `/hala` | لمحة بحثية: أسئلة ملاحية لتحديد الموضوع والكلمات المفتاحية |
| `/maktaba` + `/maktaba/[topic]` + `/maktaba/kutub/[slug]` | المكتبة: ١٢ باباً و٧ بطاقات مصادر |
| `/lab` | مختبر الأدلة: المراحل الفعلية، المقاييس، وطريقة القياس (مصمَّم للجنة) |
| `/wasfa` | سياسة عدم الوصف |
| `GET /api/health` | `{ ok, database, ai:{configured, mode}, corpus:{approvedChunks} }` |
| `POST /api/research` | `{ query, mode?: "ai" \| "baseline" }` ← نصوص + نتيجة + رسائل السياسة. الحدود: ٣٠ طلباً/دقيقة لكل عميل (٤٢٩ مع رأس `retry-after` عند التجاوز)، حجم الجسم ≤ ٨ ك.ب (٤١٣)، نص البحث ≤ ١٠٠٠ حرف (٤٠٠)، والجسم الذي ليس كائناً يُرفض بـ٤٠٠. لا يُخزَّن نص الاستعلام الخام |
| `POST /api/benchmark/conflict` | فحص تعارض اصطناعي (يتطلب مزوِّداً مُعدّاً، وإلا `503`) |

## ٦. التشغيل السريع

```bash
git clone https://github.com/ItsOkazaki/rafiq_al_qalb.git
cd rafiq_al_qalb
npm install                 # أو npm ci لتثبيت حرفي من package-lock
npm run dev                 # http://localhost:3000
```

التشغيل لا يحتاج مفتاحاً ولا قاعدة بيانات: بلا مفتاح يعمل المسار الحتمي كاملاً. ولنسخة الإنتاج:

```bash
npm run build && npm start
```

**المتطلبات:** Node.js ‏≥ 22.9 ‏(CI يستخدم 24)، وnpm، ولا شيء غير ذلك. لا FFmpeg ولا خطوط خارجية.

## ٧. الأوامر (كلها في `package.json` ومُشغَّلة فعلاً)

| الأمر | ماذا يفعل | يحتاج شبكة؟ |
|---|---|---|
| `npm run dev` | تشغيل التطوير | لا |
| `npm run build` | بناء الإنتاج (يتحقق من الأنواع أيضاً) | لا |
| `npm start` | تشغيل بناء الإنتاج | لا |
| `npm run lint` | ESLint | لا |
| `npm run typecheck` | ‏`tsc --noEmit` | لا |
| `npm test` | ٢٧١ اختبار وحدة (Vitest): الاسترجاع، الإسناد إلى المؤلِّف، المسار، السلامة والأذى الذاتي بكل اللهجات، بوابات الفتوى/التشخيص/الوصفة، تطبيع المعجم، حدود الطلب وهوية العميل ومقاومة التجاوز، التنظيم الحتمي، بطاقة الدليل، نصوص المكتبة | لا |
| `npm run audit:gate` | سلامة التبعيات: `npm audit --omit=dev --audit-level=high` — لا ثغرات عالية أو حرجة في تبعات الإنتاج | لا |
| `npm run smoke` | فحص زمن التشغيل: ٦٧ حالة + ١٠ فحوص صريحة | لا |
| `npm run benchmark -- --url <URL> [--limit N]` | قياس حقيقي على الـAPI، ويكتب `benchmarks/results/latest.json` | نعم (للرابط) |
| `npm run verify:quran-font` | وجود خط حفص + مطابقة بصمته + ربط CSS | لا |
| `npm run alifta:test` | ٣٣ اختبار انحدار للزاحف (بلا شبكة، على DOM حقيقي محفوظ) | لا |
| `npm run alifta:manifest` | ١٧ هدفاً تغطي الأبواب الاثني عشر + العتبات | لا |
| `npm run alifta:verify` | بوابة جودة المدوّنة المولَّدة | لا |
| `npm run alifta:ingest` | سحب المتون الرسمية وبناء المدوّنة (بوابات قبول قبل الكتابة) | نعم |
| `npm run alifta:live-check` / `npm run alifta:capture` | فحص حي / حفظ نماذج من الموقع الرسمي | نعم |
| `node scripts/loop-engineering.mjs` | حلقة التحسين المحلية: الاختبارات + الأنواع + خلاصة آخر قياس | لا |

## ٨. متغيرات البيئة (كلها اختيارية)

انسخ `.env.example` إلى `.env.local`. القيم الحقيقية تبقى خارج Git.

| المتغير | الوظيفة | الافتراضي |
|---|---|---|
| `DATABASE_URL` | تسجيل جلسات البحث في PostgreSQL (اختياري تماماً؛ غيابه لا يعطّل البحث) | — |
| `AI_PROVIDER` | ‏`gemini` \| `openrouter` \| `openai` — المزوِّد المضبوط يُجرَّب أولاً، والباقون احتياط إن وُجدت مفاتيحهم | يُستنتج من المفتاح |
| `GEMINI_API_KEY` / `GEMINI_CHAT_MODEL` | مزوِّد التنظيم الأساسي (المفتاح في رأس الطلب فقط، لا في الرابط) | `gemini-3.5-flash-lite` |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | مزوِّد موصول بالكامل ومسار احتياط، مع `OPENROUTER_SITE_URL` / `OPENROUTER_SITE_NAME` لرؤوس الإسناد | `qwen/qwen3.8-27b:free` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | مزوِّد بديل | `gpt-4o-mini` |
| `AI_TIMEOUT_MS` | مهلة إجمالية واحدة تتقاسمها كل محاولات المزوِّدين في الطلب (الحد الأدنى ٣٠٠٠) | `10000` في الكود (والمثال يضبط 20000) |
| `NEXT_PUBLIC_SITE_URL` | الروابط المطلقة لصور المشاركة الاجتماعية | من `VERCEL_URL` |
| `TRUST_PLATFORM_HEADERS` / `TRUSTED_PROXY_HOPS` | من أين يُقرأ عنوان العميل لحدّ الطلبات عند الاستضافة الذاتية (القسم ٩) | مُعرَّفان تلقائياً على Vercel |
| `JINA_API_KEY` | رفع حدود Jina أثناء سحب جامع السنة عند الحجب (صيانة فقط) | — |
| `ALLOW_CORPUS_SHRINK` | السماح صراحةً باستبدال مدوّنة أكبر بأصغر بعد مراجعة يدوية | معطَّل |

## ٩. ما الذي تحقّق فعلاً (نتائج تشغيل في هذه النسخة)

| الفحص | النتيجة |
|---|---|
| `npm ci` من نسخة نظيفة | تثبيت حرفي من `package-lock.json` بلا أخطاء — الرقم الفعلي يُطبع في سطر `added …` |
| `npm run typecheck` / `npm run lint` | ناجح / ناجح |
| `npm test` | **٢٧١/٢٧١** اختباراً في ٩ ملفات |
| `npm run build` | ناجح — ٢٧ صفحة ثابتة أو مُولَّدة مسبقاً + ٣ مسارات API، وبلا أخطاء أنواع (Next 16.3.8) |
| `npm run smoke` | ‏`{"ok":true,"benchmarkCases":67,"benchmarkFailures":0,"explicitChecks":10}` |
| `npm run audit:gate` | ناجح — صفر ثغرة عالية/حرجة في تبعات الإنتاج (الثغرة الحرجة السابقة في `next` أُغلقت بالترقية إلى 16.3.8) |
| بطارية تجاوز حد الطلبات (حيّة، ٦٠ طلباً لكل متجه) | كل المتجهات الستة **محدودة**: تدوير `User-Agent`، وتدوير `X-Forwarded-For` بعنصر واحد، وتدوير `x-real-ip`، وتدوير `x-vercel-forwarded-for`، وتدوير الأربعة معاً، وتدوير عنصرين في `X-Forwarded-For` — النتيجة في كلٍّ منها ٣٠×٢٠٠ ثم ٤٢٩ مع `retry-after` |
| عميل آخر حقيقي | لا يتأثر بدلو غيره |
| فحص الأجسام المشوَّهة | الجسم `null` أو مصفوفة أو قيمة أولية ← ٤٠٠ (كان ٥٠٠ بخطأ `TypeError` غير ملتقط)؛ بلا أي تسريب لمكدس الاستدعاء في ٢٣ حمولة اختبار |
| `npm run benchmark` (تشغيل كامل) | ٦٧/٦٧ حالة؛ احترم الحد ٤ مرات عبر `retry-after` ولم يتجاوزه |
| `npm run alifta:test` | **٣٣/٣٣** ناجح |
| `npm run alifta:manifest` | ناجح — ١٧ هدفاً / ١٢ باباً، والعتبات ١٠٠ نص و٣ لكل باب |
| `npm run alifta:verify` | ناجح — ٢٧١ نصاً، ٢٧٨/٢٨٠ صفحة، ١٢/١٢ باباً فوق العتبة |
| `npm run verify:quran-font` | ناجح — خط حفص المُضمَّن مطابق لبصمته (`sha256`) |
| `npm run build && npm start` + استدعاءات حية | مادة / امتناع / تشخيص / فتوى / سلامة — كلها في مسارها الصحيح: **٢٦/٢٦** في مصفوفة اللهجات والبوابات عبر HTTP |
| كل الصفحات (٢٥ صفحة + `/api/health`) | ٢٠٠، وأكبر صفحة ١٫١٨ م.ب، والمسارات غير الموجودة ٤٠٤ بصفحة عربية |

**كيف يُقرأ عنوان العميل في حدّ الطلبات (مهم للاستضافة).** المفتاح مشتق بـHMAC من عنوان
العميل وحده بسرّ خادوم؛ ولا يُخلط معه `User-Agent` ولا أي ترويسة يقبلها الخادم من العميل كما هي.
على Vercel تُقرأ ترويسات المنصة (`x-vercel-forwarded-for` ثم `x-real-ip`) لأن المنصة تكتبها.
وخارج المنصة لا تُقرأ أي ترويسة عنوان إلا بضبط صريح (`TRUST_PLATFORM_HEADERS=1` خلف وسيط
يكتبها بنفسه، مع `TRUSTED_PROXY_HOPS` بعدد الوكلاء)؛ وبدون ذلك يسقط العنوان إلى دلو واحد
مشترك — أي أن الفشل يكون باتجاه التشديد لا باتجاه التجاوز. النافذة ثابتة (٦٠ ثانية)، فيجوز
نظرياً دفعةٌ تصل إلى ضعفي الحدّ في اللحظات التي تعبر حدَّ النافذة، ثم يعود العدّ إلى ٣٠/دقيقة؛
وهذه مقايضة موثَّقة لا تجاوز.

## ١٠. القياس (Benchmark)

المجموعة ثابتة في `benchmarks/questions.json` — **٦٧ حالة**، مراجعة المجموعة `v3-67`:
أسئلة مباشرة، وعامية، وخارج النطاق، وفتوى/تشخيص/وصفة، و**١٢ حالة أذى ذاتي وصياغات أزمة
بكل اللهجات** (`crisis-safety`: سعودية وخليجية ومصرية وشامية ومغربية وليبية وعراقية وفصحى
وإنجليزية)، و**٥ حالات إسناد بين المؤلِّفين** (`supported-authority`)، و**٨ حالات فتوى**،
وبوابتا التشخيص والوصفة بالصيغ الدارجة، وأسئلة متعددة المصادر، ومحاولات دفع النظام إلى
اختلاق صفحة أو نسب مادة عالمٍ إلى غيره، و**حالَتا حارس من الرفض الخاطئ** — عبارتان تقترحهما
الواجهة نفسها يجب أن تُجابا بمادة لا بردّ سلامة. لا محادثات مستخدمين حقيقية في المجموعة.
الحالات الأربعون الأولى مطابقة لـ`v1-40` بايتاً ببايت، وسجل المراجعات وأسبابها في
`docs/BENCHMARK.md`.

**آخر تشغيل موثَّق — 2026-10-06، بناء إنتاج محلي بلا مفتاح مزوِّد (المسار الحتمي)، ٦٧/٦٧ حالة:**
`npm run benchmark -- --url http://127.0.0.1:3000`

| المقياس | القيمة |
|---|---:|
| `outcome_accuracy` | **1.00** |
| `baseline_outcome_accuracy` | **1.00** |
| `abstention_accuracy` (٣٣ حالة امتناع، منها ١٢ أذى ذاتي) | **1.00** |
| `retrieval_source_hit_at_4` | **1.00** |
| `topic_hit` | **1.00** |
| `retrieval_source_recall` | 0.9250 |
| `retrieval_chunk_hit_at_4` | 0.6538 |
| `retrieval_chunk_recall` | 0.4038 |
| `retrieval_identical_between_modes` | true |
| `model_organization_rate` | **0** — بلا مفتاح كل التنظيم حتمي، وهذه هي القيمة الصحيحة لا قيمة ناقصة |
| `deterministic_organization_rate` | **1** |

كان هذان المقياسان `null` دائماً في `v1` بسبب خلل في المُشغِّل نفسه (السطر لا يحمل `outcome`
بينما التجميع كان يرشّح عليه)، لا بسبب غياب المفتاح؛ أُصلح الخلل فصارا رقمين حقيقيين.

الملف الكامل `benchmarks/results/latest.json` مُلتزَم في Git بوصفه الدليل الآلي للتشغيل، ويكتبه
المُشغِّل وحده بلا تحرير يدوي. ولا يتغير إلا بتشغيل **كامل** جديد: التشغيل الجزئي (`--limit`)
يكتب `results/partial-N.json` (غير متعقَّب) ويترك الدليل الملتزم سليماً. والمُشغِّل يحترم حدّ
الطلبات فينتظر `retry-after` ولا يتجاوزه أبداً. قواعد النزاهة في `docs/BENCHMARK.md`.

## ١١. النشر

- **المنصة:** Vercel — المشروع الحي: <https://rafiq-al-qalbv2.vercel.app>
  ‏(`GET /api/health` ← `{"ok":true,"database":"connected","ai":{"configured":true,"provider":"Gemini","chatModel":"gemini-3.5-flash-lite","mode":"grounded-model-with-deterministic-fallback"},"corpus":{"approvedChunks":486}}`).
- **آلية النشر:** مشروع Vercel مرتبط بالمستودع، وكل دفع إلى الفرع الرئيسي `main` يُبنى ويُنشر
  تلقائياً؛ لا رفع يدوي ولا خطوة نشر منفصلة.
- **مفتاح المزوِّد:** بيئة الإنتاج مضبوطة بمفتاح المزوِّد وقاعدة البيانات، وعليها يعمل مسار
  التنظيم المقيَّد مع الرجوع التلقائي إلى المسار الحتمي. والتحقق بلا كشف أي مفتاح: افتح
  `/api/health` على الموقع فتُعرض حالة المزوِّد واسم النموذج وعدد النصوص المعتمدة.
- **بدون أي إعداد:** التطبيق يُنشر ويعمل كاملاً بلا متغيرات بيئة؛ وأضف `DATABASE_URL` فقط إن
  أردت تسجيل الجلسات.
- الخطوات والتحقق بعد النشر في `docs/DEPLOYMENT.md`.

## ١٢. تحديث المدوّنة (آلياً ويدوياً)

- **آلياً:** `.github/workflows/refresh-alifta-html.yml` — عند الدفع إلى `main` أو عبر
  `workflow_dispatch`: تثبيت بالتزامن مع `npm ci` ← اختبارات التطبيق ← اختبارات الزاحف ←
  فحص الأهداف ← السحب ← `alifta:verify` ← التحقق من أن المدوّنة غير فارغة ← التزام النتائج.
  آخر تشغيل موثَّق على `main` نجح في GitHub Actions ‏(Run `37144086722`).
- **يدوياً:** الأوامر نفسها محلياً:
  `npm run alifta:test && npm run alifta:manifest && npm run alifta:ingest && npm run alifta:verify`.
- **حماية البيانات:** أي تشغيل فاشل أو دون العتبة (١٠٠ نص، و٣ لكل باب) **لا يلمس** المدوّنة
  المعتمدة؛ يكتب تشخيصه في `scripts/alifta-html/reports/` ويخرج بخطأ — وهو مثبت باختبار انحدار آلي.

## ١٣. الخطوط والتراخيص

| العنصر | الترخيص |
|---|---|
| كود التطبيق | MIT ‏(`LICENSE`) |
| خطوط الواجهة (Amiri، IBM Plex Sans Arabic، Aref Ruqaa) | ‏SIL OFL 1.1 عبر npm |
| خط الآيات: KFGQPC HAFS Uthmanic Script v2.2 | ترخيص المجمع المضمَّن في ملف الخط: استخدام ونسخ وتوزيع مجاناً، ويُمنع التعديل — لذلك يُخدَم بايتاً ببايت بلا تحويل ولا تجزئة. البصمة والتفاصيل في `public/fonts/README.md` و`docs/FONT-LICENSE.md` |
| نصوص المصادر | مقتطفات قصيرة منسوبة مع روابطها الأصلية؛ انظر `docs/SOURCES-AND-LICENSES.md` و`docs/RIGHTS-AND-RELEASE-CHECK.md` |

## ١٤. الخصوصية والأمان

- لا حسابات ولا ملفات تعريف: الاستعلام لا يُربط بهوية، وسجل الجلسات (إن فُعِّل) كمّي بحثي فقط.
- عند توصيل مزوِّد، يُرسل **الاستعلام + النصوص المسترجعة** فقط لصياغة الملخَّص؛ لا تُرسل بيانات
  هوية ولا ملفات.
- الأسرار لا تدخل Git: ملفات `.env*` متجاهَلة، والفحص الآلي موثَّق في `docs/RIGHTS-AND-RELEASE-CHECK.md`.
- لا سحب من الإنترنت المفتوح أثناء البحث، ولا تنفيذ لأي كود صادر من المصادر.

## ١٥. ما لم يُوصَل بعد (بصراحة)

| البند | الحالة |
|---|---|
| دمج فرع التسليم في `main` | **مفتوح** — وهو نفسه خطوة النشر، إذ ينشر Vercel من `main` تلقائياً |
| وسم إصدار `challenge-final-2026` | **مفتوح** — بعد إغلاق البنود أدناه |
| تشغيل القياس على البيئة المنشورة (بمفتاح) لتسجيل `model_organization_rate` بقيمة غير صفرية | **مفتوح** — المقياس صار يُحسب فعلاً (قيمته 0 محلياً لأن التشغيل حتمي بالكامل)، ويبقى قياس مسار النموذج متوقفاً على بيئة بمفتاح |
| فحص التعارض `POST /api/benchmark/conflict` | محلياً `CHECK` (بلا مزوِّد)؛ يحتاج بيئة بمفتاح |
| اختبار تجربة مع مستخدمين حقيقيين | **لم يُنفَّذ** — لا جلسات ولا نتائج مسجَّلة |
| فيديو العرض (≤ دقيقتان) | **مفتوح** — السيناريو جاهز: `docs/DEMO-SCRIPT.md` |
| البحث الدلالي (semantic embeddings) | غير موصول بقصد؛ العميل موجود في `src/lib/ai/embeddings.ts` كأساس هندسي معلَّق، والاسترجاع الحالي لفظي/موضوعي فقط |
| مسار Docling للملفات | اختياري وغير موصول بالتشغيل (`docs/OPTIONAL-DOCLING.md`) |
| `alifta:live-check` / `alifta:ingest` في بيئة التطوير | يحتاجان وصولاً إلى شبكة `sunna.alifta.gov.sa` (متوفر في CI) |

## ١٦. بنية المستودع

```
src/app/              الصفحات (App Router) ومسارات API
src/components/       مكونات الواجهة (بطاقة الدليل، قائمة النصوص، الهيكل، الزخارف)
src/lib/rag/          تحديد الأبواب، الكلمات المفتاحية، محرك الاسترجاع
src/lib/corpus/       المدوّنة المعتمدة (٤٨٦ نصاً: ٢٧١ مولَّدة من جامع السنة + ٢١٥ منسَّقة)
src/lib/policy/       بوابات الفتوى/التشخيص/الوصفة
src/lib/safety.ts     كاشف الأذى الذاتي: ١٤٥ علامة + ١٩ نمطاً + ١٩ قاعدة تركيبية
src/lib/ai/           مزوِّد النموذج + حارس المخرجات (التمثيلات الدلالية غير موصولة)
src/lib/sources/      سجل المصادر المعتمدة والمستبعدة
scripts/alifta-html/  الزاحف + ٣٣ اختبار انحدار + بوابات الجودة
benchmarks/           ٦٧ حالة ثابتة + مُشغِّل القياس
docs/                 فهرس + ١٩ وثيقة (ابدأ من docs/README.md)
public/fonts/         خط حفص المُضمَّن + ترخيصه
```

## ١٧. خريطة التحكيم

كل معيار تحكيم مربوط بدليل قابل للفتح في الكود عبر `docs/JUDGE-RUBRIC-MAP.md`. وقاعدتا نزاهة:
(١) المستودع إيداع واحد مضغوط، فلا يُنسب كل سطر إلى يوم بعينه، ولا تُقدَّم الأعمال السابقة
على أنها منفَّذة داخل نافذة التحدي؛ (٢) لا رقم أداء في أي وثيقة إلا من تشغيل حقيقي ينتجه.

---

<details>
<summary><strong>English summary</strong></summary>

**Rafiq Al-Qulub** is a grounded Islamic-research assistant for preachers and researchers working
on heart-related topics. It maps a user's description to one of 12 research doors, retrieves real
passages **only** from a pre-approved, source-registered corpus, shows source + part/page +
original link, and **abstains explicitly** when the evidence is insufficient. It never diagnoses,
issues fatwas, or prescribes treatment.

- **Retrieval-first design:** the LLM never retrieves. It only re-organizes passages that were
  already retrieved, behind an Arabic output guard; without an API key the same answer is produced
  deterministically.
- **Corpus:** 486 approved chunks — 271 generated from official Al-Ifta pages (full matn, 278/280
  pages verified, 12/12 doors covered) plus 215 curated chunks from 7 registered sources.
- **Matn and sharh are never the same layer:** a commentary page (`BookToc/ViewServicePage` —
  عمدة القاري، فتح الباري، …) puts the matn and the commentator's text back to back with no
  separator, so the crawler cuts at the first commentary opener and keeps only the verified matn in
  `hadithFullText`, with the official gloss in `explanationText`. `npm run alifta:verify` fails the
  corpus if any stored matn still carries a sharh section, and `npm run alifta:repair-matn`
  re-derives an already committed corpus with the same splitter. If a matn cannot be verified
  separately, the card suppresses the «الحديث» layer instead of labelling commentary as hadith.
- **Four policy gates before retrieval** (safety → diagnosis → fatwa → prescription), so a
  fatwa-shaped question can never collapse into a generic "insufficient material" answer. The
  safety detector covers dialectal cries for help and method-seeking phrasings across Saudi/Gulf,
  Egyptian, Levantine, Moroccan, Libyan and Iraqi Arabic plus English: 145 markers, 19 patterns,
  19 compositional rules, with negation and other-target handling.
- **Reproducibility:** 310 unit tests, 41 offline crawler regression tests, manifest checks, a
  67-case frozen benchmark (dataset revision `v3-67`, including 12 self-harm cases, 8 fatwa cases,
  5 cross-author attribution cases and 2 false-refusal guards), an offline runtime smoke test, a
  production-dependency audit gate, and a SHA-256-checked Quran font gate — all runnable from
  `package.json`.
- **Rate limiting cannot be bypassed by header rotation:** six live 60-request batteries (rotating
  `User-Agent`, single-entry `X-Forwarded-For`, `x-real-ip`, `x-vercel-forwarded-for`, all four at
  once, and a two-entry chain) each end at 30×200 then 429 with `retry-after`. Outside the hosting
  platform no client-written address header is read at all, so the limiter fails closed.
- **Last local benchmark (deterministic, no provider key):** outcome accuracy 1.00, abstention
  accuracy 1.00, source hit@4 1.00, topic hit 1.00, source recall 0.925, chunk hit@4 0.654.
- **Status:** the repository is public and deployed on Vercel
  (<https://rafiq-al-qalbv2.vercel.app>); remaining items (deployed benchmark run with a key, UX
  testing, demo video, release tag) are listed in section 15.

</details>
