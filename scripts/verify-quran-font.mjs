#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Quran display-font check.
//
// The bundled font (KFGQPC HAFS Uthmanic Script v2.2) must be present, must match
// its documented sha256 exactly (its embedded licence forbids modification), and
// src/app/globals.css must request the local asset before the remote fallback.
//
// `--allow-remote-fallback` keeps working as an informational mode for the record:
// it reports state and succeeds even when the asset is missing.
//
// Run: npm run verify:quran-font [-- --allow-remote-fallback]
// ─────────────────────────────────────────────────────────────────────────────
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const allowRemoteFallback = process.argv.includes("--allow-remote-fallback");
const fontsDir = path.join(root, "public", "fonts");

// Documented asset(s): file name → sha256 recorded in public/fonts/README.md,
// public/fonts/UthmanicHafs_V22.LICENSE.txt and docs/FONT-LICENSE.md.
const DOCUMENTED = {
  "UthmanicHafs_V22.ttf": "a6e59510dcaf3ec99db49427321a035ed94af555ffc7d27e7f430b5fd5e179f8",
};
const MIN_BYTES = 100_000;

const failures = [];
const notes = [];

const present = Object.keys(DOCUMENTED).filter((name) => {
  const p = path.join(fontsDir, name);
  return fs.existsSync(p) && fs.statSync(p).size > MIN_BYTES;
});

if (!present.length) {
  const message =
    "KFGQPC Hafs V22 font asset is NOT bundled in public/fonts/. " +
    "Quran text would render through the remote fallback in src/app/globals.css.";
  if (allowRemoteFallback) {
    console.log(`WARN: ${message}`);
    console.log("      See docs/FONT-LICENSE.md for the bundled-asset procedure.");
    process.exit(0);
  }
  console.error(`FAIL: ${message}`);
  console.error(`Add ${Object.keys(DOCUMENTED).join(" / ")} in public/fonts/ before release,`);
  console.error("or run with --allow-remote-fallback for an informational check.");
  process.exit(1);
}

for (const name of present) {
  const p = path.join(fontsDir, name);
  const size = fs.statSync(p).size;
  const hash = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  if (hash === DOCUMENTED[name]) {
    notes.push(`PASS  ${name} — ${size} bytes — sha256 matches the documented undisplaced asset.`);
  } else {
    failures.push(
      `FAIL  ${name} — sha256 ${hash} does not match the documented ` +
        `${DOCUMENTED[name]}.\n      The embedded KFGQPC licence forbids modifying the font; ` +
        `re-download the unmodified file instead of fixing the hash.`,
    );
  }
}

// Any other font binary in public/fonts/ must be documented too.
for (const name of fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir) : []) {
  if (!/\.(ttf|otf|woff2?)$/i.test(name)) continue;
  if (!(name in DOCUMENTED)) {
    failures.push(
      `FAIL  public/fonts/${name} is an undocumented font asset. ` +
        `Document its source, licence and sha256 (docs/FONT-LICENSE.md) or remove it.`,
    );
  }
}

// The stylesheet must prefer the bundled local asset.
const cssPath = path.join(root, "src", "app", "globals.css");
const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, "utf8") : "";
const localRef = Object.keys(DOCUMENTED).find((name) => css.includes(`/fonts/${name}`));
if (localRef) {
  notes.push(`PASS  src/app/globals.css requests /fonts/${localRef} (local-first, documented remote fallback kept).`);
} else {
  failures.push(
    "FAIL  src/app/globals.css no longer requests the bundled local font; " +
      "Quran text would depend on the third-party CDN.",
  );
}

for (const line of notes) console.log(line);
if (failures.length) {
  for (const line of failures) console.error(line);
  process.exit(1);
}
