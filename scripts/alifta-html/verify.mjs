#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Corpus verification for the generated Al-Ifta evidence.
//
// Fails the build when the corpus is small, weakly distributed, sourced from a
// subject/search page instead of an individual hadith page, missing its full
// matn, or carrying an explanation without the exact official page it came from.
//
// Run: npm run alifta:verify
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs/promises';
import path from 'node:path';

const OFFICIAL = 'https://sunna.alifta.gov.sa/';
const root = process.cwd();
const file = path.join(root, 'src/lib/corpus/generated/alifta-html-chunks.json');
const ledgerFile = path.join(root, 'src/lib/corpus/generated/alifta-html-ledger.json');
const rows = JSON.parse(await fs.readFile(file, 'utf8'));

const requiredTopics = [
  'athar-al-dhunub', 'qaswat-al-qalb', 'al-tawba', 'takrar-al-dhanb',
  'al-ghafla', 'dhikr-athar', 'al-hamm-wal-qalaq', 'khushu-tadabbur',
  'hudur-al-qalb', 'al-tadawi-bil-quran', 'al-nazar-ghad', 'hasm-al-shahwa',
];

/** Routes that hold an individual hadith or an official service/commentary page. */
const DETAIL_PAGE_RE = /\/(BookToc\/ViewMatnPage|MatnService\/HadithServiceData|BookToc\/ViewServicePage)\b/i;
const SEARCH_PAGE_RE = /\/(Search\/|Subjects\/)/i;
const ARABIC_RE = /[\u0600-\u06FF]/;
const CJK_RE = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/;

function normalize(text) {
  return String(text ?? '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0640]/g, '')
    .replace(/[\u060C\u061B\u061F\u066A-\u066D\u06D4]/g, ' ')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0649/g, '\u064a')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Line-leading forms that open the commentator's text instead of the matn.
 * `hadithFullText` is displayed under the «الحديث» heading, so a record whose matn
 * still carries the sharh would present official commentary as hadith. Must stay in
 * step with COMMENTARY_LINE_START_RE in scripts/alifta-html/ingest.mjs —
 * tests/alifta-matn-separation.test.ts pins the agreement.
 */
const COMMENTARY_LINE_START_RE =
  /^\s*(?:\[[^\]\n]{0,16}\]\s*)?[(（]?\s*(?:مطابقته للترجمة|مُطَابَقَتُهُ لِلتَّرْجَمَةِ|ذكر معناه|ذِكر معناه|ذكر رجاله|ذِكر رجاله|ذكر لطائف إسناده|ذِكر لطائف إسناده|ذكر تعدد موضعه|ما يستفاد منه|ذكر ما يستفاد منه|قوله|قَوْلُهُ|قلت|قُلت|هذا الحديث|بيان الإعراب|بَيَانُ(?:ت)?\s*(?:الإعراب|اللغة))\s*(?:[:：)）.،]|\s|$)/iu;

/** True when a stored matn still carries the commentator's text after line 0. */
function matnCarriesCommentary(matn) {
  const lines = String(matn ?? '').split('\n');
  // Line 0 is the matn itself; only the lines after it can be commentary.
  return lines.slice(1).some((line) => COMMENTARY_LINE_START_RE.test(line));
}

/** Allow punctuation/diacritics to differ while requiring every Arabic word to
 * occur in the same order in the official matn. */
function isGroundedHadithExcerpt(excerpt, fullMatn) {
  const tokens = (text) => normalize(text).split(' ').filter((token) => /^[\u0621-\u064A]+$/.test(token));
  const needle = tokens(excerpt);
  const haystack = tokens(fullMatn);
  return needle.length >= 2 && haystack.length >= needle.length &&
    ` ${haystack.join(' ')} `.includes(` ${needle.join(' ')} `);
}

const problems = [];
if (!Array.isArray(rows) || rows.length < 100) problems.push(`expected >=100 chunks, got ${Array.isArray(rows) ? rows.length : typeof rows}`);

const seenMatns = new Map();
let withFullText = 0;
let withExplanation = 0;
let fullLongerThanExcerpt = 0;

