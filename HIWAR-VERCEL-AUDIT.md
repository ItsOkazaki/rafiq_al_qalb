# Rafiq Al-Qulub — /hiwar + Vercel audit

Date: 2026-10-02

## What was checked

- `/hiwar` client calls `POST /api/research` with a JSON `{ query }` payload.
- `/api/research` runs on the Node.js runtime and treats PostgreSQL telemetry as best-effort, so missing/unavailable `DATABASE_URL` does not block the research response.
- AI configuration is consistent across the provider, `.env.example`, and `DEPLOY.md`.
- Gemini uses `x-goog-api-key` and the official `v1beta/models/{model}:generateContent` REST path.
- Default Gemini chat model is `gemini-3.5-flash-lite`, with `gemini-3.1-flash-lite` as fallback.
- AI request timeout is 10s by default; `/api/research` has a 120s function ceiling.
- The `/hiwar` liquid-glass text uses parchment/brass/forest/oxblood identity colors; no purple/violet/fuchsia/indigo text classes remain in `src`.

## Fixes made

1. Re-synchronized the AI provider, research pipeline, RAG retrieval, result renderer, smoke tests, benchmark runner, and deploy documentation to the same AI-first contract.
2. Fixed natural-language topic matching for `أرجع لنفس الذنب كل مرة…`, which had been incorrectly abstaining despite valid corpus evidence.
3. Made Neon telemetry optional and reusable across warm Node/Vercel invocations.
4. Added explicit `runtime = "nodejs"` to the research and health routes.
5. Increased `/api/research` `maxDuration` to 120s while keeping each provider request bounded to 10s by default.
6. Changed dark glass text to readable parchment/brass shades without introducing a new purple palette.
7. Updated deployment examples so timeout/passages/candidate settings match the actual production-safe defaults.

## Validation results

### Passed locally

- TypeScript syntax smoke: **41 files, 0 diagnostics**.
- Deterministic runtime regression: **PASS**.
- Benchmark cases: **40 total, 0 failures**.
- AI pipeline mock: **PASS**.
- Baseline path: **PASS**.
- Safety short-circuit: **PASS**.
- AI outage/degraded path: **PASS**.
- Source-conflict detection: **PASS**.
- Low-confidence topic regression: **PASS**.
- Citation coverage guard: **PASS**.
- Gemini provider smoke: **PASS** — 4 mocked `generateContent` requests, correct URL, API-key header, JSON parsing, planning, reranking, claim generation, and verification.

### Not fully executable in this audit environment

The repository does not contain `node_modules` or a lockfile, and `npm install --no-audit --no-fund` timed out while fetching packages. Therefore a dependency-backed `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` could not be honestly reported as passed here.

That is an environment limitation, not a claim that those commands are broken. Vercel can install the declared dependencies during deployment.

## Live deployment requirement

A live Vercel deployment still needs real environment variables, especially `AI_PROVIDER=gemini` and `GEMINI_API_KEY`. After deployment, verify `/api/health?probe=1` once and submit one real query in `/hiwar`. Do not put API keys in GitHub or client-side variables.
