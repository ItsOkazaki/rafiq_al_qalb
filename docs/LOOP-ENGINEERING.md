# Loop engineering record

`scripts/loop-engineering.mjs` is a small maintainer helper (not wired into CI):

```bash
node scripts/loop-engineering.mjs
```

It runs, in order:

1. `npm test` (Vitest suite),
2. `npm run typecheck`,
3. prints the summary of the last benchmark report if `benchmarks/results/latest.json` exists.

If no benchmark report exists yet it prints the command to produce one
(`npm run benchmark -- --url <deployment>`) instead of inventing figures.

## Working loop

1. Start from a clean tree (`git status` clean).
2. Run the helper; both gates must pass.
3. Run the fixed 40-case benchmark against a deployment.
4. Inspect failing cases by class: door matching, retrieval threshold, abstention,
   fatwa/safety routing, or the model-organization layer.
5. Change one root cause; re-run the same cases; keep the change only if the target metric
   improves without a regression elsewhere.
6. Never publish a number that did not come from `benchmarks/results/latest.json`.

## Honest status

The pass/fail of the two local gates is produced live by the script on your machine — this
page deliberately does not store a past run's numbers.
