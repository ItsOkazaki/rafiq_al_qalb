# الخطوط — التراخيص وحالة خط حفص

## الخطوط المستخدمة

| الخط | المصدر | الترخيص | الحالة |
|---|---|---|---|
| **Amiri** | `@fontsource/amiri` (Aliftype) | SIL Open Font License 1.1 | مُضمَّن عبر npm |
| **Aref Ruqaa** | `@fontsource/aref-ruqaa` | SIL Open Font License 1.1 | مُضمَّن عبر npm |
| **IBM Plex Sans Arabic** | `@fontsource/ibm-plex-sans-arabic` (IBM) | SIL Open Font License 1.1 | مُضمَّن عبر npm |
| **KFGQPC HAFS Uthmanic Script v2.2** | مجمع الملك فهد لطباعة المصحف الشريف | ترخيص المجمع المضمَّن في الملف: استخدام ونسخ وتوزيع مجاناً، ويُمنع التعديل | **مُضمَّن** في `public/fonts/UthmanicHafs_V22.ttf` |

## خط حفص: مُضمَّن الآن بترخيص مضمَّن في الملف نفسه

`public/fonts/UthmanicHafs_V22.ttf` — 297,688 بايت، غير معدَّل.
`sha256 = a6e59510dcaf3ec99db49427321a035ed94af555ffc7d27e7f430b5fd5e179f8`.

أساس التضمين ليس تقديراً شخصياً، بل نصّ الترخيص المكتوب **داخل ملف الخط** (سجل الاسم رقم 13)،
وهو منقول حرفياً في `public/fonts/UthmanicHafs_V22.LICENSE.txt`:

> Permission is hereby granted, Free of Cost, to any person obtaining a copy of this Font
> accompanying this license, the rights to Use, Copy, Distribute, subject to the following
> conditions: 1. The Font Software cannot be Sold, Modified, Altered, Translated, Reverse
> Engineered, Decompiled, Disassembled, Reproduced …

فالاستخدام والنسخ وإعادة التوزيع مجاناً مسموحة، والتعديل ممنوع. لذلك:

- يُخدَم الملف **بايتاً ببايت** بلا تحويل إلى WOFF2 ولا subsetting ولا أي تحرير.
- ملف الخط يحمل جدول توقيع رقمي (DSIG) وسجل حقوق:
  «© 2010 King Fahd Glorious Quran Printing Complex … may not be reproduced, modified
  without the express written approval».
- `src/app/globals.css` يطلب الملف المحلي أولاً، ويُبقي رابط QUL
  (`static-cdn.tarteel.ai/qul/fonts/UthmanicHafs_V22.ttf`) كبديل أخير موثَّق فقط.
- `src/app/layout.tsx` يعمل preload للملف المحلي.

**المصدر والبصمة:** سُحب الملف من المرآة العامة
`https://github.com/nuqayah/qpc-fonts/tree/master/text-mushafs/UthmanicHafs_V22`
(التوزيع الرسمي `http://qurancomplex.gov.sa/TTF/` لم يكن متاحاً من بيئة العمل، فلم تتم مقابلة
البصمة بنسخة الموقع الرسمي؛ سجلات الاسم داخل الملف تؤكد العائلة والإصدار والحقوق).

## كيف تتحقق البوابة

```bash
npm run verify:quran-font          # يفحص: وجود الملف + sha256 + ربط CSS به
```

الفحص يفشل إذا: غاب الملف، أو تغيّرت بصمته (أي تعديل = مخالفة صريحة للترخيص)، أو وُجد ملف خط
آخر غير موثَّق في `public/fonts/`، أو لم يعد `globals.css` يطلب المسار المحلي.
للفحص المعلوماتي قبل التضمين كان هناك `--allow-remote-fallback` — وقد صار الآن غير لازم،
لكنه يبقى مدعوماً للتوثيق.

## حزم npm التي رُفضت (لا تُعِد المحاولة)

| الحزمة | السبب |
|---|---|
| `kfgqpc-uthmanic-script-hafs-regular@1.0.0` | إعادة تجميع طرف ثالث بلا نص ترخيص للخط نفسه (الترخيص المذكور للحزمة ISC لا للخط) |
| `react-native-quran-hafs@1.3.1` | المثل نفسه: لا سند ترخيص قابل للتحقق |
| `quran-qcf4@1.1.0` | `LICENSE.md` ينص: «Redistribution, modification, or commercial use of the font files without explicit permission from the original rights holders is not permitted» |
| `@tlawat/mushaf-fonts-qpc-v4@1.20260912.0` | `LICENSE.md` ينص: خطوط الصفحات «© KFGQPC … are **not** under an open-source licence … Do not … redistribute them outside the terms above» |
| `@fontsource/amiri-quran@5.3.0` | الترخيص نظيف (OFL 1.1) لكنه خط Amiri لا الرسم العثماني؛ لا يُستبدل به خط الآيات |

## قاعدة العرض القرآني

الخط يرسم الرسم العثماني ولا يضيف علامات وقف. لذلك يُخزَّن النص القرآني في حقل مستقل
(`quranText`) مع مرجعه (`quranReference`)، ولا يُطلب من النموذج كتابته أو تعديل علاماته —
راجع `docs/SAUDI-QURAN-AI-OUTPUT-GUARD.md`.
