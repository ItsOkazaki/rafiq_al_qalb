# تثبيت النسخة المستقرة

لا يُعلن «stable» إلا بعد تنفيذ البنود التالية فعلياً على بيئة الفريق، بلا استثناء.

## بوابة البرمجيات (منفَّذة في هذا الـcommit)

```bash
npm ci
npm test                 # 99 اختبار Vitest (7 ملفات)
npm run alifta:test      # 33 اختبار زاحف (أوفلاين، بدون شبكة)
npm run alifta:manifest  # تطابق المانيفست وعتبات الجودة
npm run alifta:verify    # بوابة corpus: 271 مقطعاً وكل الأبواب فوق العتبة
npm run typecheck
npm run lint
npm run build
npm start                # ثم فحص حي لـ/hiwar و/api/research
```

نتائج التشغيل الأخيرة مسجّلة في تقرير التسليم النهائي (لا تُنسخ الأرقام يدوياً هنا).

## بوابة الذكاء الاصطناعي

1. على بيئة فيها مفتاح مزوّد: تحقق أن `ai.mode = "model"` يظهر في استجابة `/api/research`،
   وأن الوسم «ملخّص مولّد بالذكاء الاصطناعي» ظاهر فوق النص.
2. على بيئة بلا مفتاح: تحقق أن `ai.mode = "deterministic"` وأن النص مجمَّع من المقاطع.
3. شغّل `npm run benchmark -- --url <deployment>` (40 حالة) واحفظ الملف الناتج.
4. شغّل فحص التعارض الاصطناعي: `curl -X POST <deployment>/api/benchmark/conflict`
   (يعيد `503` إذا لم يُضبط مزوّد — سجّل ذلك كما هو).

## بوابة قاعدة البيانات (إن فُعّلت)

1. `database-setup.sql` مطبَّق على قاعدة Neon.
2. `/api/health` يعيد `database: "connected"`.
3. تظهر جلسات البحث في `research_sessions` بعد سؤال حقيقي.

## بوابة المحتوى والحقوق

1. راجع `docs/SOURCES-AND-LICENSES.md` و`docs/RIGHTS-AND-RELEASE-CHECK.md`.
2. تأكد من صحة وسم كل مقطع: `literal` (منقول) مقابل `curated-summary` (عرض بحثي موجَّه).
3. تحقق من خط حفص المحلي: `npm run verify:quran-font` (الملف مُضمَّن غير معدَّل، والبصمة مطابقة للموثَّق — `docs/FONT-LICENSE.md`).

## بوابة التحدي

ثبِّت baseline ما قبل التحدي، وسجِّل فقط التغييرات الفعلية داخل نافذة التنفيذ في تقرير
delta مستقل. بعد اكتمال البوابات:

```bash
git tag challenge-final-2026
```

مع إعلان أرقام الـbenchmark من الملف الفعلي وحده.
