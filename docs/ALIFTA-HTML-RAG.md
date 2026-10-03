# Al-Ifta — direct official HTML -> clean chunks -> RAG

The competition-critical Al-Ifta ingestion path intentionally avoids Python/Docling dependencies.

## Pipeline

```text
Official sunna.alifta.gov.sa HTML
  -> allowlist validation
  -> subject-result discovery
  -> official detail-page fetch
  -> HTML chrome/script/style removal
  -> Arabic text cleaning
  -> deduplication
  -> literal evidence chunk creation
  -> source URL + ingestion provenance
  -> generated TypeScript corpus
  -> Rafiq controlled retrieval
  -> evidence-gated AI
```

## Commands

```bash
npm run alifta:test
npm run alifta:manifest
npm run alifta:live-check
npm run alifta:ingest
npm run alifta:verify
```

No new npm dependency is required. Node's built-in `fetch` is used.

The ingestion script uses the official subject-result pages to discover real hadith/detail URLs, then fetches the official detail pages for the actual evidence. It refuses to count a search-result title as evidence when a detail page fails. It also refuses to pass below 100 chunks or below 3 chunks for any of the 12 research doors.

## Runtime boundary

`/hiwar` does not scrape Al-Ifta live for each user query. The generated module `src/lib/corpus/generated/alifta-html-chunks.ts` is loaded into the approved corpus. This keeps the user-facing research path stable and independent of external site latency/CORS behavior.

## No-local-install option

The repository also contains `.github/workflows/refresh-alifta-html.yml`. After the project is pushed to GitHub, use **Actions -> Refresh Al-Ifta HTML corpus -> Run workflow**. GitHub's Node 24 runner performs the direct official-HTML ingestion, verifies the 100+ chunk / 12-door gates, and commits the generated corpus back to the repository. No Python, Docling, Docker, or local dependency installation is required.
