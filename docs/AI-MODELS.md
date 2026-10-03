# AI models and responsibilities

This page describes the AI layer **as it exists in this repository**. Anything that is
not wired into the runtime path is listed as such on purpose.

## The one AI responsibility in the current runtime

Exactly one model call participates in a research request:

**Grounded answer organization** (`src/lib/ai/provider.ts#generateGroundedSummary`)
receives the user's description plus the retrieved approved passages, and returns an
Arabic-only organized brief.

Hard constraints enforced in code:

- `temperature: 0`; the model never sees anything except the retrieved passages.
- The system prompt forbids diagnosis, fatwas, personal prescriptions, invented
  citations, non-Arabic scripts, links, HTML and Markdown.
- A post-guard (`sanitizeStrictArabicOutput` + `isFramingSafe`) rejects mixed-script or
  banned-framing output. Rejected output is never shown; the deterministic brief is used.
- The UI labels the model layer explicitly: «ملخّص مولّد بالذكاء الاصطناعي — ليس من نص المصدر».

There is **no AI planner, no AI re-ranking, no AI evidence gate and no AI claim verifier**
in the request path. Retrieval, thresholds, abstention and the corpus filter are
deterministic code. See `docs/ARCHITECTURE.md`.

## Provider matrix

| Provider | When it is used | Chat model default | Env |
|---|---|---|---|
| Google Gemini | Primary when `GEMINI_API_KEY` is present (or `AI_PROVIDER=gemini`) | `gemini-3.5-flash-lite` (`GEMINI_CHAT_MODEL` / `GEMINI_MODEL`) | `GEMINI_API_KEY`, `AI_TIMEOUT_MS` |
| OpenAI | Fallback inside the same request when a Gemini call returns nothing and `OPENAI_API_KEY` exists; also primary if `AI_PROVIDER=openai` | `gpt-4o-mini` (`OPENAI_MODEL`) | `OPENAI_API_KEY`, `OPENAI_BASE_URL` |
| OpenRouter | Optional alternative provider (`AI_PROVIDER=openrouter`) | `qwen/qwen3.8-27b:free` (`OPENROUTER_MODEL`) | `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` |

`getAIConfig()` resolves the provider from `AI_PROVIDER` when set, otherwise from whichever
key is present (Gemini → OpenRouter → OpenAI).

## Response modes reported to the client

| `ai.mode` | Meaning |
|---|---|
| `model` | The grounded summary passed the strict Arabic/framing guard and is displayed with an AI label. |
| `deterministic` | No key, provider failure, or guard rejection: the brief is assembled literally from the retrieved passages. |

## Free-tier reality

Gemini free tier and OpenRouter free models are rate-limited (RPM/TPM/RPD and daily
request caps). The application is built so that a rate limit degrades to the
deterministic path instead of producing an ungrounded answer. Treat “free” as an
operational constraint, not as a guarantee.

## Privacy note

Some free provider routes document that prompts may be retained or used to improve the
provider's models. Do not send secrets or unnecessary personal data through them. The
prompt built here contains the user's description and short approved-source excerpts only.

## Cost per question

One chat request in the normal path (plus the deterministic fallback when no key is
configured, which costs nothing). No embedding requests are issued by the runtime.
