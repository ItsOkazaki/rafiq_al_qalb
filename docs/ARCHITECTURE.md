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
AI Research Planner
   │  intent + semanticQuery + subquestions + searchTerms
   ▼
Hybrid Retrieval
   │  lexical candidates ─┐
   │  semantic embeddings ┤→ union + weighted fusion
   ▼                     │
AI Re-ranking ◄──────────┘
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

## لماذا يوجد baseline؟

لإجابة سؤال التحكيم: «ما الذي أضافه AI مقارنة بطريقة أبسط؟». baseline هو lexical/topic retrieval القديم، بينما المسار الرئيسي يستخدم AI في فهم السؤال، الدلالة، إعادة الترتيب، بوابة الأدلة، صياغة الادعاءات والتحقق.

## فشل مزود AI

الفشل لا يتحول إلى إجابة مخترعة. `runResearch()` يعيد `ai-unavailable` ويعرض الأدلة المسترجعة فقط.
