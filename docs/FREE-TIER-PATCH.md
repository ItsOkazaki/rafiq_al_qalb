# Free-tier Gemini patch — 2026-10-02

## What changed

- Gemini is the default provider when `AI_PROVIDER=gemini` or a Gemini key is present.
- Token Saver is on by default.
- Query planning is local by default; AI planning is optional.
- Embeddings are off by default; semantic retrieval can be enabled explicitly with `AI_USE_EMBEDDINGS=true`.
- Default rerank candidates reduced to 6 and final passages to 3.
- Gemini output budgets are bounded per task instead of using one large global output budget.
- Gemini retries were reduced to one retry before the fallback model is considered.
- Embedding failure is treated as an optional retrieval degradation, not an application-wide AI failure.
- Re-ranking failure falls back to deterministic approved-source ranking.
- `/api/health?probe=1` reports whether embeddings are enabled without spending embedding quota when Token Saver is on.
- The judge-rubric map now matches the weights shown in the supplied final-judging criteria screenshot.

## Normal Gemini free-tier configuration

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
AI_TOKEN_SAVER=true
AI_PLANNER_MODE=local
AI_USE_EMBEDDINGS=false
AI_RERANK_CANDIDATES=6
AI_FINAL_PASSAGES=3
```

Keep the real key in `.env.local` or Vercel environment variables. Never commit it.

## AI requests per normal question

Default path: local planning + retrieval + 1 AI rerank + 1 grounded claim-generation call + 1 claim-verification call.

That is typically **3 Gemini generation requests per question**, excluding retries/fallbacks. Independent conflict detection remains off by default to protect the free-tier budget.
