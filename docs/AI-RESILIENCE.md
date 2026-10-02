# AI Retrieval Resilience

This version makes the AI path tolerant of embedding and re-ranking failures while keeping answers grounded in the approved corpus.

## What changed

- Embeddings are requested only for a narrowed candidate pool instead of the entire approved corpus.
- Candidate selection combines lexical matches, matched topics, and planner search terms before semantic embedding.
- If embeddings fail or are unavailable, the system falls back to approved lexical/topic candidates.
- If AI re-ranking fails, deterministic ranking is used as a fallback.
- The pipeline no longer treats `semanticUsed === false` as an automatic total AI failure.
- The user-facing failure state is now reserved for cases where no final evidence can safely be selected.
- Default AI context sizes were reduced to avoid unnecessary token use.
- The independent source-conflict model call is disabled by default to save one extra model request. Enable it with `AI_INDEPENDENT_CONFLICTS=1`.
- `/api/health?probe=1` reports embedding health separately; embedding availability is no longer treated as a prerequisite for the whole AI service because deterministic retrieval remains available.

## Useful environment variables

```env
AI_RERANK_CANDIDATES=8
AI_FINAL_PASSAGES=4
AI_INDEPENDENT_CONFLICTS=0
```

`AI_INDEPENDENT_CONFLICTS=1` enables the extra independent conflict-detection pass.

## Verification

The bundled runtime smoke test passes the existing 40 benchmark cases, including AI, baseline, safety, degraded-provider, and conflict checks.
