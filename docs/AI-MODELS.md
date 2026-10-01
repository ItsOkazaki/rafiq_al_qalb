# AI models and responsibilities

## Required AI responsibilities

1. **Research planning:** تحويل السؤال العربي/العامي إلى intent وsemantic query وأسئلة فرعية.
2. **Semantic retrieval:** embeddings فوق الـ approved corpus.
3. **Hybrid retrieval:** دمج الاسترجاع اللفظي والدلالي قبل إعادة الترتيب.
4. **Re-ranking:** النموذج يعيد ترتيب الأدلة المرشحة وفق خطة البحث.
5. **Evidence gate:** قرار كفاية الدليل يمر عبر النموذج + فحوص التغطية الحتمية.
6. **Claim generation:** كل ادعاء يحمل IDs من المقاطع المسترجعة فقط.
7. **Claim verification:** مرور مستقل يوسم الادعاءات supported/partial/unsupported/conflicting.
8. **Conflict detection:** رصد التوتر بين المصادر دون تقرير أيها أصح.

## Provider-neutral architecture

The application supports three provider families through one interface:

- **Gemini Developer API** — recommended free-tier capable setup. Default chat: `gemini-3.1-flash-lite`; default embedding: `gemini-embedding-2`.
- **OpenRouter** — optional free setup. Default chat: `qwen/qwen3.8-27b:free`; default embedding: `liquid/lfm-2.5-embedding-350m:free`.
- **OpenAI** — retained as a direct/competition deployment option when API credit is available.

The RAG, evidence gate, claim schema, verification rules, and safety policies do not change when the provider changes.

## Free-tier truth

“Free” means no token charge for the selected free-tier route, **not unlimited usage**. Google applies RPM/TPM/RPD limits per project. OpenRouter currently advertises a 50-request/day free-plan platform limit, and free model availability can vary. Treat these as operational constraints rather than guarantees of unlimited service.

## Privacy note

Some OpenRouter free endpoints document that prompts/outputs or embeddings may be retained or used to train the underlying provider model. Do not send secrets or unnecessary personal data through free providers. For the competition, keep the approved corpus and evaluation metadata controlled and use the provider whose data policy the team accepts.


### Gemini reliability note
The Gemini embedding path batches retrieval embeddings in small groups, validates response counts, and requests 768-dimensional vectors. This avoids relying on one oversized batch during serverless execution. The health probe also validates a small embedding batch.
