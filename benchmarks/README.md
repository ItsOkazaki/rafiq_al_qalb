# Fixed benchmark — 40 questions

`questions.json` is the fixed target used to compare the lexical baseline with the AI-first path.

## Cost-aware execution

The benchmark does real model work when pointed at a deployment. For zero-budget testing, Gemini's free-tier-capable models are the primary route. OpenRouter also exposes free model routes, but its current free plan advertises a 50-request/day platform limit, so use a smaller sample or distribute runs when using OpenRouter.

The benchmark runner itself never manufactures model scores. It records the deployment's actual retrieval, citation, abstention and outcome signals.

## Example

```bash
npm run benchmark -- --url https://YOUR-PREVIEW.vercel.app --limit 10
```

Run the full 40 once the provider quota allows:

```bash
npm run benchmark -- --url https://YOUR-PREVIEW.vercel.app
```
