# AI configuration — providers, environment, resilience

> This page consolidates earlier provider-resilience and free-tier notes (their full text stays
> in git history). Every variable below is read by the code in this repository.

## Default (recommended) configuration

```env
# Optional at all times: without a key the app runs the deterministic path end to end.
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
GEMINI_CHAT_MODEL=gemini-3.5-flash-lite
AI_TIMEOUT_MS=20000
```

Keep the key in `.env.local` (local) or in the Vercel project environment variables
(deployed). Never commit it; `.gitignore` excludes `.env*` except `.env.example`.

## What each variable does

| Variable | Required? | Effect |
|---|---|---|
| `AI_PROVIDER` | No | `gemini` \| `openrouter` \| `openai`. Inferred from the present key when unset. |
| `GEMINI_API_KEY` | No | Enables the grounded-summary call through Gemini. |
| `GEMINI_CHAT_MODEL` / `GEMINI_MODEL` | No | Chat model name; default `gemini-3.5-flash-lite`. |
| `OPENAI_API_KEY` | No | Second attempt inside the same request if Gemini returned nothing; or primary when selected. |
| `OPENAI_BASE_URL` / `OPENAI_MODEL` | No | OpenAI-compatible endpoint and model; defaults `https://api.openai.com/v1` and `gpt-4o-mini`. |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` / `OPENROUTER_BASE_URL` | No | OpenRouter as an alternative provider. |
| `AI_TIMEOUT_MS` | No | Provider timeout (minimum 3000 ms). |
| `DATABASE_URL` | No | Enables optional session logging in PostgreSQL. Absent → logging silently skipped. |

Variables that existed in earlier iterations but are **not read by the current runtime**
(no planner, no embeddings, no re-ranking): `AI_TOKEN_SAVER`, `AI_PLANNER_MODE`,
`AI_USE_EMBEDDINGS`, `AI_RERANK_CANDIDATES`, `AI_FINAL_PASSAGES`,
`AI_INDEPENDENT_CONFLICTS`, `GEMINI_CHAT_FALLBACK_MODEL`, `GEMINI_EMBEDDING_MODEL`.
They are not documented in `.env.example` because setting them changes nothing today.

## Failure behaviour (implemented)

| Failure | Behaviour |
|---|---|
| No key configured | Full deterministic organization of the retrieved passages; the UI labels the layer accordingly. |
| Gemini call fails / times out | One fallback attempt through OpenAI when its key exists; otherwise the deterministic brief. |
| Model returns mixed-script, Latin text, links or banned framing | Post-guard rejects it; the deterministic brief is displayed instead. Nothing partial is shown. |
| Rate limit (429) or provider error | Same as above — the request still returns approved evidence, never an ungrounded answer. |

## Operating notes

- The model never influences retrieval, so provider degradation cannot widen the source
  boundary or lower `MIN_PASSAGE_SCORE`.
- One chat request per answered question in the normal path; zero requests when no key is set.
- `GET /api/health` reports `ai.configured`, `ai.provider`, `ai.chatModel` and `ai.mode` so a
  reviewer can verify the deployment's configuration without exposing any secret.
