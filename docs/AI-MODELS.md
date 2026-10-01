# AI models and responsibilities

## Required AI responsibilities

1. **Research planning:** convert Arabic/dialectal wording into intent, semantic query and subquestions.
2. **Semantic retrieval:** embeddings over the approved corpus.
3. **Re-ranking:** an LLM scores candidate evidence for relevance to the research plan.
4. **Evidence gate:** model gate + deterministic semantic coverage checks.
5. **Claim generation:** every claim must cite retrieved chunk IDs.
6. **Claim verification:** a second model pass labels claims as supported/partial/unsupported/conflicting.
7. **Conflict detection:** sources can be flagged as differing without the system declaring which one is correct.

## Provider

The code uses an OpenAI-compatible REST surface (`/chat/completions` and `/embeddings`). OpenAI is the intended Vercel provider. Local OpenAI-compatible providers can be used for development.

The public/repository code contains no secret values. Secrets live in Vercel/`.env.local`.
