# رفيق القلوب — Deployment / النشر

البنية الوحيدة المعتمدة: **خادم Node كامل** (الحوار البحثي عبر `/api/research`).
لا توجد نسخة ثابتة — النشر المقصود هو Vercel (أو أي مضيف Node).

## Vercel (الموصى به)
1. أنشئ حساباً مجانياً في https://vercel.com ثم Token من Account Settings → Tokens.
2. أضفه هنا كسرّ بيئة باسم `VERCEL_TOKEN` وأخبر الوكيل — سيشغّل:
   `npx vercel deploy --prod --yes --token "$VERCEL_TOKEN"`
3. أو من طرفك: `npm i -g vercel && vercel --prod` من جذر المشروع.

### قاعدة البيانات (اختيارية لكن موصى بها)
سجل تتبع جلسات البحث يحتاج PostgreSQL:
1. أنشئ قاعدة مجانية في https://neon.tech (أو Supabase).
2. عيّن `DATABASE_URL` في متغيرات مشروع Vercel.
3. شغّل مرة واحدة: `DATABASE_URL=... npx drizzle-kit push`.
ملاحظة: بدون قاعدة يعمل البحث كاملاً؛ يتوقف التسجيل التتبعي فقط (فشل صامت مقصود).

## المتغيرات البيئية
| المتغير | الوظيفة | إلزامي؟ |
|---|---|---|
| `DATABASE_URL` | سجل تتبع الجلسات (PostgreSQL) | لا — عملي فقط |
| `GEMINI_API_KEY` | مفتاح Google Gemini API لتفعيل الذكاء الاصطناعي | **نعم (للتحكيم)** |
| `OPENAI_API_KEY` | (بديل) مفتاح OpenAI في حال عدم استخدام Gemini | لا |
| `OPENAI_BASE_URL` | نقطة نهاية مخصصة (تُضبط تلقائياً عند استخدام Gemini) | لا |
| `OPENAI_MODEL` | اسم النموذج (افتراضي: gemini-1.5-flash أو gpt-4o-mini) | لا |

بدون مفتاح AI يعمل **التنظيم الحتمي** — وهو مسار تصميمي مقصود وليس وضعاً منقوصاً:
يجمع المقاطع المسترجعة حرفياً دون أي توليد خارجي.

## التحقق قبل النشر
```bash
npx next typegen && npx tsc --noEmit && npm run build && npx vitest run
```
