# خريطة متطلبات التحكيم → أدلة التنفيذ

هذه الخريطة تربط النسخة البرمجية الحالية بمعايير القبول المنشورة في دليل المشارك. لا تحتوي على درجات متوقعة؛ الدرجة الفعلية قرار اللجنة.

| المعيار الرسمي | الوزن | كيف يجيب المشروع عليه | الدليل القابل للمراجعة |
|---|---:|---|---|
| وضوح المشكلة وملاءمتها للمسار والجمهور | 25% | حالة استخدام محددة: بحث عربي موثّق داخل corpus معتمد، مع امتناع عند نقص الدليل | `README.md`, `src/app/page.tsx`, `src/app/hiwar/` |
| ملاءمة توظيف AI والقيمة المضافة | 15% | AI Planner + embeddings + hybrid retrieval + re-ranking + evidence gate + claim verification؛ مع baseline منفصل للمقارنة | `docs/AI-MODELS.md`, `src/lib/ai/`, `src/lib/rag/retrieve.ts`, `benchmarks/run-benchmark.mjs` |
| خطة الموثوقية والسلامة العلمية | 20% | سجل مصادر، حدود corpus، إسناد واضح، abstention، منع الفتوى/الوصفة/التشخيص، تحقق الادعاءات، رصد التباين | `src/lib/sources/registry.ts`, `src/lib/policy/`, `src/lib/safety.ts`, `docs/CONFLICT-TESTING.md` |
| قابلية التنفيذ خلال مدة التحدي | 15% | وظائف منفصلة يمكن تطويرها وقياسها على corpus صغير؛ خطة delta واضحة | `docs/CHALLENGE-DAY-DELTA-PLAN.md` |
| الأصالة والقيمة المضافة | 15% | Evidence-Gated AI: النموذج لا يكفي أن يولّد؛ يجب أن يجد دليلاً، يربط الادعاء به، ثم يمرره عبر verifier | `docs/ARCHITECTURE.md`, `src/lib/research/pipeline.ts` |
| القدرة على التنفيذ وتغطية المهام | 10% | بنية صغيرة قابلة للمراجعة، benchmark ثابت، UX protocol، checklist تسليم | `docs/IMPLEMENTED-REQUIREMENTS.md`, `docs/UX-TEST-PLAN.md`, `docs/CHALLENGE-DELIVERY-CHECKLIST.md` |

## اختبار القيمة المضافة للـAI

الـbaseline هو البحث اللفظي/الموضوعي الموجود في `retrievePassages()`. نفس الـgold set يمر على baseline وعلى مسار AI. لا تُعتمد أي أرقام قبل تشغيل benchmark فعلي على البيئة النهائية.

المقاييس الأساسية: Source Recall، Source Hit@4، Topic Hit، Citation Grounding، Expected Citation Rate، Abstention Accuracy، AI Activation، وتغير النتائج العليا.

## الأمانة الزمنية

هذه الخريطة لا تغيّر تاريخ التطوير. وفق قواعد التحدي، المشروع السابق يمكن استخدامه بشرط الإفصاح عن حالته، ويُحتسب الإنجاز الجديد المنفّذ خلال 4–6 أكتوبر 2026 فقط ضمن الـchallenge-day delta. لذلك يجب تثبيت `docs/PRE-CHALLENGE-BASELINE.md` وعدم نسبة هذا العمل السابق إلى أيام التحدي.
