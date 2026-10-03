# Docling runtime status

Docling is **not a runtime dependency** of `/hiwar` and is not required for the Al-Ifta corpus. The Al-Ifta path uses the no-dependency Node ingestion pipeline under `scripts/alifta-html/`.

Docling remains available as an optional ingestion tool for difficult PDFs or structured documents, but it is not part of the competition-critical path.

Primary Al-Ifta flow:

```text
sunna.alifta.gov.sa
  -> direct HTML fetch
  -> clean official result/detail pages
  -> structure-aware chunking
  -> provenance
  -> generated TypeScript corpus
  -> controlled RAG
```
