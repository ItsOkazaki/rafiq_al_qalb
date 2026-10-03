# Benchmark — baseline vs AI organization

## Goal

Measure what the deployed application actually does on a frozen case set, and keep the
numbers reproducible. The runner never writes a figure that did not come from a real HTTP
response.

## Case set

`benchmarks/questions.json` holds **40 fixed cases** covering: direct questions, vague and
dialect questions, out-of-scope questions, fatwa/safety/personal-treatment requests,
multi-source questions, and prompts that try to push the system into inventing a page.
No real user conversations are included.

Each case declares `expectedOutcome`, `expectedSources`, `expectedTopics` and, where
applicable, `expectedChunks`.

## Running

```bash
# local: start the app first
npm run build && npm start

npm run benchmark -- --url http://localhost:3000
npm run benchmark -- --url http://localhost:3000 --limit 10          # smoke sample
npm run benchmark -- --url https://YOUR-DEPLOYMENT.vercel.app        # deployed run
```

The runner calls `POST /api/research` twice per case (`mode=baseline`, `mode=ai`) and also
probes `POST /api/benchmark/conflict`.

## What is measured

| Metric | Definition |
|---|---|
| `outcome_accuracy` | Share of cases whose `outcome` (`ok` / `abstained` / `fatwa` / `safety`) matches `expectedOutcome`. |
| `retrieval_source_recall` | Share of `expectedSources` present in the four final passages. |
| `retrieval_source_hit_at_4` | Share of cases with at least one expected source in the final passages. |
| `retrieval_chunk_recall` / `retrieval_chunk_hit_at_4` | Same idea at chunk granularity, using `expectedChunks`. |
| `topic_hit` | Share of cases where an expected research door was matched. |
| `abstention_accuracy` | Outcome correctness restricted to out-of-scope, fatwa-safety and hallucination cases. |
| `model_organization_rate` | Share of answered cases where the grounded model summary (not the deterministic fallback) was displayed. Requires a provider key on the target deployment. |
| `deterministic_organization_rate` | The complement: answered cases organized deterministically. |
| `retrieval_identical_between_modes` | Sanity check: retrieval must be identical in `baseline` and `ai` modes, because the model does not retrieve. |

The conflict probe reports `PASS` only when a provider is configured (the endpoint returns
`503` otherwise, which is reported as `CHECK`).

## Output

- `benchmarks/results/latest.json` — full report (per-case rows + summary). The file is
  machine-written by a real run and is committed as the evidence for the numbers quoted in the
  README; the only way to change it is to run the benchmark again (`npm run benchmark`).
  The committed run is a local deterministic run (`http://127.0.0.1:3000`, no provider key);
  a deployed run with a provider key must be recorded separately before claiming model numbers.
- If `DATABASE_URL` is set for the runner, the same report is inserted into
  `benchmark_runs` / `benchmark_results` (see `database-setup.sql`). Without it the runner
  prints `Neon persistence: SKIP`.

## Integrity rules

1. No number is written by hand into the README, the slides or this page.
2. A run against a deployment without a provider key measures the deterministic path; it
   must be labelled as such (the summary shows `model_organization_rate`).
3. The gold set changes only with a deliberate, recorded revision (`--dataset` label).
