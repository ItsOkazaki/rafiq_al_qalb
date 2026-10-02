# Loop engineering record

This repo is the team/hackathon working version. The goal of each loop is to improve measured retrieval, evidence sufficiency, citation grounding and abstention without moving the evaluation target.

## Baseline

The original system is preserved as `mode=baseline`: topic/keyword/token-overlap retrieval and deterministic evidence presentation.

## AI iteration

The upgraded path is `mode=ai`: local token-friendly planning (or optional AI planning) → approved lexical/topic retrieval → optional semantic embeddings → AI re-ranking → evidence gate → claim generation → claim verification → optional conflict detection.

## Local engineering smoke already performed

- TypeScript/TSX syntax transpile check: **PASS** (42 files).
- Local `@/` import resolution check: **PASS**.
- Runtime smoke with mocked OpenAI-compatible responses: **PASS**.
- All **40 benchmark cases** executed through baseline + AI paths in the runtime smoke: **0 crashes**.
- Safety, fatwa referral, AI degradation, claim verification and synthetic conflict handling were exercised: **PASS**.

These are engineering checks, not competition benchmark results. They do not replace a real run against the team's deployed Gemini/OpenRouter/OpenAI configuration.

## Real evaluation loop for the team

1. Deploy the current commit to Vercel Preview.
2. Run the fixed 40-case benchmark against the same URL.
3. Save the real `benchmarks/results/latest.json` and the Neon run.
4. Inspect failed cases by category: planner, semantic retrieval, reranking, evidence gate, verification, conflict, or UI.
5. Change one root cause at a time.
6. Re-run the exact same 40 cases.
7. Keep a change only when it improves the target metric without causing unacceptable regressions.

Never fabricate benchmark numbers. Presentation numbers must come from an actual benchmark run.
