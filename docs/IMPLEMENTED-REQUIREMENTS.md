# متطلبات الخبير → الحالة الفعلية في المستودع

> هذه الصفحة تصف الحالة الفعلية للكود في هذا الـcommit. كل صف يشير إلى مكان قابل للمراجعة،
> وما ليس منفّذاً في مسار التشغيل مكتوب صراحةً أنه غير منفّذ.

## منفّذ وقابل للتحقق

| المتطلب | الحالة | مكان المراجعة |
|---|---|---|
| استرجاع من corpus معتمد فقط + سجل مصادر | ✅ منفّذ | `src/lib/sources/registry.ts`, `src/lib/rag/retrieve.ts` |
| عتبة كفاية دليل وامتناع صريح | ✅ منفّذ | `MIN_PASSAGE_SCORE = 3`, `MIN_PASSAGE_TEXT_LENGTH = 40`, `ABSTAIN_MESSAGE` |
| حد أقصى للمقاطع المسترجعة | ✅ منفّذ | `MAX_PASSAGES = 4` + تنويع المصادر داخل `retrievePassages` |
| منع الفتوى/التشخيص/الوصف الشخصي | ✅ منفّذ | `src/lib/policy/*`, `src/lib/safety.ts`, `src/lib/terminology.ts` |
| سلامة تسبق الاسترجاع | ✅ منفّذ | أول بوابة في `runResearch` |
| فهم العربية والعامية محلياً | ✅ منفّذ | `src/lib/text/arabic.ts` (`normalizeDialect`, `tokenizeArabic`) |
| توليد مقيَّد بالمادة + وسم صريح | ✅ منفّذ | `src/lib/ai/provider.ts`, `src/components/research-result.tsx` |
| حارس لاحق يرفض المخرجات المختلطة/المحظورة | ✅ منفّذ | `src/lib/text/strict-output.ts`, `isFramingSafe` |
| مسار حتمي كامل بدون أي مفتاح | ✅ منفّذ | `src/lib/ai/fallback.ts`, `tests/fallback.test.ts` |
| إسناد المصدر والموضع والرابط لكل مقطع | ✅ منفّذ | `PassageCard`, `RetrievedPassage` |
| عرض الحديث الكامل + الشرح الرسمي كطبقتين منفصلتين | ✅ منفّذ | `src/components/passage-card.tsx` |
| النص القرآني في حقل مستقل بخط حفص | ✅ منفّذ | `quranText`/`quranReference` + `globals.css` |
| استرجاع جامع السنة من صفحات المتون الرسمية | ✅ منفّذ (271 مقطعاً) | `scripts/alifta-html/ingest.mjs`, `src/lib/corpus/generated/` |
| بوابة جودة corpus وعدم الكتابة على corpus مرفوض | ✅ منفّذ ومختبر | `scripts/alifta-html/verify.mjs`, اختبار «a rejected run may not replace the committed corpus» |
| مجموعة قياس ثابتة 40 حالة | ✅ منفّذة وقابلة للتشغيل | `benchmarks/questions.json`, `npm run benchmark` |
| فحص صحة للبيئة المنشورة | ✅ منفّذ | `GET /api/health` (حالة AI + قاعدة البيانات + عدد المقاطع) |
| اختبارات آلية | ✅ 99 اختبار Vitest + 33 اختبار زاحف Al-Ifta | `tests/`, `npm run alifta:test` |
| تصنيف المصادر المستبعدة ومنع استرجاعها | ✅ منفّذ | `EXCLUDED_SOURCES` في سجل المصادر |

## غير منفّذ في مسار التشغيل (صراحةً)

| المتطلب | الحالة | ملاحظة |
|---|---|---|
| AI Research Planner | ❌ غير موصول | لا يوجد استدعاء نموذج للتخطيط؛ التصنيف محلي حتمي. |
| Semantic embeddings + Hybrid Retrieval | ❌ غير موصول | `src/lib/ai/embeddings.ts` موجود لكنه غير مستورد من أي مسار. |
| AI Re-ranking | ❌ غير موصول | الترتيب حتمي (topic/keyword/rarity) داخل `retrievePassages`. |
| Claim generation + Claim verification | ❌ غير موصول | لا توجد ادعاءات ولا تحقق على مادة المستخدم. |
| Conflict detection على مادة المستخدم | ⚠️ جزئي | `/api/benchmark/conflict` يفحص مقطعين **اصطناعيين** بمصفوفة أنماط، ويتطلب مزوّداً. |
| اختبار UX مع مستخدمين | ⏳ لم يُنفّذ | البروتوكول ونموذج النتائج جاهزان في `docs/UX-TEST-PLAN.md`. |
| تشغيل benchmark على البيئة المنشورة | ⏳ لم يُنفّذ في هذا الـcommit | الأمر جاهز: `npm run benchmark -- --url <deployment>`. |
| تضمين خط حفص داخل المستودع | ✅ منفّذ | `public/fonts/UthmanicHafs_V22.ttf` غير معدَّل + `npm run verify:quran-font` يفحص البصمة؛ الترخيص المضمَّن في الملف يسمح بالاستخدام والنسخ والتوزيع ويمنع التعديل (`docs/FONT-LICENSE.md`). |

## ملاحظة منهجية

الادعاءات في README والصفحات العامة مقيّدة بما هو منفّذ في الجدول الأول. لا تُنسب أي ميزة
من الجدول الثاني إلى المنتج في العرض أو الوثائق قبل وصلها فعلياً واختبارها.
