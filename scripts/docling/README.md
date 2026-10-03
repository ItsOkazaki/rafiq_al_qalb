# Optional Docling ingestion

Docling remains in the repository only as an optional tool for future PDF/DOCX/image ingestion. **It is not required for the Al-Ifta corpus or for the Next.js/Vercel runtime.**

The competition-critical Saudi Sunnah path is now:

```text
https://sunna.alifta.gov.sa/
  -> scripts/alifta-html/ingest.mjs
  -> clean official HTML
  -> official detail pages
  -> evidence chunks
  -> src/lib/corpus/generated/alifta-html-chunks.ts
  -> controlled RAG
```

Use the direct HTML pipeline first:

```bash
npm run alifta:test
npm run alifta:manifest
npm run alifta:ingest
npm run alifta:verify
```

Docling commands in this directory are preserved for optional non-Al-Ifta documents and are not part of the release-critical path.
