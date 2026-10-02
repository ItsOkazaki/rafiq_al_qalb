# المعمارية — Evidence-Gated AI

## الفكرة

رفيق القلوب ليس chatbot يكتب ثم يحاول إضافة citation. المسار مصمم بالعكس: **الدليل يسبق التوليد، والادعاء يسبق عرضه اختبار إسناد مستقل**.

```text
المستخدم
   │
   ▼
Policy Gates ──────────── safety / fatwa / personal prescription
   │
   ▼
Local Query Plan (Gemini AI planner optional)
   │  intent + semanticQuery + subquestions + searchTerms
   ▼
Approved Retrieval
   │  lexical/topic baseline ───────────┐
   │  optional Gemini embeddings ──────┤→ union + weighted fusion
   ▼                                   │
AI Re-ranking ◄────────────────────────┘
   │  relevance + subquestion support
   ▼
Evidence Gate
   │  AI gate + independent semantic coverage + rerank threshold
   ├──────── insufficient ─────────► ABSTAIN
   │
   ▼
Claim Generation
   │  every claim carries evidenceIds
   ▼
Claim Verification
   │  supported / partial / unsupported / conflicting
   │
   ├── unsupported / conflicting ───► REMOVE CLAIM
   │
   ▼
Conflict Detection
   │  report apparent tension without adjudicating sources
   ▼
Verified Answer
```

## الحدود

`src/lib/sources/registry.ts` هو حاجز المصدر. لا يشارك الاسترجاع إلا chunks مصدرها `active` وليست في قائمة الاستبعاد.

الـAI لا يملك طريقاً لإدخال source ID من خارج المقاطع المقدمة. وكل citation في النتيجة يُحلّ مرة أخرى مقابل chunk مسترجع قبل العرض.

## الوضع الصديق للتوكن

في إعداد Gemini المجاني الافتراضي لا نستهلك طلباً مستقلاً للتخطيط، ولا نرسل الـcorpus كله إلى embeddings. نبدأ بالبحث اللفظي/الموضوعي، ثم نرسل عدداً صغيراً من المقاطع إلى Gemini لإعادة الترتيب، ثم إلى التوليد والتحقق. embeddings متاحة اختيارياً فقط عندما تكون ذات قيمة فعلية.

## لماذا يوجد baseline؟

لإجابة سؤال التحكيم: «ما الذي أضافه AI مقارنة بطريقة أبسط؟». baseline هو lexical/topic retrieval القديم. القيمة المضافة في المسار الرئيسي تظهر في إعادة ترتيب الأدلة، بوابة الكفاية، صياغة claims مرتبطة بالأدلة، والتحقق المستقل.

## فشل مزود AI

الفشل لا يتحول إلى إجابة مخترعة. عند تعطل embeddings أو re-ranking، يعود النظام إلى أدلة معتمدة وترتيب حتمي، ولا يُعرض نص مولّد إلا بعد اجتياز بوابة الدليل والتحقق. وإذا فشل مسار التوليد/التحقق نفسه، تظهر حالة امتنع النظام عن الإجابة بدل ملء الفراغ.
