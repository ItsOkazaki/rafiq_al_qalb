# وضع Gemini المجاني الصديق للتوكن

## الإعداد الافتراضي

```env
AI_PROVIDER=gemini
AI_TOKEN_SAVER=true
AI_PLANNER_MODE=local
AI_USE_EMBEDDINGS=false
AI_RERANK_CANDIDATES=6
AI_FINAL_PASSAGES=3
GEMINI_CHAT_MODEL=gemini-3.5-flash-lite
GEMINI_CHAT_FALLBACK_MODEL=gemini-3.1-flash-lite
GEMINI_EMBEDDING_MODEL=gemini-embedding-2
```

لا يوضع المفتاح داخل GitHub أو ZIP. استخدم `GEMINI_API_KEY` في `.env.local` أو متغيرات بيئة Vercel.

## مسار السؤال

1. السياسات تمنع المسارات غير المسموحة.
2. الخطة تُستخرج محلياً افتراضياً.
3. البحث من corpus المعتمد فقط.
4. Gemini يعيد ترتيب عدد صغير من المقاطع.
5. Gemini يولد claims مرتبطة بالأدلة.
6. Gemini يتحقق من claims.
7. لا تُعرض الإجابة إذا فشل التحقق.

بهذا لا نرسل كل corpus إلى Gemini، ولا نستهلك طلباً مستقلاً لمخطط البحث في الوضع الافتراضي.

## البحث الدلالي

`AI_USE_EMBEDDINGS=true` يبقي embeddings متاحة للتجارب أو للعرض التقني، لكنه ليس ضرورياً لتشغيل النسخة المجانية اليومية. عند فشل embedding يعود النظام تلقائياً إلى retrieval اللفظي/الموضوعي المعتمد.
