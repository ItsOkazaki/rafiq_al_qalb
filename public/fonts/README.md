# Quran font asset

Bundle the QPC Hafs V22 file here as:

- `UthmanicHafs_V22.woff2`

The project expects this local asset in production so Quran rendering does not depend on a third-party network request.

The CSS already prefers this local asset. If it is not present, it falls back to the V22 web font URL used by Quranic Universal Library/Tarteel.

Reference source requested for this project:
https://github.com/nuqayah/qpc-fonts/tree/master/text-mushafs/UthmanicHafs_V22

Primary authority for the Quran font/data:
https://qurancomplex.gov.sa/en/techquran/dev/
