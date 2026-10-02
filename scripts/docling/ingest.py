#!/usr/bin/env python3
"""
رفيق القلوب — Docling ingestion

Purpose:
  Convert already-approved local/archived source files into structure-aware chunks
  with provenance, ready for human review before entering the Next.js corpus.

This is an ingestion-time utility. Docling is NOT imported by the Vercel/Next.js
runtime. That keeps deployment independent of Python.

Input:
  manifest.example.json-like file with sourceId + input path/URL.

Output:
  JSON records following the fields used by CorpusChunk, plus Docling provenance.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from docling.document_converter import DocumentConverter
from docling.chunking import HybridChunker


def iter_inputs(value: str) -> list[str]:
    p = Path(value)
    if p.exists():
        if p.is_file():
            return [str(p)]
        return [str(x) for x in sorted(p.rglob("*")) if x.is_file()]
    # Docling can also accept URLs; keep them explicit in the manifest.
    return [value]


def safe_text(value: Any) -> str:
    return str(value or "").replace("\x00", " ").strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    output = Path(manifest.get("output", "./generated/docling-chunks.json"))
    output.parent.mkdir(parents=True, exist_ok=True)

    converter = DocumentConverter()
    chunker = HybridChunker()
    rows: list[dict[str, Any]] = []

    for source in manifest.get("sources", []):
        source_id = safe_text(source.get("sourceId"))
        if not source_id:
            continue
        for item in iter_inputs(safe_text(source.get("input"))):
            result = converter.convert(item)
            doc = result.document
            for idx, chunk in enumerate(chunker.chunk(dl_doc=doc)):
                text = safe_text(getattr(chunk, "text", ""))
                if not text:
                    continue
                meta = getattr(chunk, "meta", None)
                origin = getattr(meta, "origin", None) if meta else None
                rows.append(
                    {
                        "id": f"docling-{source_id}-{len(rows)+1:06d}",
                        "sourceId": source_id,
                        "chapter": safe_text(getattr(meta, "headings", None)) if meta else "",
                        "excerptType": "literal",
                        "topics": [],
                        "keywords": [],
                        "text": text,
                        "sourceFile": item,
                        "docling": {
                            "documentHash": safe_text(getattr(origin, "binary_hash", None)) if origin else None,
                            "chunkIndex": idx,
                            "headings": list(getattr(meta, "headings", []) or []) if meta else [],
                            "docItems": [str(x) for x in (getattr(meta, "doc_items", []) or [])] if meta else [],
                        },
                    }
                )

    output.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(rows)} chunks to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
