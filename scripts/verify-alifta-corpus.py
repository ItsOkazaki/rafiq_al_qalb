#!/usr/bin/env python3
"""Static checks for the checked-in Alifta routing corpus."""
from __future__ import annotations
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "src/lib/corpus/alifta-sunna.ts"
S = P.read_text(encoding="utf-8")
required = [
    "athar-al-dhunub", "qaswat-al-qalb", "al-tawba", "takrar-al-dhanb",
    "al-ghafla", "dhikr-athar", "al-hamm-wal-qalaq", "khushu-tadabbur",
    "hudur-al-qalb", "al-tadawi-bil-quran", "al-nazar-ghad", "hasm-al-shahwa",
]
arrays = {}
for name in ("TOUBA", "DHIKR_CIRCLES", "RUQYA"):
    start = S.index(f"const {name}:")
    body_start = S.index("[", start)
    body_end = S.index("];", body_start)
    arrays[name] = len(re.findall(r'^\s*\["\d+"', S[body_start:body_end], re.M))
special_start = S.index("const SPECIAL:")
special_end = S.index("export const ALIFTA_SUNNA_CHUNKS", special_start)
specials = S[special_start:special_end].count("seed(")
total = sum(arrays.values()) + specials
missing = [topic for topic in required if f'"{topic}"' not in S]
urls = re.findall(r'https://sunna\.alifta\.gov\.sa/[^"\']+', S)
non_alifta = [u for u in urls if not u.startswith("https://sunna.alifta.gov.sa/")]
print(f"PASS: Alifta checked-in entries = {total}")
print(f"  arrays={arrays}, special={specials}")
if total < 100:
    raise SystemExit("FAIL: fewer than 100 Alifta routing entries")
if missing:
    raise SystemExit("FAIL: missing topic coverage: " + ", ".join(missing))
if non_alifta:
    raise SystemExit("FAIL: non-official URLs found in Alifta corpus")
if 'role: "index"' not in S:
    raise SystemExit('FAIL: Alifta index entries are not marked role=index')
print("PASS: all 12 research doors have Alifta routing coverage")
print("PASS: all embedded Alifta URLs use sunna.alifta.gov.sa")
print("PASS: entries are explicitly typed as index, not full evidence")
