# Docling + RAG

## Why it is being added

Docling is used **before deployment**, not inside the Next.js request path. It can convert PDFs, HTML, DOCX, images and other document formats into structured documents; its chunkers preserve document hierarchy and provenance. Its HybridChunker is tokenization-aware, which is useful for aligning chunk sizes with the embedding model.

## Flow

`Official source -> archive/export -> Docling -> review -> generated CorpusChunk[] -> RAG`

For the Quran, do not OCR a scanned Mushaf and treat that OCR as authoritative. Use the exact machine-readable Hafs corpus from the approved Quran source and use Docling for surrounding books/documents where layout-aware extraction is useful.

## Runtime boundary

- Vercel/Next.js imports only generated TypeScript data.
- Python/Docling is used during corpus preparation.
- `src/lib/corpus/docling-chunks.ts` is the checked-in hook. An ingestion job can replace the empty array with reviewed chunks.
- No Node dependency is added for Docling.

## Review gate

Every generated chunk must have:

1. an approved `sourceId`;
2. exact source title and URL;
3. chapter/book metadata;
4. page/provenance when available;
5. a human review before being marked retrievable;
6. no Quran text reconstructed from AI or OCR.
