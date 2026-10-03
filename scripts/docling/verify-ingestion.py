#!/usr/bin/env python3
"""Verify a Docling-generated chunk export before it enters the Next.js corpus."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

REQUIRED = {"id", "sourceId", "text", "excerptType", "role", "sourceUrl", "docling"}
REQUIRED_TOPICS = {
    "athar-al-dhunub", "qaswat-al-qalb", "al-tawba", "takrar-al-dhanb",
    "al-ghafla", "dhikr-athar", "al-hamm-wal-qalaq", "khushu-tadabbur",
    "hudur-al-qalb", "al-tadawi-bil-quran", "al-nazar-ghad", "hasm-al-shahwa",
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("json_file", type=Path)
    args = parser.parse_args()
    rows = json.loads(args.json_file.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise SystemExit("FAIL: Docling output must be a JSON array")
    if not rows:
        raise SystemExit("FAIL: Docling output contains 0 chunks")

    bad = []
    for i, row in enumerate(rows):
        missing = sorted(REQUIRED - row.keys())
        if missing:
            bad.append(f"#{i}: missing {', '.join(missing)}")
            continue
        if row.get("role") != "evidence":
            bad.append(f"#{i}: role must be evidence in Docling output")
        d = row.get("docling") or {}
        if not d.get("documentHash") and not d.get("sourceFile"):
            bad.append(f"#{i}: missing document provenance")
        if not d.get("headings") and not row.get("chapter"):
            bad.append(f"#{i}: missing heading/chapter provenance")

    if bad:
        print("FAIL: Docling verification failed")
        print("\n".join(bad[:20]))
        return 1

    if len(rows) < 100:
        print(f"FAIL: expected at least 100 verified Al-Ifta evidence chunks; got {len(rows)}")
        return 1

    topic_counts: dict[str, int] = {topic_id: 0 for topic_id in REQUIRED_TOPICS}
    for row in rows:
        for topic_id in row.get("topics", []):
            if topic_id in topic_counts:
                topic_counts[topic_id] += 1
    missing_topics = [k for k, v in topic_counts.items() if v == 0]
    if missing_topics:
        print("FAIL: missing 12-door coverage: " + ", ".join(sorted(missing_topics)))
        return 1

    weak_topics = [f"{k}={v}" for k, v in topic_counts.items() if v < 3]
    if weak_topics:
        print("FAIL: weak 12-door coverage (<3 chunks): " + ", ".join(sorted(weak_topics)))
        return 1

    by_source: dict[str, int] = {}
    for row in rows:
        by_source[row["sourceId"]] = by_source.get(row["sourceId"], 0) + 1
    print(f"PASS: {len(rows)} Docling evidence chunks verified")
    for source_id, count in sorted(by_source.items()):
        print(f"  - {source_id}: {count}")
    print("PASS: 100+ evidence threshold and 12-door coverage verified")
    print("PASS: provenance fields are present; output is suitable for review/import")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