for (const [i, row] of (rows ?? []).entries()) {
  const at = (message) => problems.push(`#${i} ${row?.id ?? '?'}: ${message}`);
  if (row.sourceId !== 'alifta-sunna-encyclopedia') at('wrong sourceId');
  if (row.role !== 'evidence') at('role is not evidence');
  if (row.excerptType !== 'literal') at('not literal');
  if (!row.text || row.text.length < 35) at('text too short');
  if (!ARABIC_RE.test(row.text ?? '')) at('text has no Arabic');
  if (CJK_RE.test(`${row.text} ${row.hadithFullText ?? ''} ${row.explanationText ?? ''}`)) at('non-Arabic (CJK) content');
  if (/<[a-z][\s\S]*>/i.test(row.text ?? '')) at('HTML markup leaked into text');
  if (/https?:\/\//i.test(row.text ?? '')) at('URL leaked into text');

  const url = String(row.sourceUrl ?? '');
  if (!url.startsWith(OFFICIAL)) at('non-official source URL');
  if (!DETAIL_PAGE_RE.test(url)) at('source URL is not an individual hadith/service page');
  if (SEARCH_PAGE_RE.test(url)) at('source URL is a subject/search page, not an individual page');
  if (!/[?&]mainId=\d+/i.test(url)) at('source URL has no mainId');

  if (row.htmlIngestion?.method !== 'official-html') at('provenance missing');
  if (!Array.isArray(row.topics) || !row.topics.length) at('no doors');

  if (row.hadithFullText) {
    withFullText++;
    if (!ARABIC_RE.test(row.hadithFullText)) at('hadithFullText has no Arabic');
    if (row.hadithFullText.length < 60) at(`hadithFullText suspiciously short (${row.hadithFullText.length})`);
    if (row.hadithText && row.hadithFullText.length > row.hadithText.length) fullLongerThanExcerpt++;
    if (row.hadithText && !isGroundedHadithExcerpt(row.hadithText, row.hadithFullText)) {
      at('hadithText is not an ordered-word excerpt of hadithFullText (possible chapter/title metadata)');
    }
    if (matnCarriesCommentary(row.hadithFullText)) {
      at('hadithFullText carries the commentator\'s sharh — it would be displayed as hadith; run `npm run alifta:repair-matn`');
    }
    const key = normalize(row.hadithFullText);
    if (seenMatns.has(key)) at(`duplicate matn of ${seenMatns.get(key)}`);
    else seenMatns.set(key, row.id);
  }

  if (row.explanationText) {
    withExplanation++;
    if (!row.explanationSourceUrl) at('explanation without its official source URL');
    else if (!String(row.explanationSourceUrl).startsWith(OFFICIAL)) at('explanation source URL is not official');
    if (!ARABIC_RE.test(row.explanationText)) at('explanationText has no Arabic');
  }
  if (row.explanationSourceUrl && !row.explanationText) at('explanation URL without explanation text');
}

const counts = Object.fromEntries(requiredTopics.map((x) => [x, 0]));
for (const row of rows ?? []) for (const topic of row.topics ?? []) if (topic in counts) counts[topic]++;
const weak = Object.entries(counts).filter(([, count]) => count < 3);
if (weak.length) problems.push(`weak 12-door coverage: ${weak.map(([id, c]) => `${id}=${c}`).join(', ')}`);

const fullRatio = rows.length ? withFullText / rows.length : 0;
if (rows.length >= 100 && fullRatio < 0.9) {
  problems.push(`only ${withFullText}/${rows.length} records carry a full official matn (${(fullRatio * 100).toFixed(1)}%)`);
}

if (problems.length) {
  console.error(`FAIL: ${problems.length} corpus problem(s):`);
  for (const problem of problems.slice(0, 40)) console.error(`  - ${problem}`);
  process.exit(1);
}

let ledgerNote = '';
try {
  const ledger = JSON.parse(await fs.readFile(ledgerFile, 'utf8'));
  if (ledger.stats) {
    const s = ledger.stats;
    ledgerNote = ` (ingested ${s.detailSucceeded}/${s.detailAttempted} detail pages, ${s.commentaryFound} commentary pages, ${s.duplicatesRemoved} duplicates merged)`;
  }
} catch { /* ledger is optional */ }

console.log(`PASS: ${rows.length} direct-HTML Al-Ifta evidence chunks verified${ledgerNote}.`);
console.log(`PASS: all source URLs are individual official sunna.alifta.gov.sa hadith/service pages.`);
console.log(`PASS: ${withFullText}/${rows.length} records carry the full official matn (${fullLongerThanExcerpt} longer than the short excerpt).`);
console.log(`PASS: ${withExplanation} records carry an official explanation, each with its exact source URL.`);
console.log(`PASS: all 12 doors have at least 3 chunks — ${JSON.stringify(counts)}`);
