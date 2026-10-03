#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'src/lib/corpus/generated/alifta-html-chunks.json');
const rows = JSON.parse(await fs.readFile(file, 'utf8'));

const requiredTopics = [
  'athar-al-dhunub', 'qaswat-al-qalb', 'al-tawba', 'takrar-al-dhanb',
  'al-ghafla', 'dhikr-athar', 'al-hamm-wal-qalaq', 'khushu-tadabbur',
  'hudur-al-qalb', 'al-tadawi-bil-quran', 'al-nazar-ghad', 'hasm-al-shahwa',
];

if (!Array.isArray(rows) || rows.length < 100) throw new Error(`FAIL: expected >=100 chunks, got ${rows.length}`);
for (const [i, row] of rows.entries()) {
  if (row.sourceId !== 'alifta-sunna-encyclopedia') throw new Error(`FAIL #${i}: wrong sourceId`);
  if (row.role !== 'evidence') throw new Error(`FAIL #${i}: role is not evidence`);
  if (row.excerptType !== 'literal') throw new Error(`FAIL #${i}: not literal`);
  if (!row.text || row.text.length < 35) throw new Error(`FAIL #${i}: text too short`);
  if (!String(row.sourceUrl).startsWith('https://sunna.alifta.gov.sa/')) throw new Error(`FAIL #${i}: non-official URL`);
  if (row.htmlIngestion?.method !== 'official-html') throw new Error(`FAIL #${i}: provenance missing`);
}
const counts = Object.fromEntries(requiredTopics.map((x) => [x, 0]));
for (const row of rows) for (const topic of row.topics ?? []) if (topic in counts) counts[topic]++;
const weak = Object.entries(counts).filter(([, count]) => count < 3);
if (weak.length) throw new Error(`FAIL: weak 12-door coverage: ${weak.map(([id, c]) => `${id}=${c}`).join(', ')}`);
console.log(`PASS: ${rows.length} direct-HTML Al-Ifta evidence chunks verified.`);
console.log(`PASS: all source URLs are official sunna.alifta.gov.sa URLs.`);
console.log(`PASS: all 12 doors have at least 3 chunks.`);
