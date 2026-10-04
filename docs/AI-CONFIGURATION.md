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
| `AI_PROVIDER` | No | `gemini` \| `openrouter` \| `openai`. Inferred from the present key when unset. The selected provider is tried first; the remaining configured keys follow as fallbacks. |
| `GEMINI_API_KEY` | No | Enables the grounded-summary call through Gemini. Sent in the `x-goog-api-key` request header only — never in the URL. |
| `GEMINI_CHAT_MODEL` / `GEMINI_MODEL` | No | Chat model name; default `gemini-3.5-flash-lite`. |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` / `OPENROUTER_BASE_URL` | No | OpenRouter as a fully wired provider (`/chat/completions`, default model `qwen/qwen3.8-27b:free`). |
| `OPENROUTER_SITE_URL` / `OPENROUTER_SITE_NAME` | No | Attribution headers (`HTTP-Referer` / `X-Title`) OpenRouter uses for its dashboards; sensible defaults when unset. |
| `OPENAI_API_KEY` | No | Fallback attempt inside the same request when earlier providers returned nothing; or primary when selected. |
| `OPENAI_BASE_URL` / `OPENAI_MODEL` | No | OpenAI-compatible endpoint and model; defaults `https://api.openai.com/v1` and `gpt-4o-mini`. |
| `AI_TIMEOUT_MS` | No | **Total** budget shared by every provider attempt in one request (minimum 3000 ms) — fallbacks run with whatever remains. |
| `DATABASE_URL` | No | Enables optional session logging in PostgreSQL (never the raw query text). Absent → logging silently skipped. |

Variables that existed in earlier iterations but are **not read by the current runtime**
(no planner, no embeddings, no re-ranking): `AI_TOKEN_SAVER`, `AI_PLANNER_MODE`,
`AI_USE_EMBEDDINGS`, `AI_RERANK_CANDIDATES`, `AI_FINAL_PASSAGES`,
`AI_INDEPENDENT_CONFLICTS`, `GEMINI_CHAT_FALLBACK_MODEL`, `GEMINI_EMBEDDING_MODEL`.
They are not documented in `.env.example` because setting them changes nothing today.

## Failure behaviour (implemented)

| Failure | Behaviour |
|---|---|
| No key configured | Full deterministic organization of the retrieved passages; the UI labels the layer accordingly. |
| A provider call fails / times out | The next provider holding a key is tried — configured provider first, then the standard order Gemini → OpenRouter → OpenAI — until one returns text or the shared time budget runs out. Otherwise the deterministic brief. |
| Model returns mixed-script, Latin text, links or banned framing | Post-guard rejects it; the deterministic brief is displayed instead. Nothing partial is shown. |
| Rate limit (429) or provider error | Same as above — the request still returns approved evidence, never an ungrounded answer. |

## Provider safety rules (implemented)

- **Shared bounded timeout.** `AI_TIMEOUT_MS` is one total budget for the whole request.
  Every provider attempt consumes from it; a slow first provider cannot starve the
  fallbacks or the overall response.
- **No key in URLs.** The Gemini key is sent only as the `x-goog-api-key` request
  header, so it cannot leak through request-path logs.
- **Privacy-safe structured logs.** Provider failures are logged as a small structured
  record (`event`, `provider`, `reason`, optional HTTP `status`) — never the API key,
  the user query, or the prompt body.

## Operating notes

- The model never influences retrieval, so provider degradation cannot widen the source
  boundary or lower `MIN_PASSAGE_SCORE`.
- In the normal path the first healthy provider answers with one chat request; a failed
  provider triggers at most one fallback request per remaining configured key (still
  bounded by the shared `AI_TIMEOUT_MS` budget). Zero requests when no key is set.
- `GET /api/health` reports `ai.configured`, `ai.provider`, `ai.chatModel` and `ai.mode` so a
  reviewer can verify the deployment's configuration without exposing any secret.
