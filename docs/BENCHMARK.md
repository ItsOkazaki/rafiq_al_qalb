# Benchmark — Baseline vs Evidence-Gated AI

## هدف القياس

نريد قياس **القيمة المضافة للذكاء الاصطناعي** مقارنة بالبحث اللفظي الأبسط، لا قياس عدد النماذج أو طول الـprompt.

## مجموعة القياس

`benchmarks/questions.json` تحتوي على 40 سؤالاً محدداً مسبقاً. التغطية:

- أسئلة مباشرة.
- أسئلة عامية/غامضة.
- خارج النطاق.
- فتوى/سلامة/وصفات شخصية.
- أسئلة تحتاج أكثر من مصدر.
- حالات محاولة دفع النظام إلى اختلاق صفحة أو مصدر.

لا تُضاف محادثات حقيقية إلى الـgold set.

## التشغيل

```bash
npm run benchmark -- --url http://localhost:3000
```

أثناء التطوير:

```bash
npm run benchmark -- --url http://localhost:3000 --limit 10
```

## المقاييس

### Retrieval Source Recall

نسبة المصادر المتوقعة الموجودة في النتائج المسترجعة، لا مجرد وجود مصدر واحد.

### Retrieval Chunk Recall

على الحالات التي تحتوي `expectedChunks`، نسبة المقاطع الذهبية التي وصلت إلى النتائج النهائية. هذا أدق من قياس اسم المصدر فقط.

### Source Hit@4

هل ظهرت أي جهة مصدر متوقعة في النتائج الأربعة النهائية؟

### Topic Hit

هل أصاب النظام موضوع gold set المتوقع؟

### Citation Grounding

من كل claims التي قدمها verifier، كم claim حصل على `supported`؟

### Expected Citation Rate

هل الإحالات المدعومة تشير إلى مصدر متوقع في الحالة؟

### Abstention Accuracy

هل تطابق `outcome` المتوقع في الحالات التي يجب أن تمنع الإجابة؟

### AI Activation

في الحالات التي ينبغي أن تستفيد من AI، هل اكتمل وضع `evidence-gated` فعلياً؟

### Baseline Delta

الفرق بين baseline وAI في retrieval recall/hit/topic hit.

## قاعدة النزاهة

لا تُكتب أرقام يدوياً في README أو العرض. الملف `benchmarks/results/latest.json` يولده runner من تشغيل فعلي ويُترك خارج Git بواسطة `.gitignore`.

## بروتوكول اعتماد الـgold set

قبل العرض النهائي، يراجع عضو من الفريق/الخبير كل `expectedSources`, `expectedTopics`, و`expectedChunks` للحالات الداخلة في القياس، ثم تُحفظ نسخة مرقمة من الملف مع release. لا تُستخدم بيانات مستخدمين حقيقيين.
