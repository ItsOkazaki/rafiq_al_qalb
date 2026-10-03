# قائمة التسليم النهائية

> الحالة مسجّلة كما هي في هذا الـcommit. البنود التي لم تُنفَّذ مكتوبة صراحةً كغير منفَّذة.

## لا مفاوضات (تم)

- [x] لا توجد مفاتيح أو `.env` أو logs أو traces في Git (`.gitignore` + مراجعة `git ls-files`).
- [x] لا توجد بيانات مستخدمين حقيقية في benchmark (المجموعة ثابتة ومصنوعة).
- [x] `npm run typecheck` ناجح.
- [x] `npm run lint` ناجح.
- [x] `npm test` ناجح (68 اختباراً في 4 ملفات).
- [x] `npm run alifta:test` ناجح (33 اختباراً، أوفلاين).
- [x] `npm run alifta:verify` ناجح (271 مقطعاً وكل الأبواب فوق العتبة).
- [x] `npm run build` ناجح.
- [x] `npm start` + فحص حي لمسار `/api/research` (ست حالات: مادة، امتناع، تشخيص، فتوى، سلامة).
- [x] source registry ووثائق الحقوق محدّثة (`docs/SOURCES-AND-LICENSES.md`, `docs/RIGHTS-AND-RELEASE-CHECK.md`).
- [x] إصلاح خلل الـingest: التشغيل المرفوض لا يكتب على corpus المعتمد (مختبر آلياً).
- [x] تدقيق `literal` مقابل `curated-summary` موثَّق في `docs/VERIFICATION-AUDIT.md`.
- [x] `npm run smoke` ناجح: `{"ok":true,"benchmarkCases":40,"benchmarkFailures":0,"explicitChecks":10}`.
- [x] معالجة عربية موحّدة: إزالة ترقيم النطاق العربي (`، ؛ ؟ ٪`) قبل التطبيع، ومطابقة موضوعية بأشكال الجذر.
- [x] جودة الاسترجاع: مقارنة الكلمات المفتاحية كلماتٍ كلمات + تغطية كاملة كدليل صلة + منع مطابقة كلمة
      قصيرة داخل كلمة أخرى («هم» داخل «الأسهم»).
- [x] **تضمين خط حفص** `public/fonts/UthmanicHafs_V22.ttf` غير معدَّل، وبوابة `npm run verify:quran-font` تفحص البصمة وربط CSS — `docs/FONT-LICENSE.md`.
- [x] **المستودع عام (GitHub Public)** وجاهز للمراجعة والتحكيم.

## مفتوح — يجب إغلاقه قبل التسليم

- [ ] **تشغيل `npm run benchmark -- --url <deployment>` كاملاً (40 حالة) على البيئة المنشورة**
      وحفظ `benchmarks/results/latest.json` كدليل. ✅ أُجري تشغيل محلي كامل (2026-10-03، 40 حالة،
      بيئة حتمية بلا مفتاح): `outcome 1.00 / abstention 1.00 / source hit@4 1.00 / topic_hit 1.00 /
      source recall 0.906 / chunk hit@4 0.654 / retrieval_identical_between_modes = true`؛
      المتبقي هو تشغيل البيئة المنشورة لقياس `model_organization_rate` بمفتاح مزوّد.
- [ ] **تشغيل conflict fixture** على بيئة فيها مزوّد: `curl -X POST .../api/benchmark/conflict`
      (محلياً يُبلغ `CHECK` لأن المزوّد غير مُعدّ).
- [ ] **اختبار UX** مع 5–8 مستخدمين وتسجيل النتائج في `docs/UX-RESULTS.md` (النموذج:
      `docs/UX-RESULTS-TEMPLATE.md`).
- [ ] **فيديو نهائي ≤ دقيقتين** بحسب السيناريو المعتمد.
- [ ] **tag الإصدار**: `challenge-final-2026` بعد إغلاق البنود أعلاه.

## ملاحظة التوقيت

هذا المستودع يحتوي خط أساس سابقاً لنافذة التحدي (راجع `docs/PRE-CHALLENGE-BASELINE.md`).
لا تُنسب الأعمال السابقة إلى أيام التنفيذ، ويُعرض الـdelta المنفَّذ فعلياً داخل النافذة وحده.
