# رفيق القلوب — Evidence-Gated AI RAG

نظام بحث عربي موثّق للمادة الإسلامية المعتمدة. النسخة الحالية تجعل الذكاء الاصطناعي جزءاً من **النواة**: فهم السؤال، إنشاء خطة بحث، البحث الدلالي، دمج البحث اللفظي مع الدلالي، إعادة ترتيب الأدلة، بوابة كفاية الدليل، توليد ادعاءات مرتبطة بالأدلة، ثم التحقق من كل ادعاء قبل عرضه.

> **الفكرة:** لا يكفي أن يعرف النموذج شيئاً؛ يجب أن يجد دليلاً معتمداً، ويُثبت إسناد الصياغة إليه، وإلا يمتنع.

## البنية

```text
Question
  ↓
Safety / Fatwa / Prescription Policy
  ↓
AI Research Planner
  ↓
Hybrid Retrieval
  ├── lexical/topic baseline
  └── semantic embeddings
  ↓
AI Re-ranking
  ↓
Evidence Gate
  ↓
Claim Generation
  ↓
Claim Verification + Conflict Detection
  ↓
Verified Answer + Evidence Map
  ↓
Neon (private operational/evaluation telemetry)
```

المادة نفسها تبقى في `src/lib/corpus/` و`src/lib/sources/`. Neon ليس مصدراً معرفياً؛ هو سجل تشغيل وقياس.

## التشغيل

1. انسخ `.env.example` إلى `.env.local`.
2. ضع `DATABASE_URL` الخاص بـ Neon.
3. ضع `OPENAI_API_KEY` الخاص بالمشروع، مع `OPENAI_MODEL` و`OPENAI_EMBEDDING_MODEL`.
4. نفّذ `database-setup.sql` مرة واحدة في Neon.
5. ثبّت الاعتمادات ثم شغّل: `npm run dev`.

### متغيرات مهمة

| المتغير | الاستخدام |
|---|---|
| `DATABASE_URL` | Neon للـtelemetry والتقييم |
| `OPENAI_API_KEY` | مزود AI الرئيسي |
| `OPENAI_MODEL` | نموذج التخطيط/إعادة الترتيب/التحقق |
| `OPENAI_EMBEDDING_MODEL` | embedding semantic retrieval؛ الافتراضي OpenAI `text-embedding-3-small` |
| `AI_RERANK_CANDIDATES` | عدد المرشحين قبل إعادة الترتيب |
| `AI_FINAL_PASSAGES` | الحد النهائي للمقاطع |

## التحقق والقياس

مجموعة benchmark ثابتة من **40 سؤالاً** موجودة في `benchmarks/questions.json`. نشغّل السؤال نفسه بمسارين:

- `baseline`: البحث اللفظي/الموضوعي الموجود في النظام الأصلي.
- `ai`: التخطيط + semantic embeddings + hybrid fusion + AI reranking + evidence gate + claim verification.

الأمر:

```bash
npm run benchmark -- --url https://YOUR-VERCEL-URL
```

النتيجة تحفظ في `benchmarks/results/latest.json`، ويمكن للـrunner حفظ الملخص والحالات في Neon عندما يكون `DATABASE_URL` متاحاً. لا توجد أرقام مختلقة في المستودع؛ أرقام العرض يجب أن تأتي من run فعلي.

## اختبارات loop engineering

```bash
npm run test
npm run typecheck
npm run loop:check
```

ثم بعد نشر نسخة معاينة:

```bash
npm run benchmark -- --url https://YOUR-VERCEL-URL
```

نراجع الحالات الفاشلة، نغيّر **سبباً واحداً في كل دورة**، ثم نعيد نفس مجموعة الـ40 سؤالاً. الهدف ليس زيادة التعقيد بل تقليل أخطاء الاسترجاع، التوثيق والامتناع.

## واجهات المراجعة

- `/hiwar` — المسار الفعلي للمستخدم والحوار البحثي.
- `/maktaba` — المكتبة وسجل المصادر.
- `/lab` — شرح AI pipeline ومؤشرات القياس للجنة التحكيم والفريق.
- `/api/health` — فحص مزود AI، embedding model، Neon، وحالة corpus.

## Neon

التوثيق التشغيلي لا يؤثر في صحة الإجابة: إذا فشل اتصال Neon، لا تُسقط النتيجة. يتم حفظ الاستعلام، النتيجة، الـtop IDs، reranking، evidence gate، claims، conflicts، latency وبيانات المزود عند توفر الاتصال.

## المصادر والحقوق

راجِع `docs/SOURCES-AND-LICENSES.md` و`docs/RIGHTS-AND-RELEASE-CHECK.md` قبل النشر. ميّز دائماً بين `literal` و`curated-summary` ولا تقدّم الأخيرة على أنها نقل حرفي.
