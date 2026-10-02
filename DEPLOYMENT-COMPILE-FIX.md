# Vercel deployment compile fix — 2026-10-02

The Vercel build failed because `src/app/api/benchmark/conflict/route.ts` imported four named exports from `src/lib/ai/provider.ts` that were missing in the restored provider:

- `detectSourceConflicts`
- `getAIConfig`
- `isAIConfigured`
- `verifyClaims`

This fix adds those compatibility exports without replacing the normal `/hiwar` provider. The main research pipeline still imports only `generateGroundedSummary`, so this deployment repair does not reintroduce the previous evidence-gate rewrite.

`src/lib/ai/embeddings.ts` also requires `getAIConfig`, so that compatibility contract is included as well.

Validation performed:
- Local named-export/module audit: 0 missing-export diagnostics.
- Repository package install was not reproducible in the sandbox because dependency download timed out.
- The provided Vercel log shows dependency installation completed successfully; the failure was specifically the missing exports above.
