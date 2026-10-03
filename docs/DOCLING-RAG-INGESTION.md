# Document ingestion note

Docling is **optional** in Rafiq. It is not used by the competition-critical Al-Ifta path and is not imported by `/hiwar` at runtime.

For Al-Ifta, the project now uses a no-dependency Node pipeline:

`official HTML -> clean HTML -> detail-page evidence -> chunks -> generated TypeScript -> RAG`

Docling may still be used later for difficult PDFs/DOCX/scanned documents where layout-aware extraction is valuable. Quran text must never be produced by OCR or AI; use the approved machine-readable Hafs corpus.
