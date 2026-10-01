# Team handoff — Rafiq Al-Qulub Evidence-Gated AI RAG

## This is the correct working copy

This directory starts from the **original project ZIP** and keeps the original Neon/Drizzle operational database and Vitest test infrastructure. The AI-first upgrade was layered on top rather than replacing the original project with the earlier public-clean version.

## First deployment checklist

### Vercel

Set the existing team environment variables:

```text
DATABASE_URL=your-Neon-connection-string
OPENAI_API_KEY=your-OpenAI-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
AI_TIMEOUT_MS=20000
AI_RERANK_CANDIDATES=10
AI_FINAL_PASSAGES=4
```

The code also accepts `AI_API_KEY`, `AI_BASE_URL`, `AI_CHAT_MODEL`, and `AI_EMBEDDING_MODEL`.

### Neon

Run `database-setup.sql` once in the team's Neon SQL editor. It upgrades an existing `research_sessions` table and creates `benchmark_runs` / `benchmark_results`.

### Local quality gates

```bash
npm install
npm run test
npm run typecheck
npm run smoke
npm run build
```

### Vercel Preview smoke

```text
/api/health
/hiwar
/lab
```

Expected health signals include:

```text
aiConfigured: true
database: configured
semantic retrieval: part of the pipeline
```

### Real benchmark

```bash
npm run benchmark -- --url https://YOUR-PREVIEW.vercel.app
```

The runner compares the fixed 40 questions in `benchmarks/questions.json` against the lexical baseline and AI path. With `DATABASE_URL` configured on the machine running the benchmark, the report is also persisted into Neon.

## Important

Do not commit `.env.local` or other secret-bearing environment files. The repository contains only placeholders. The existing Vercel/Neon/OpenAI secrets remain external to GitHub.

Do not present the mocked runtime smoke figures as model benchmark results. Only the deployed real-model benchmark belongs in the hackathon presentation.
