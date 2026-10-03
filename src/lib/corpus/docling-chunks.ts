// Legacy optional ingestion bridge. The application no longer depends on Docling.
// Direct official HTML Al-Ifta ingestion is the primary pipeline used by Rafiq.
import type { CorpusChunk } from "@/lib/types";
import { GENERATED_DOCLING_CHUNKS } from "@/lib/corpus/generated/alifta-docling-chunks";

export const DOCLING_CHUNKS: CorpusChunk[] = GENERATED_DOCLING_CHUNKS;
export const DOCLING_INGESTION_STATE = {
  status: "optional-not-used" as const,
  chunkCount: GENERATED_DOCLING_CHUNKS.length,
  note: "Docling is retained only for optional PDF/document ingestion. Al-Ifta RAG uses direct official HTML ingestion.",
};
