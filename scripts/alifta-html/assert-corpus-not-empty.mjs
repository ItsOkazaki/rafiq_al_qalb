#!/usr/bin/env node
// Refuses to commit an empty/placeholder generated corpus. The workflow calls this
// right before `git add`, so a broken run can never overwrite good corpus data.
import fs from 'node:fs/promises';
import path from 'node:path';

const tsPath = path.join(process.cwd(), 'src/lib/corpus/generated/alifta-html-chunks.ts');
const jsonPath = path.join(process.cwd(), 'src/lib/corpus/generated/alifta-html-chunks.json');

const ts = await fs.readFile(tsPath, 'utf8');
const rows = JSON.parse(await fs.readFile(jsonPath, 'utf8'));

if (!Array.isArray(rows) || rows.length === 0) throw new Error('REFUSING TO COMMIT: generated corpus is empty.');
if (/GENERATED_ALIFTA_HTML_CHUNKS: CorpusChunk\[\] = \[\];/.test(ts)) {
  throw new Error('REFUSING TO COMMIT: alifta-html-chunks.ts still contains the empty placeholder array.');
}
if (!ts.includes('GENERATED_ALIFTA_HTML_CHUNKS')) throw new Error('REFUSING TO COMMIT: export is missing from the generated file.');
for (const row of rows) {
  if (!row.hadithFullText && !row.explanationText) {
    throw new Error(`REFUSING TO COMMIT: record ${row.id} has neither full hadith text nor an official explanation.`);
  }
}
console.log(`PASS: generated corpus holds ${rows.length} records and is safe to commit.`);
