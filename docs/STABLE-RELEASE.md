# تثبيت النسخة المستقرة

هذه الوثيقة هي بوابة ما قبل التسليم. لا يُعلن «stable» إلا بعد اجتياز البنود فعلياً على بيئة الفريق.

## بوابة البرمجيات

```bash
npm install --no-audit --no-fund
npm run test
npm run lint
npm run typecheck
npm run build
```

## بوابة الذكاء الاصطناعي

1. تأكد من أن local/AI planner وretrieval وre-ranking وevidence gate وclaim verification تعمل على المزود المختار. إذا فعّلت embeddings، اختبرها منفصلاً؛ ليست مطلوبة لتشغيل وضع Gemini المجاني الافتراضي.
2. شغّل benchmark كامل 40 سؤالاً على Vercel Preview/Production.
3. شغّل conflict fixture.
4. احتفظ بـ `benchmarks/results/latest.json` داخلياً وراجِع الأرقام قبل إدخالها في العرض.

## بوابة Neon

1. تأكد من نجاح `/api/health` في فحص قاعدة Neon.
2. تحقق من وصول جلسات البحث إلى `research_sessions`.
3. تحقق من أن benchmark runner يستطيع حفظ `benchmark_runs` و`benchmark_results` عند وجود `DATABASE_URL`.

## بوابة التجربة

نفّذ `docs/UX-TEST-PLAN.md` مع عينة مجهولة، ثم حدّث `docs/UX-RESULTS.md` بالخلاصة المجمعة فقط.

## بوابة المحتوى والحقوق

راجع `docs/SOURCES-AND-LICENSES.md` و`docs/RIGHTS-AND-RELEASE-CHECK.md`، وتحقق من حالة كل corpus excerpt، خصوصاً الفرق بين `literal` و`curated-summary`.

## بوابة التحدي

ثبّت baseline ما قبل التحدي، ثم سجّل فقط التغييرات التي ينفذها الفريق فعلياً في نافذة التحدي ضمن delta مستقل.

بعد اكتمال كل البوابات، ضع tag واضحاً مثل:

```text
challenge-final-2026
```
