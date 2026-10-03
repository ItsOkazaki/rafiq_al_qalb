# Optional document ingestion (Docling)

Docling is **optional** in this repository and is **not** part of the competition-critical
Al-Ifta path. Nothing in the runtime imports it, and no build or deployment step requires it.

## What is used for the Al-Ifta (Sunnah) source

```text
https://sunna.alifta.gov.sa/
  → scripts/alifta-html/ingest.mjs      (no Python, no Docling, Node built-in fetch)
  → official subject pages → individual hadith pages → cleaned text + provenance
  → src/lib/corpus/generated/alifta-html-chunks.{json,ts}
  → controlled RAG
```

## What Docling is kept for

Ordinary PDF/DOCX/scanned documents, where layout-aware extraction and structure-aware
chunking are valuable. The optional scripts live in `scripts/docling/`:

```bash
pip install -r scripts/docling/requirements.txt
python scripts/docling/ingest.py scripts/docling/manifest.example.json
python scripts/docling/verify-ingestion.py   # refuses a silent zero-chunk result
```

`src/lib/corpus/docling-chunks.ts` is a small bridge to
`src/lib/corpus/generated/alifta-docling-chunks.ts`, which ships as an empty placeholder.
**It is not imported by `src/lib/corpus/chunks.ts`**, so a Docling run cannot change the
approved corpus until a maintainer deliberately wires and reviews the output.

## Rules

1. Docling is a converter, not a religious source. It never upgrades a document's
   authority, and registering a source does not imply its whole corpus was ingested.
2. Quran text must never come from OCR or from a model. Use the approved machine-readable
   Hafs text (see `docs/SAUDI-QURAN-AI-OUTPUT-GUARD.md`).
3. Any Docling output enters the corpus only after `verify-ingestion.py` passes and a
   maintainer records the source, position and URL per chunk.
