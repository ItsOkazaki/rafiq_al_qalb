# رفيق القلوب — Rafiq Al-Qulub

<div align="center">

**أداة حوارية للخطباء والوعاظ والمختصين وطلاب العلم**

*تسترجع المادة العلمية حصراً من مصادر مفهرسة — لا تشخّص ولا تُفتي ولا تصف علاجاً*

[العرض الحي](https://rafiq-alqulub.vercel.app) · [المكتبة المعتمدة](/maktaba) · [الحوار البحثي](/hiwar)

</div>

---

## ما هو رفيق القلوب؟

أداة حوارية تستقبل وصف المستخدم للموضوع، وتحدّد بابه البحثي ضمن مكتبة مصنّفة في أبواب **التزكية والسلوك والعبادات القلبية**، ثم تسترجع المحتوى حصراً من مصادر مفهرسة مسبقاً.

تعرض النتائج بصورة منظّمة وقابلة للتتبّع:
- اسم المصدر
- الجزء أو الصفحة
- الرابط الرسمي للمصدر الأصلي

**إن غابت المادة: امتناع مضمون** — لا تخمين، ولا حشو، ولا ثقة بلا مرجع.

## المشكلة

يواجه الخطباء والوعاظ والباحثون في أبواب العبادات القلبية أربع فجوات:

1. **نقص المحتوى الوعظي الموثق** — المادة المتوفرة مشتتة أو بلا توثيق
2. **تفرق الأبواب** — التوبة، الهم، الذكر، غض البصر، الاستشفاء بالقرآن موزعة على مجلدات يصعب استخراجها وعظياً
3. **اقتباس بلا توثيق** — نصوص بلا مصدر، وكلام ينسب لمن لم يقله
4. **هلوسة النماذج العامة** — جواب واثق بلا مرجع في المحتوى الديني

## الحل

| الخطوة | ما يحدث |
|---|---|
| **١. الاستقبال** | يستقبل وصف الموضوع بجملة بسيطة |
| **٢. الفهم والتحديد** | يحدد الباب البحثي والكلمات المفتاحية |
| **٣. الاسترجاع** | بحث فعلي في الفهرس المعتمد فقط — لا توليد حر |
| **٤. التوثيق والعرض** | عرض منظم بالمصدر والجزء/الصفحة والرابط، أو امتناع واضح |

## الأبواب البحثية (١٢ باباً)

| # | الباب |
|---|---|
| 1 | آثار المعاصي والذنوب |
| 2 | قسوة القلب |
| 3 | التوبة |
| 4 | تكرار الذنب والانتكاس |
| 5 | الغفلة |
| 6 | الذكر ومجالسه |
| 7 | الهم والقلق |
| 8 | التدبر والتأثر بالقرآن والموعظة |
| 9 | حضور القلب في العمل |
| 10 | التداوي بالقرآن والفاتحة |
| 11 | غض البصر وآفة النظر |
| 12 | الشهوة وحسم مادتها |

## المصادر المعتمدة

| المصدر | الناشر | المقاطع |
|---|---|---:|
| الداء والدواء — الجواب الكافي | موقع البدر | 35 |
| التوبة إلى الله والضراعة إليه عند نزول المصائب | موقع ابن باز الرسمي | 6 |
| مجموع فتاوى ومقالات متنوعة | موقع ابن باز الرسمي | 11 |
| مشروع المصحف الإلكتروني | جامعة الملك سعود | 7 |

**لا يُسترجع من أي مصدر خارج هذه المكتبة.**

## الحدود — ضمان علمي

| الحد | التفصيل |
|---|---|
| **لا تشخيص** | الوصف يُفهم مدخلاً للبحث فقط، لا تقييماً لأحد |
| **لا فتوى** | استرجاع وتوثيق فقط، لا إصدار أحكام شرعية |
| **لا وصفات** | مادة موثقة فقط، لا برامج علاجية ولا خطط شخصية |
| **لا هلوسة** | إن غابت المادة يمتنع النظام صراحة |
| **سلامة أولاً** | الحالات النفسية تُحال فوراً لمختص |

## البنية التقنية

| المكون | التقنية |
|---|---|
| معالجة اللغة الطبيعية | خوارزمية عربية مخصصة (`normalizeArabic` / `tokenizeArabic` / `normalizeDialect`) |
| محرك الاسترجاع (RAG) | Keyword + Topic Boost — بدون قاعدة بيانات متجهية — لا استرجاع من الإنترنت المفتوح |
| مصادر سعودية أولية | مجمع الملك فهد (حفص) + جامع السنة النبوية بالرئاسة العامة للبحوث العلمية والإفتاء؛ محتوى حديث Alifta يُفعّل بعد ingestion/review |
| معالجة المستندات | Docling في مرحلة ingestion فقط؛ ناتج منظم وموسوم بالـprovenance ثم يدخل corpus المراجع |
| قاعدة البيانات | PostgreSQL عبر Drizzle ORM (تتبع الجلسات) |
| نموذج الذكاء الاصطناعي | Google Gemini 1.5 Flash (عبر واجهة OpenAI المتوافقة) |
| آلية الامتناع | عتبة ثقة (`MIN_PASSAGE_SCORE = 3`) + فحص سلامة + فحص فتوى + فحص وصف |
| الواجهة | Next.js 16 (App Router) |
| النشر | Vercel |
| الخطوط | Amiri + IBM Plex Sans Arabic + Aref Ruqaa (SIL OFL — مرخصة تجارياً) |

## التثبيت والتشغيل المحلي

### المتطلبات
- Node.js 18+
- PostgreSQL (اختياري — للتتبع التشغيلي فقط)

### الخطوات

```bash
# 1. استنساخ المشروع
git clone https://github.com/YOUR_USERNAME/rafiq-alqulub.git
cd rafiq-alqulub

# 2. تثبيت الحزم
npm install

# 3. إعداد متغيرات البيئة
cp .env.example .env
# عدّل .env وأضف DATABASE_URL (اختياري)

# 4. إعداد قاعدة البيانات (اختياري)
# إذا كان لديك PostgreSQL:
npx drizzle-kit push

# 5. التشغيل في وضع التطوير
npm run dev

# 6. فتح المتصفح
# http://localhost:3000
```

### البناء للإنتاج

```bash
npm run build
npm start
```

### النشر على Vercel

1. ارفع المشروع على GitHub
2. افتح [vercel.com/new](https://vercel.com/new)
3. اربط المستودع
4. أضف المتغيرات البيئية:
   - `DATABASE_URL` (اختياري — PostgreSQL من [neon.tech](https://neon.tech))
   - `OPENAI_API_KEY` (اختياري — لتفعيل التنظيم الآلي)
5. اضغط **Deploy**

## المتغيرات البيئية

| المتغير | مطلوب؟ | الوظيفة |
|---|---|---|
| `DATABASE_URL` | لا | سجل تتبع جلسات البحث (PostgreSQL) |
| `OPENAI_API_KEY` | لا | تفعيل التنظيم الآلي المقيَّد بالمادة المسترجعة |
| `OPENAI_MODEL` | لا | اسم النموذج (افتراضي: `gpt-4o-mini`) |
| `OPENAI_BASE_URL` | لا | نقطة نهاية مخصصة (افتراضي: OpenAI) |

> **ملاحظة:** بدون مفتاح AI يعمل النظام بالكامل بالمسار الحتمي — وهذا مسار تصميمي مقصود وليس وضعاً منقوصاً.

## الاختبارات

```bash
# تشغيل مجموعة الاختبار الكاملة
npx vitest run

# فحص TypeScript
npx tsc --noEmit

# بناء الإنتاج
npm run build
```

المشروع يتضمن **40 اختبار آلي** يغطي:
- مطابقة الأبواب والكلمات المفتاحية
- الاسترجاع الفعلي وبيانات المصدر
- تنفيذ الاعتماد والاستبعاد
- حد الاسترجاع الأقصى
- السلامة والفتوى والوصفات
- المسار الحتمي بدون مفتاح AI
- التوليد المقيَّد عند توفر المزود

## بنية المشروع

```
src/
├── app/                    # صفحات Next.js (App Router)
│   ├── hiwar/              # الحوار البحثي
│   ├── hala/               # لمحة بحثية (استبانة)
│   ├── maktaba/            # المكتبة المعتمدة + أبواب + مصادر
│   ├── wasfa/              # سياسة عدم الوصف
│   └── api/                # نقاط API (research + health)
├── components/             # مكونات الواجهة
├── lib/
│   ├── ai/                 # مزوّد AI + المسار الحتمي
│   ├── corpus/             # المتن المعتمد (chunks)
│   ├── policy/             # سياسات الفتوى والوصف
│   ├── rag/                # محرك الاسترجاع والتصنيف
│   ├── research/           # مسار البحث (pipeline)
│   ├── sources/            # سجل المصادر المعتمدة
│   ├── text/               # معالجة اللغة العربية
│   └── types.ts            # الأنواع المشتركة
├── db/                     # قاعدة البيانات (Drizzle)
tests/                      # اختبارات Vitest
docs/                       # توثيق المشروع
public/                     # الشعار والأصول الثابتة
```

## الترخيص

هذا مشروع بحثي مقدم ضمن تحدي الذكاء الاصطناعي في خدمة المحتوى الإسلامي.

**الخطوط:** Amiri, IBM Plex Sans Arabic, Aref Ruqaa — جميعها مرخصة بموجب [SIL Open Font License 1.1](https://scripts.sil.org/OFL).

**المصادر المعتمدة:** المادة المسترجعة مقاطع قصيرة موثقة مع المصدر والموضع والرابط الرسمي. لا يُعاد توزيع أي كتاب كاملاً.

---

<div align="center">

**بحث موثق، لوعظ مؤثر**

رفيق القلوب — أداة حوارية للخطباء والوعاظ والمختصين وطلاب العلم

</div>

## Al-Ifta direct HTML ingestion

The Saudi Sunnah source uses a no-dependency Node ingestion path. It fetches only official `sunna.alifta.gov.sa` pages, follows official result links to detail pages, cleans the HTML, deduplicates the text, preserves the official source URL, and generates `src/lib/corpus/generated/alifta-html-chunks.ts` for RAG retrieval.

```bash
npm run alifta:test       # offline regression tests on captured real pages
npm run alifta:manifest   # manifest + quality-threshold guard
npm run alifta:live-check # reachability probe of the configured targets
npm run alifta:capture    # save live HTML fixtures + fetch diagnostics
npm run alifta:ingest     # crawl individual hadith pages -> corpus
npm run alifta:verify     # corpus quality gate (>=100 chunks, 12 doors)
```

Every stored record points at an individual official page (`BookToc/ViewMatnPage` or an
official service page) — never at a subject/search-result page — and carries the complete
matn from that page. An official explanation is stored only together with the exact
commentary URL it was read from.

Docling is optional for future document-heavy ingestion and is not required for the Al-Ifta runtime path.
