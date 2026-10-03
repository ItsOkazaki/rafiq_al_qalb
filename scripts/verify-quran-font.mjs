import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const candidates = [
  path.join(root, "public", "fonts", "UthmanicHafs_V22.woff2"),
  path.join(root, "public", "fonts", "UthmanicHafs_V22.ttf"),
];
const existing = candidates.filter((p) => fs.existsSync(p) && fs.statSync(p).size > 100_000);
if (!existing.length) {
  console.error("QPC Hafs V22 font missing. Add public/fonts/UthmanicHafs_V22.ttf or .woff2 before competition release.");
  process.exit(1);
}
console.log("QPC Hafs V22 font asset present:");
for (const p of existing) console.log(` - ${path.relative(root, p)} (${fs.statSync(p).size} bytes)`);
