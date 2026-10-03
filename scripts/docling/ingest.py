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
from docling.service_client import DoclingServiceClient
from docling.datamodel.service.options import ConvertDocumentsOptions


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
    parser.add_argument("--service-url", help="Use a running docling-serve endpoint instead of local conversion")
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    output = Path(manifest.get("output", "./generated/docling-chunks.json"))
    output.parent.mkdir(parents=True, exist_ok=True)
    generated_ts = Path(manifest.get("outputTs", "./src/lib/corpus/generated/alifta-docling-chunks.ts"))
    generated_ts.parent.mkdir(parents=True, exist_ok=True)

    converter = None if args.service_url else DocumentConverter()
    service_client = DoclingServiceClient(url=args.service_url) if args.service_url else None
    chunker = HybridChunker()
    rows: list[dict[str, Any]] = []
    ledger: list[dict[str, Any]] = []
    seen_text: set[tuple[str, str]] = set()

    for source in manifest.get("sources", []):
        source_id = safe_text(source.get("sourceId"))
        if not source_id:
            continue
        topic_ids = [safe_text(x) for x in (source.get("topicIds") or []) if safe_text(x)]
        source_url = safe_text(source.get("sourceUrl")) or None
        inputs = iter_inputs(safe_text(source.get("input")))
        if not inputs:
            raise RuntimeError(f"No input found for {source_id}")
        source_before = len(rows)
        for item in inputs:
            if service_client:
                result = service_client.convert(
                    source=item,
                    options=ConvertDocumentsOptions(to_formats=["md"]),
                )
            else:
                assert converter is not None
                result = converter.convert(item)
            doc = result.document
            for idx, chunk in enumerate(chunker.chunk(dl_doc=doc)):
                text = safe_text(getattr(chunk, "text", ""))
                if not text:
                    continue
                if not item.startswith(("http://", "https://")) and Path(item).exists():
                    pass
                elif not item.startswith("https://sunna.alifta.gov.sa/"):
                    raise RuntimeError(f"Rejected non-official Al-Ifta input: {item}")
                dedupe_key = (source_id, " ".join(text.split()))
                if dedupe_key in seen_text:
                    continue
                seen_text.add(dedupe_key)
                meta = getattr(chunk, "meta", None)
                origin = getattr(meta, "origin", None) if meta else None
                rows.append(
                    {
                        "id": f"docling-{source_id}-{len(rows)+1:06d}",
                        "sourceId": source_id,
                        "chapter": " / ".join(list(getattr(meta, "headings", []) or [])) if meta else "",
                        "excerptType": "literal",
                        "role": "evidence",
                        "topics": topic_ids,
                        "keywords": [],
                        "text": text,
                        "sourceFile": item,
                        "sourceUrl": source_url,
                        "docling": {
                            "documentHash": safe_text(getattr(origin, "binary_hash", None)) if origin else None,
                            "source": item,
                            "chunkIndex": idx,
                            "headings": list(getattr(meta, "headings", []) or []) if meta else [],
                            "docItems": [str(x) for x in (getattr(meta, "doc_items", []) or [])] if meta else [],
                        },
                    }
                )
        produced = len(rows) - source_before
        if produced == 0:
            raise RuntimeError(f"Docling produced 0 chunks for approved source {source_id}; refusing silent success")
        ledger.append({"sourceId": source_id, "inputs": inputs, "chunks": produced, "topicIds": topic_ids})

    minimums = {k: int(v) for k, v in (manifest.get("minimumChunksBySource") or {}).items()}
    # ledger can contain multiple manifest entries for one source; aggregate before checking.
    counts_by_source = {}
    for entry in ledger:
        counts_by_source[entry["sourceId"]] = counts_by_source.get(entry["sourceId"], 0) + int(entry["chunks"])
    for source_id, minimum in minimums.items():
        actual = counts_by_source.get(source_id, 0)
        if actual < minimum:
            raise RuntimeError(
                f"Docling produced only {actual} chunks for {source_id}; minimum required is {minimum}."
            )

    output.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    required_topics = set(manifest.get("requiredTopicIds") or [])
    topic_counts: dict[str, int] = {topic_id: 0 for topic_id in required_topics}
    for row in rows:
        for topic_id in row.get("topics", []):
            if topic_id in topic_counts:
                topic_counts[topic_id] += 1
    missing_topics = [topic_id for topic_id, count in topic_counts.items() if count == 0]
    if missing_topics:
        raise RuntimeError(
            "Docling completed but produced no chunks for required 12-door topic(s): "
            + ", ".join(sorted(missing_topics))
        )
    min_per_topic = int(manifest.get("minimumChunksPerTopic", 3))
    weak_topics = [topic_id for topic_id, count in topic_counts.items() if count < min_per_topic]
    if weak_topics:
        raise RuntimeError(
            f"Docling topic coverage is too weak (<{min_per_topic} chunks): "
            + ", ".join(f"{topic_id}={topic_counts[topic_id]}" for topic_id in sorted(weak_topics))
        )

    ts_payload = json.dumps(rows, ensure_ascii=False, indent=2)
    generated_ts.write_text(
        "// AUTO-GENERATED by scripts/docling/ingest.py — do not hand-edit.\n"
        "import type { CorpusChunk } from \"@/lib/types\";\n\n"
        f"export const GENERATED_DOCLING_CHUNKS: CorpusChunk[] = {ts_payload};\n",
        encoding="utf-8",
    )

    ledger_path = output.with_name(output.stem + "-ledger.json")
    ledger_path.write_text(
        json.dumps({
            "tool": "Docling",
            "chunker": "HybridChunker",
            "totalChunks": len(rows),
            "topicCounts": topic_counts,
            "sources": ledger,
        }, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {len(rows)} chunks to {output}")
    print(f"Wrote ingestion ledger to {ledger_path}")
    print(f"Wrote Next.js corpus module to {generated_ts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
