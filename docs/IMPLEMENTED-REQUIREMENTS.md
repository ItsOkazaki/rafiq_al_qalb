# متطلبات الخبير → تنفيذ المشروع

هذه الصفحة تربط مباشرة بين قائمة العمل التي طلبها خبير الفريق وبين أماكن التنفيذ القابلة للمراجعة في المستودع.

| المتطلب | التنفيذ | مكان المراجعة |
|---|---|---|
| تحسين الـRAG | توحيد lexical + semantic candidate recall قبل الترتيب النهائي | `src/lib/rag/retrieve.ts` |
| Hybrid Retrieval | embeddings على كامل corpus المعتمد + lexical fusion | `src/lib/rag/retrieve.ts`, `src/lib/ai/embeddings.ts` |
| Re-ranking | AI يعيد ترتيب المرشحين ويحدد ما يدعم خطة البحث | `src/lib/ai/provider.ts` |
| Evidence Filtering | Evidence Gate يجمع قرار AI مع تغطية دلالية مستقلة قبل التوليد | `src/lib/rag/retrieve.ts`, `src/lib/research/pipeline.ts` |
| التحقق من الإجابة | claim generation ثم claim-level verification؛ غير المدعوم لا يظهر | `src/lib/ai/provider.ts`, `src/lib/research/pipeline.ts` |
| اختبار تعارض المصادر | كاشف تعارض مستقل + fixture اصطناعي قابل للتشغيل | `detectSourceConflicts()`, `src/app/api/benchmark/conflict/route.ts`, `benchmarks/conflict-fixtures.json` |
| Benchmark | gold set ثابت وتشغيل baseline/AI على نفس الأسئلة | `benchmarks/questions.json`, `benchmarks/run-benchmark.mjs` |
| 30–50 سؤالاً | 40 حالة ثابتة موزعة على direct/vague/out-of-scope/fatwa-safety/multi-source/hallucination | `benchmarks/questions.json` |
| قياس دقة الاسترجاع | source recall، source hit، topic hit، وتغير ترتيب النتائج | `benchmarks/run-benchmark.mjs` |
| قياس صحة التوثيق | نسبة الادعاءات المدعومة + نسبة الإحالات الموافقة للمصادر المتوقعة | `benchmarks/run-benchmark.mjs` |
| قياس Abstention | دقة الامتناع في الأسئلة خارج النطاق والفتوى وحالات نقص الدليل | `benchmarks/run-benchmark.mjs` |
| مقارنة البحث التقليدي | baseline lexical منفصل ونسخة AI بنفس query/gold set | `src/lib/research/pipeline.ts`, `benchmarks/run-benchmark.mjs` |
| تحسين واجهة الأدلة | claim → evidence links + source/chapter/page/verification links + retrieval metrics | `src/components/research-result.tsx`, `src/components/passage-card.tsx` |
| اختبار تجربة المستخدم | بروتوكول + ملف نتائج جاهز. التنفيذ الفعلي مع 5–8 مستخدمين يجب أن يتم على النسخة النهائية | `docs/UX-TEST-PLAN.md`, `docs/UX-RESULTS.md` |
| توثيق النتائج | benchmark يكتب JSON بنتائج التشغيل الفعلية، ولا توجد أرقام ثابتة مزعومة؛ النسخة الحالية لا تتضمن أرقاماً مصطنعة | `benchmarks/results/latest.json` (غير متعقّب) |
| إصلاح الأخطاء الحرجة | إزالة اعتماد health route على DB، منع توليد AI عند فشل pipeline، والتحقق من source IDs | `src/app/api/health/route.ts`, `src/lib/research/pipeline.ts` |
| تحديث GitHub والتوثيق | README + DEPLOY + CONTRIBUTING + architecture + model/baseline/delivery docs | `README.md`, `docs/` |
| تثبيت نسخة مستقرة | قائمة إصدار نهائي وخطوات tag بعد اجتياز typecheck/lint/build/benchmark/UX | `docs/CHALLENGE-DELIVERY-CHECKLIST.md` |

## معنى «الذكاء الاصطناعي أساسي» هنا

الوضع الحواري الافتراضي هو `mode=ai`. في هذا الوضع لا تُصاغ الإجابة النهائية بالمسار الحتمي القديم. يجب أن يمر الطلب عبر:

`AI Planner → Semantic Embeddings → Hybrid Fusion → AI Re-ranking → Evidence Gate → Claim Generation → Claim Verification → Final Answer`

الوضع `baseline` موجود للقياس والمقارنة فقط. عند غياب مزود AI أو فشل إحدى طبقات AI، يعرض النظام مادة الدليل/المكتبة ولا يدّعي أن مسار الإجابة الذكية اكتمل.
