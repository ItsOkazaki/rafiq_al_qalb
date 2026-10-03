# Quran font asset

Bundle the QPC Hafs V22 file here as either:

- `UthmanicHafs_V22.woff2` (preferred for web)
- `UthmanicHafs_V22.ttf` (also supported directly)

The project expects this local asset in production so Quran rendering does not depend on a third-party network request.

The CSS prefers this local asset first and uses the documented V22 web-font fallback only when the local file is absent. Before final submission, bundle the exact V22 font binary here and verify its checksum against the source distribution.

Reference source requested for this project:
https://github.com/nuqayah/qpc-fonts/tree/master/text-mushafs/UthmanicHafs_V22

Primary authority for the Quran font/data:
https://qurancomplex.gov.sa/en/techquran/dev/

## Competition-release requirement

Do not rely on the remote fallback for the final demo. Place the exact `UthmanicHafs_V22.ttf` from the QPC Hafs V22 distribution in this directory and optionally convert it to WOFF2. The application no longer falls back to Amiri for Quran text. This prevents a Quran quotation embedded in Ibn Baz or another source from silently rendering in a different Arabic font.

The font only controls glyph rendering; it does not create missing waqf marks. Waqf/orthographic marks must come from the verified Quran text itself. For this reason, source prose quotations are rendered with the same Hafs font, but they are not rewritten to add marks that are absent from the source.
