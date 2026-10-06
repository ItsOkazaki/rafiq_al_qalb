#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Al-Ifta official-HTML ingestion (جامع خادم الحرمين الشريفين للسنة النبوية)
//
//   official subject/search page  → discover individual result links
//   → open each individual hadith page (BookToc/ViewMatnPage?bookId=..&mainId=..)
//   → extract the FULL official matn (never the search-result snippet)
//   → optionally open the official service/commentary page and extract its text
//   → write RAG chunks + a ledger with real counts
//
// Hard rules enforced here:
//   • A subject/search-result snippet is stored as `hadithText` (short excerpt) only.
//     `hadithFullText` is only ever filled from an individual official page.
//   • Nothing is invented: if no official explanation page was retrieved,
//     `explanationText` stays empty.
//   • A page that is not the requested hadith page (error page, redirect, block
//     page, empty page) is rejected and counted, never stored as evidence.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const OFFICIAL_ORIGIN = 'https://sunna.alifta.gov.sa/';

/** Routes that hold an individual hadith (matn) or an official service/commentary page. */
const DETAIL_ROUTE_RE = /(BookToc\/ViewMatnPage|MatnService\/HadithServiceData|BookToc\/ViewServicePage)/i;
/** serviceId 6 is the «شرح» service on sunna.alifta.gov.sa (فتح الباري، عمدة القاري، …). */
const COMMENTARY_SERVICE_ID = '6';

// ─────────────────────────────────────────────────────────────────────────────
// HTML entity decoding / URL normalization
// ─────────────────────────────────────────────────────────────────────────────

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', ensp: '\u2002', emsp: '\u2003',
  thinsp: '\u2009', zwnj: '\u200c', zwj: '\u200d', lrm: '\u200e', rlm: '\u200f', middot: '\u00b7',
  laquo: '\u00ab', raquo: '\u00bb', times: '\u00d7', divide: '\u00f7', ndash: '\u2013', mdash: '\u2014',
  lsquo: '\u2018', rsquo: '\u2019', sbquo: '\u201a', ldquo: '\u201c', rdquo: '\u201d', hellip: '\u2026',
  bull: '\u2022', dagger: '\u2020', deg: '\u00b0', copy: '\u00a9', reg: '\u00ae', trade: '\u2122',
  shy: '\u00ad', lre: '\u202a', rle: '\u202b', pdf: '\u202c', percent: '%',
};

function codePointFromEntity(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return fallback;
  if (n >= 0xd800 && n <= 0xdfff) return '\uFFFD'; // lone surrogate — never emit raw
  try { return String.fromCodePoint(n); } catch { return fallback; }
}

/**
 * Decode HTML entities in text or in an attribute value.
 *
 * Subject pages hand out hrefs such as `?bookId=1&amp;mainId=5507`; fetching that
 * verbatim asks Al-Ifta for a page with no mainId and the site answers HTTP 500.
 * Handles named, decimal and hexadecimal entities, missing trailing semicolons,
 * mixed casing, and doubly-escaped values (`&amp;amp;`).
 */
function decodeEntities(input) {
  let value = String(input ?? '');
  if (!value.includes('&')) return value;
  for (let pass = 0; pass < 4; pass++) {
    const before = value;
    value = value
      .replace(/&#([0-9]{1,7});?/g, (m, d) => codePointFromEntity(d, m))
      .replace(/&#[xX]([0-9a-fA-F]{1,6});?/g, (m, h) => codePointFromEntity(parseInt(h, 16), m))
      .replace(/&([a-zA-Z][a-zA-Z0-9]{1,31});/g, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
      // Legacy unterminated forms: `&amp ` / `&amp"` — but never `&ampersand`.
      // Unterminated legacy form (`&amp ` / `&amp"`). Per the HTML rule it is left
      // alone when followed by an alphanumeric or '=', so `&ampersand=2` survives.
      .replace(/&(amp|lt|gt|quot|apos|nbsp)(?![a-zA-Z0-9;=])/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()]);
    if (value === before) break;
  }
  return value;
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<img[^>]*>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|div|section|article|main|header|footer|li|h[1-6]|tr|td|th)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\u00a0/g, ' '),
  );
}

/**
 * HTML → readable text. Whitespace is normalized without touching Arabic letters,
 * diacritics (tashkeel), tatweel, or Arabic punctuation.
 */
/**
 * Reader-converted pages turn footnote markers into markdown links, so a matn can
 * arrive as «[(1)](https://...#Foot_1)». Evidence text must never carry page chrome:
 * image syntax is dropped, a link keeps only its label, and bare URLs are removed.
 */
function stripMarkupArtifacts(text) {
  return String(text ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\(\s*(?:https?:)?\/\/[^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ');
}

function cleanText(raw) {
  return stripMarkupArtifacts(stripTags(raw))
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** A matn shorter than this is a fragment, not the complete hadith. */
export const MIN_FULL_HADITH_CHARS = 60;

/**
 * A valid run may not replace a fuller committed corpus with less than this share
 * of its chunks unless ALLOW_CORPUS_SHRINK=1 is set explicitly.
 */
export const CORPUS_SHRINK_FLOOR = 0.5;

/** Diacritics/punctuation-insensitive form used only for matching, never for output. */
function normalize(text) {
  return String(text ?? '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0649/g, '\u064a')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The crawler must apply the same grounding rule the corpus verifier and the
 * app enforce: a short excerpt may occupy `hadithText` only when its Arabic
 * words occur, in order, in the matn that is actually stored next to it.
 * A search-result label or chapter heading is metadata, never hadith text.
 * The body below is character-identical to verify.mjs and is pinned equal by
 * an offline regression test.
 */
function isGroundedHadithExcerpt(excerpt, fullMatn) {
  const tokens = (text) => normalize(text).split(' ').filter((token) => /^[\u0621-\u064A]+$/.test(token));
  const needle = tokens(excerpt);
  const haystack = tokens(fullMatn);
  return needle.length >= 2 && haystack.length >= needle.length &&
    ` ${haystack.join(' ')} `.includes(` ${needle.join(' ')} `);
}

function normalizeForDedupe(text) {
  return String(text ?? '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0640]/g, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627')
    .replace(/\u0649/g, '\u064a')
    .replace(/\u0629/g, '\u0647')
    .replace(/[^\u0600-\u06FF\u0750-\u077F\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

/** Token overlap used to prove a fetched page really is the page we asked for. */
function tokenOverlapRatio(needle, haystack) {
  const needleTokens = normalizeForDedupe(needle).split(' ').filter((t) => t.length >= 3);
  if (!needleTokens.length) return 1;
  const haystackTokens = new Set(normalizeForDedupe(haystack).split(' ').filter(Boolean));
  let hits = 0;
  for (const token of needleTokens) if (haystackTokens.has(token)) hits++;
  return hits / needleTokens.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Result titles: "1 - <br> لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ<br><br> صحيح البخاري"
// ─────────────────────────────────────────────────────────────────────────────

const BOOK_SUFFIXES = [
  "صحيح البخاري", "صحيح مسلم", "سنن أبي داود", "سنن الترمذي", "سنن النسائي",
  "سنن ابن ماجه", "موطأ مالك", "صحيح ابن حبان", "صحيح ابن خزيمة",
  "المستدرك على الصحيحين", "مسند أحمد", "الأحاديث المختارة", "المنتقى",
  "السنن الكبرى", "مسند أبي يعلى الموصلي", "مصنف ابن أبي شيبة",
  "مصنف عبد الرزاق", "فتح الباري", "عمدة القاري", "شرح النووي على مسلم",
];

function stripBookSuffix(title) {
  let value = cleanText(title).replace(/^\d{1,5}\s*[-–—]\s*/, "").trim();
  const match = BOOK_SUFFIXES.find((suffix) => value.endsWith(suffix));
  if (match) value = value.slice(0, -match.length).trim();
  return value.replace(/[،,:;\s]+$/u, "").trim();
}

/** Keep a page label as the short hadith only when it is verifiably in the matn. */
function verifiedHadithExcerpt(label, fullMatn) {
  const excerpt = stripBookSuffix(label);
  return isGroundedHadithExcerpt(excerpt, fullMatn) ? excerpt : '';
}

/**
 * Split an official result title into its parts. The site emits the ordinal, the
 * matched excerpt and the book name separated by <br>.
 * The ordinal is the position inside the result list — it is NOT a hadith number.
 */
function parseResultTitle(rawTitle) {
  const withBreaks = String(rawTitle ?? '').replace(/<br\s*\/?\s*>/gi, '\n');
  const lines = cleanText(withBreaks).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let ordinal = '';
  let snippet = '';
  if (lines.length) {
    const head = lines[0];
    const m = head.match(/^(\d{1,5})\s*[-–—:]\s*(.*)$/u);
    if (m) {
      ordinal = m[1];
      snippet = m[2].trim();
    } else {
      snippet = head;
    }
  }
  if (!snippet) snippet = lines.find((line) => !/^\d{1,5}\s*[-–—:]\s*$/u.test(line)) ?? '';
  const lastLine = lines.length > 1 ? lines[lines.length - 1] : '';
  const book = BOOK_SUFFIXES.find((suffix) => lastLine.endsWith(suffix)) ?? '';
  const text = stripBookSuffix(snippet || lines.join(' '));
  return { ordinal, snippet: text, book };
}

/** @deprecated kept for callers/tests: the result ordinal is not a hadith number. */
function extractHadithNumber(title) {
  return parseResultTitle(title).ordinal;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page-level text extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractMainHtml(html) {
  const candidates = [
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<body\b[^>]*>([\s\S]*?)<\/body>/i,
  ];
  for (const re of candidates) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return html;
}

function extractPageTitle(html) {
  const m = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return '';
  return cleanText(m[1]).replace(/\s*-\s*HadithWeb\s*$/i, '').trim();
}

/** Site chrome that must never leak into evidence text. */
const UI_NOISE_LINES = [
  'إضافة تعليق', 'تحليل الحديث', 'مقارنة المتون', 'الشواهد', 'متن مجمع', 'الإسناد',
  'غريب الحديث', 'الربط الموضوعي', 'الربط بالمخالف', 'المتواتر', 'الأعلام والأماكن',
  'الرواة', 'راوي الحديث', 'راوي أعلى', 'بحث نصي', 'بحث في الموضوعات', 'تسجيل الدخول',
];

const COMMENTARY_MARKER_RES = [
  /مطابقته للترجمة/i, /مُطَابَقَتُهُ لِلتَّرْجَمَةِ/, /ذكر معناه/i, /ذِكر معناه/,
  /قوله\s*[:：]/i, /قَوْلُهُ\s*[:：]/, /ذكر رجاله/i, /ذِكر رجاله/, /ذكر لطائف إسناده/i,
  /ذكر تعدد موضعه/i, /ما يستفاد منه/i, /ذكر ما يستفاد منه/i, /بَيَانُ(?:ت)?\s*(?:الإعراب|اللغة)/i,
];

/** Leading "5673 - " style markers that open a matn on the official page. */
const MATN_LEAD_RE = /^(\d{1,5})\s*[-–—]\s*/u;

function isUiNoise(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (trimmed.length <= 24 && UI_NOISE_LINES.some((marker) => trimmed === marker || trimmed.startsWith(marker))) return true;
  return false;
}

/** Collapse a matn that the site renders twice (vocalized + plain copy). */
function collapseRepeatedParagraphs(lines) {
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    const key = normalizeForDedupe(line);
    if (!key) continue;
    // Long identical paragraphs are the same matn rendered twice — keep the first only.
    if (key.length >= 60) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(line);
  }
  return out;
}

/**
 * Pull the complete matn out of an individual official page.
 *
 * The official page renders the hadith inside a frame, twice (a vocalized copy and
 * a plain copy), followed by the service bar and the analysis tree. This keeps the
 * whole matn — not just the phrase that matched the subject search.
 */
function extractMatnFromPage(pageText, hintSnippet = '') {
  const lines = cleanText(pageText).split('\n').map((l) => l.trim()).filter(Boolean);
  const hint = normalizeForDedupe(hintSnippet);

  // Scan the whole document: the official page keeps hidden panels (note modal,
  // analysis tree) *before* the hadith frame in the DOM, so the first chrome line
  // is not a safe cut-off. Chrome lines are skipped individually instead.
  const candidates = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(MATN_LEAD_RE);
    if (!m) continue;
    if (isUiNoise(line)) continue;
    const body = line.slice(m[0].length).trim();
    if (body.length < 40 || !hasArabic(body)) continue;
    candidates.push({ index: i, number: m[1], body, score: hint ? tokenOverlapRatio(hintSnippet, body) : 0 });
  }

  let picked = null;
  if (candidates.length) {
    picked = candidates.filter((c) => c.score >= 0.6).sort((a, b) => b.score - a.score || a.index - b.index)[0]
      ?? candidates[0];
  }

  if (!picked) {
    // No numbered matn line (service pages, or unexpected markup): fall back to a
    // window around the official result text so we still keep the full sentence
    // rather than only the matched phrase.
    const full = cleanText(pageText);
    const at = hint ? full.indexOf(hintSnippet.trim()) : -1;
    if (at < 0) return { number: '', text: '', matchedHint: false };
    const end = Math.min(full.length, at + 4000);
    const slice = cleanText(full.slice(Math.max(0, at - 40), end));
    const kept = collapseRepeatedParagraphs(slice.split('\n').filter((l) => !isUiNoise(l) && hasArabic(l)));
    // The window is taken from the live page, so on a sharh page it runs straight
    // into the commentary. Cut it back to the matn before storing it as one.
    const { matn, commentary } = splitMatnAndCommentary(cleanText(kept.join('\n')).replace(MATN_LEAD_RE, ''));
    return { number: '', text: matn, commentary, matchedHint: true };
  }

  // Consecutive lines that continue the same numbered matn belong to it; the scan
  // stops at page chrome, at the next numbered matn, at a commentary separator, or
  // at the first line that opens the commentator's own text.
  const block = [picked.body];
  for (let i = picked.index + 1; i < lines.length; i++) {
    const line = lines[i];
    if (isUiNoise(line) || MATN_LEAD_RE.test(line) || line === '* * *') break;
    if (COMMENTARY_LINE_START_RE.test(line)) break;
    if (hasArabic(line)) block.push(line.replace(MATN_LEAD_RE, ''));
  }

  // Belt and braces: a page that keeps matn and sharh in one paragraph still must
  // not store the sharh as matn.
  const { matn, commentary } = splitMatnAndCommentary(cleanText(collapseRepeatedParagraphs(block).join('\n')));
  const text = matn;
  return {
    number: picked.number,
    text,
    commentary,
    matchedHint: hint ? tokenOverlapRatio(hintSnippet, text) >= 0.6 : true,
  };
}

function firstCommentaryMarkerIndex(text) {
  let best = -1;
  for (const re of COMMENTARY_MARKER_RES) {
    const m = text.match(re);
    if (m && typeof m.index === 'number' && (best < 0 || m.index < best)) best = m.index;
  }
  return best;
}

/**
 * Line-leading forms that open the commentator's text instead of the matn.
 *
 * On a service/sharh page (BookToc/ViewServicePage — عمدة القاري، فتح الباري، …)
 * the official matn is followed *directly* by the commentary, with no `* * *`
 * separator and no page chrome between them. `extractMatnFromPage` used to stop
 * only at UI noise, the next numbered matn, or `* * *`, so the whole sharh was
 * swept into `hadithFullText` and later displayed under the «الحديث» heading.
 *
 * The patterns are anchored to the start of a line (optionally behind a paren or
 * a `[8/73]` page marker) so a matn that merely contains the word «قوله» is never
 * cut mid-sentence.
 */
const COMMENTARY_LINE_START_RE =
  /^\s*(?:\[[^\]\n]{0,16}\]\s*)?[(（]?\s*(?:مطابقته للترجمة|مُطَابَقَتُهُ لِلتَّرْجَمَةِ|ذكر معناه|ذِكر معناه|ذكر رجاله|ذِكر رجاله|ذكر لطائف إسناده|ذِكر لطائف إسناده|ذكر تعدد موضعه|ما يستفاد منه|ذكر ما يستفاد منه|قوله|قَوْلُهُ|قلت|قُلت|هذا الحديث|بيان الإعراب|بَيَانُ(?:ت)?\s*(?:الإعراب|اللغة))\s*(?:[:：)）.،]|\s|$)/iu;

/**
 * Split an official page body into the verified matn and the commentary that
 * follows it. The matn always comes first, so the search starts at the second
 * line and never touches line 0.
 *
 * Two shapes occur in the wild:
 *   1. line-based — the matn is its own paragraph and every sharh section starts
 *      a new line («هذا الحديث مطابق…», «( ذكر رجاله )», «قوله : …»).
 *   2. one blob — the page arrives as a single paragraph, so the first commentary
 *      marker inside the text is the cut point.
 *
 * Returns `{ matn, commentary, cut }`; `cut` is false when nothing was removed,
 * which is the normal case for a plain matn page.
 */
function splitMatnAndCommentary(text) {
  const value = cleanText(text);
  if (!value) return { matn: '', commentary: '', cut: false };

  const lines = value.split('\n');
  for (let i = 1; i < lines.length; i++) {
    if (COMMENTARY_LINE_START_RE.test(lines[i])) {
      const matn = cleanText(lines.slice(0, i).join('\n'));
      const commentary = cleanText(lines.slice(i).join('\n'));
      if (matn) return { matn, commentary, cut: true };
    }
  }

  // Single-blob pages: cut at the first commentary marker past a minimum matn
  // length, on a word boundary so no word is ever halved.
  const markerAt = firstCommentaryMarkerIndex(value);
  if (markerAt >= MIN_FULL_HADITH_CHARS) {
    const head = value.slice(0, markerAt);
    const boundary = Math.max(head.lastIndexOf(' '), head.lastIndexOf('\n'));
    const matn = cleanText(boundary > 0 ? head.slice(0, boundary) : head);
    if (matn.length >= MIN_FULL_HADITH_CHARS) {
      return { matn, commentary: cleanText(value.slice(matn.length)), cut: true };
    }
  }

  return { matn: value, commentary: '', cut: false };
}

/** Drop trailing site chrome / analysis trees from a commentary body. */
function trimChromeTail(text) {
  let value = text;
  for (const marker of ['تحليل الحديث', 'الأعلام والأماكن', 'مقارنة المتون', 'إضافة تعليق', 'الرواة']) {
    const at = value.lastIndexOf(marker);
    if (at > 400) value = value.slice(0, at);
  }
  return value.trim();
}

/** Cut at a sentence/paragraph boundary instead of mid-word. */
function truncateAtBoundary(text, maxChars) {
  if (!maxChars || text.length <= maxChars) return text;
  const window = text.slice(0, maxChars);
  const cut = Math.max(window.lastIndexOf(' . '), window.lastIndexOf('\n'), window.lastIndexOf('، '));
  return cleanText(cut > maxChars * 0.5 ? window.slice(0, cut) : window);
}

/**
 * Extract the official explanation from a service/commentary page
 * (MatnService/HadithServiceData or BookToc/ViewServicePage).
 *
 * Those pages repeat the matn and then the commentator's text after a "* * *"
 * separator. Only the commentator's text is returned; the matn is kept separately.
 */
function extractExplanationFromServicePage(pageHtml, { maxChars = 6000 } = {}) {
  const text = cleanText(extractMainHtml(pageHtml));
  if (!text) return '';
  const separatorAt = text.search(/\*\s*\*\s*\*/);
  const afterMatn = separatorAt >= 0 ? text.slice(separatorAt).replace(/^\*\s*\*\s*\*/, '') : text;
  const markerAt = firstCommentaryMarkerIndex(afterMatn);
  if (markerAt < 0) return '';
  const body = trimChromeTail(cleanText(afterMatn.slice(markerAt)));
  if (normalizeForDedupe(body).length < 60) return '';
  return truncateAtBoundary(body, maxChars);
}

/**
 * Combined extractor kept for existing callers/tests.
 *
 * @returns fullHadithText — complete official matn from the page
 *          explanationText — official commentary text when the page carries it
 */
function extractHadithAndExplanation(pageHtml, shortHint = '', { maxExplanationChars = 6000 } = {}) {
  const { snippet } = parseResultTitle(shortHint);
  const pageText = cleanText(extractMainHtml(pageHtml));
  if (!pageText) return { fullHadithText: '', explanationText: '', hadithNumber: '' };

  const matn = extractMatnFromPage(pageText, snippet || stripBookSuffix(shortHint));
  let explanationText = '';
  if (/\*\s*\*\s*\*/.test(pageText) || COMMENTARY_MARKER_RES.some((re) => re.test(pageText))) {
    explanationText = extractExplanationFromServicePage(pageHtml, { maxChars: maxExplanationChars });
  }
  // The commentary cut off the matn is official text from the same official page.
  // It is kept in `explanationText` — never appended to the matn — and only when no
  // dedicated explanation section was found, so nothing verified is overwritten.
  if (!explanationText && normalizeForDedupe(matn.commentary ?? '').length >= MIN_FULL_HADITH_CHARS) {
    explanationText = truncateAtBoundary(matn.commentary, maxExplanationChars);
  }
  return { fullHadithText: matn.text, explanationText, hadithNumber: matn.number };
}

/** Retained for compatibility with older callers. */
function extractBestPassage(pageHtml, hintTitle) {
  const { snippet } = parseResultTitle(hintTitle);
  const parts = extractHadithAndExplanation(pageHtml, hintTitle);
  const text = parts.fullHadithText || cleanText(extractMainHtml(pageHtml)).slice(0, 2600);
  const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const chapter = (lines.find((line) => /^باب\s/.test(line)) || lines.find((line) => /باب/.test(line))) ?? '';
  return { text, chapter, hint: snippet };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation — never store a page that is not the hadith we asked for
// ─────────────────────────────────────────────────────────────────────────────

const BLOCK_PAGE_RE = /\b(Just a moment|Access Denied|Request Rejected|Enable JavaScript|Attention Required|Cloudflare|Server Error in|Runtime Error|HTTP Error 5\d\d)\b/i;
const SOFT_ERROR_RE = /(الصفحة غير موجودة|تعذر عرض الصفحة|حدث خطأ|لا توجد نتائج|عفواً، حدث خطأ)/;

function looksLikeUsefulArabicPage(raw, minimumChars = 80) {
  const text = cleanText(extractMainHtml(raw));
  if (text.length < minimumChars || !hasArabic(text)) return false;
  if (BLOCK_PAGE_RE.test(text)) return false;
  return true;
}

function mainIdFromUrl(url) {
  try {
    const value = new URL(url).searchParams.get('mainId') || new URL(url).searchParams.get('MainId');
    return value ? String(value) : '';
  } catch { return ''; }
}

/**
 * Reject anything that is not the requested individual page: generic error pages,
 * redirects to the home page, empty responses, block pages, or a page that does
 * not carry its own mainId.
 */
function validateDetailPage(pageHtml, { hint = '', url = '', minMatnChars = MIN_FULL_HADITH_CHARS } = {}) {
  if (!pageHtml || !String(pageHtml).trim()) return { ok: false, reason: 'empty-response' };
  if (BLOCK_PAGE_RE.test(pageHtml)) return { ok: false, reason: 'block-page' };
  const text = cleanText(extractMainHtml(pageHtml));
  if (!hasArabic(text)) return { ok: false, reason: 'no-arabic-content' };
  if (SOFT_ERROR_RE.test(text) && text.length < 900) return { ok: false, reason: 'site-error-page' };

  const mainId = mainIdFromUrl(url);
  if (mainId) {
    const selfReferences = (pageHtml.match(new RegExp(`mainId=${mainId}(?![0-9])`, 'gi')) || []).length;
    if (selfReferences < 2) return { ok: false, reason: `page-does-not-reference-mainId-${mainId}` };
  }

  const { snippet } = parseResultTitle(hint);
  const matn = extractMatnFromPage(text, snippet);
  if (!matn.text) return { ok: false, reason: 'no-matn-extracted' };
  // A fragment is never stored as the complete hadith: the corpus verifier holds
  // every hadithFullText to the same minimum, so the crawler refuses it up front.
  if (matn.text.length < minMatnChars) return { ok: false, reason: 'matn-too-short' };
  if (snippet && !matn.matchedHint) return { ok: false, reason: 'matn-does-not-match-result-excerpt' };
  return { ok: true, reason: '', matn };
}

/** Kept for compatibility: a page is a usable detail page when validation passes. */
function looksLikeUsefulAliftaDetail(pageHtml, shortHint = '', url = '') {
  return validateDetailPage(pageHtml, { hint: shortHint, url }).ok;
}

function validateCommentaryPage(pageHtml, { url = '' } = {}) {
  if (!looksLikeUsefulArabicPage(pageHtml, 200)) return { ok: false, reason: 'not-a-commentary-page' };
  const text = cleanText(extractMainHtml(pageHtml));
  const hasMarker = COMMENTARY_MARKER_RES.some((re) => re.test(text));
  if (!hasMarker) return { ok: false, reason: 'no-commentary-markers' };
  const explanation = extractExplanationFromServicePage(pageHtml);
  if (!explanation) return { ok: false, reason: 'no-explanation-extracted' };
  const mainId = mainIdFromUrl(url);
  if (mainId) {
    const selfReferences = (pageHtml.match(new RegExp(`mainId=${mainId}(?![0-9])`, 'gi')) || []).length;
    if (selfReferences < 1) return { ok: false, reason: 'commentary-does-not-reference-mainId' };
  }
  return { ok: true, reason: '', explanation };
}

// ─────────────────────────────────────────────────────────────────────────────
// Link discovery
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve an href against the official base URL.
 * Entities are decoded first (`&amp;` → `&`), then the WHATWG URL parser
 * normalizes the result — Arabic query values come out correctly percent-encoded
 * and already-encoded values are never double-encoded.
 */
function toAbsoluteUrl(href, baseUrl) {
  const raw = String(href ?? '').trim();
  if (!raw) return null;
  const value = decodeEntities(raw)
    .replace(/[\t\n\r]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
  if (!value || value.startsWith('#')) return null;
  if (/^(?:javascript|data|vbscript|mailto|tel|file):/i.test(value)) return null;
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch { return null; }
}

const ANCHOR_RE = /<a\b[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))[^>]*>([\s\S]*?)<\/a>/gi;

function collectAnchors(html) {
  const out = [];
  let match;
  ANCHOR_RE.lastIndex = 0;
  while ((match = ANCHOR_RE.exec(html))) {
    out.push({ href: match[1] ?? match[2] ?? match[3] ?? '', label: match[4] ?? '' });
  }
  return out;
}

/**
 * Discover individual result links on an official subject/search page.
 * Works on raw HTML and on the Markdown produced by the reader fallback.
 */
function extractSubjectLinks(html, baseUrl, maxResults, { allowedOrigins = [OFFICIAL_ORIGIN] } = {}) {
  const found = [];
  const seen = new Set();
  const add = (href, rawTitle) => {
    const url = toAbsoluteUrl(href, baseUrl);
    if (!url || !allowedOrigins.some((origin) => url.startsWith(origin))) return;
    if (!DETAIL_ROUTE_RE.test(url)) return;
    const { snippet } = parseResultTitle(rawTitle);
    if (!snippet || !hasArabic(snippet)) return;
    const key = `${url}|${normalizeForDedupe(snippet)}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ url, title: snippet, rawTitle: cleanText(rawTitle) });
    return true;
  };

  for (const anchor of collectAnchors(html)) {
    if (found.length >= maxResults * 3) break;
    add(anchor.href, anchor.label);
  }

  // Reader fallback returns Markdown rather than HTML.
  if (found.length < maxResults) {
    const mdRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let m;
    while ((m = mdRe.exec(html)) && found.length < maxResults * 3) add(m[2], m[1]);
  }

  return found.slice(0, maxResults);
}

/**
 * Commentary/service candidates for an individual hadith page.
 *
 * The official page exposes its services as image-only anchors (explain.png), so
 * the link has no Arabic label — the old label-based filter never matched. Links
 * are therefore selected by route, and a serviceId=6 («شرح») URL is derived from
 * the page's own mainId when the service bar is present.
 */
function extractCommentaryLinks(pageHtml, pageUrl, { max = 3, allowedOrigins = [OFFICIAL_ORIGIN] } = {}) {
  const found = [];
  const seen = new Set();
  const add = (href, title = '') => {
    const url = toAbsoluteUrl(href, pageUrl || OFFICIAL_ORIGIN);
    if (!url || !allowedOrigins.some((origin) => url.startsWith(origin))) return;
    if (!/(MatnService\/HadithServiceData|BookToc\/ViewServicePage)/i.test(url)) return;
    if (seen.has(url)) return;
    seen.add(url);
    found.push({ url, title: cleanText(title) });
  };

  for (const anchor of collectAnchors(pageHtml)) add(anchor.href, anchor.label);
  const mdRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while ((m = mdRe.exec(pageHtml))) add(m[2], m[1]);

  const mainId = mainIdFromUrl(pageUrl || '');
  if (mainId) {
    const origin = allowedOrigins[0] ?? OFFICIAL_ORIGIN;
    const derived = `${origin}MatnService/HadithServiceData?serviceId=${COMMENTARY_SERVICE_ID}&mainId=${mainId}&inx=0`;
    if (!seen.has(derived)) found.push({ url: derived, title: '' });
  }

  // Prefer the official «شرح» service, then any other service/commentary page.
  const rank = (link) => {
    const u = new URL(link.url);
    if (u.searchParams.get('serviceId') === COMMENTARY_SERVICE_ID) return 0;
    if (/ViewServicePage/i.test(u.pathname)) return 1;
    return 2;
  };
  return found.sort((a, b) => rank(a) - rank(b)).slice(0, max);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetching
// ─────────────────────────────────────────────────────────────────────────────

function makeCookieJar() {
  const jar = new Map();
  return {
    header() { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '); },
    absorb(response) {
      const values = typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
      for (const value of values) {
        const first = String(value).split(';', 1)[0];
        const eq = first.indexOf('=');
        if (eq > 0) jar.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
      }
    },
  };
}

function browserHeaders({ referer = '', cookie = '' } = {}) {
  const headers = {
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'ar-SA,ar;q=0.9,en;q=0.6',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
  };
  if (referer) headers.referer = referer;
  if (cookie) headers.cookie = cookie;
  return headers;
}

async function sleep(ms) { if (ms > 0) await new Promise((r) => setTimeout(r, ms)); }

/** Map a thrown fetch error to a failure category used by the report. */
function errorCategory(error) {
  const message = String(error?.message ?? '');
  if (error?.name === 'AbortError' || /timeout|aborted/i.test(message)) return 'timeout';
  const http = message.match(/HTTP (\d{3})/);
  if (http) return `http-${http[1]}`;
  if (/fetch failed|ENOTFOUND|ECONNRESET|EAI_AGAIN|socket hang up|TLS|certificate/i.test(message)) return 'network';
  return 'error';
}

function isRetryableCategory(category) {
  if (category === 'timeout' || category === 'network') return true;
  const http = category.match(/^http-(\d{3})$/);
  if (!http) return false;
  const status = Number(http[1]);
  return status === 429 || status >= 500;
}

/**
 * Direct official HTML with bounded retries.
 * Recoverable failures (timeouts, connection resets, 429/5xx) are retried with a
 * capped backoff; 4xx is fatal and never retried.
 */
async function fetchText(url, { timeoutMs = 12000, attempts = 3, retryBaseMs = 800, referer = '', cookieJar = null } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: browserHeaders({ referer, cookie: cookieJar?.header() }),
        redirect: 'follow',
        signal: controller.signal,
      });
      cookieJar?.absorb(res);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      if (!text.trim()) throw new Error(`HTTP ${res.status} empty body for ${url}`);
      return { text, method: 'direct-official-html', finalUrl: res.url || url, status: res.status, attempts: attempt };
    } catch (error) {
      lastError = error;
      const category = errorCategory(error);
      if (attempt < attempts && isRetryableCategory(category)) {
        await sleep(Math.min(retryBaseMs * attempt, 4000));
        continue;
      }
      break;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

async function fetchViaJina(url, { timeoutMs = 40000, apiKey = '' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { accept: 'text/plain,text/markdown;q=0.9,*/*;q=0.8' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`Jina HTTP ${res.status} for ${url}`);
    const text = await res.text();
    if (!text.trim()) throw new Error(`Jina returned empty content for ${url}`);
    return { text, method: 'jina-reader-official-url', finalUrl: url, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

/** Direct official HTML first; the reader fallback is used only when needed. */
async function fetchOfficial(url, {
  referer = '', cookieJar = null, jinaFallback = true, jinaApiKey = '', validate = null,
  timeoutMs = 12000, attempts = 3, retryBaseMs = 800,
} = {}) {
  let directError = null;
  try {
    const direct = await fetchText(url, { referer, cookieJar, timeoutMs, attempts, retryBaseMs });
    const verdict = validate ? validate(direct.text) : { ok: true, reason: '' };
    if (verdict.ok !== false) return direct;
    directError = new Error(verdict.reason || 'direct response failed validation');
    directError.category = `validation:${verdict.reason}`;
  } catch (error) {
    directError = error;
  }
  if (!jinaFallback) throw directError;
  try {
    const fallback = await fetchViaJina(url, { apiKey: jinaApiKey });
    const verdict = validate ? validate(fallback.text) : { ok: true, reason: '' };
    if (verdict.ok === false) {
      const error = new Error(`${directError?.message ?? 'direct fetch failed'}; Jina content rejected (${verdict.reason})`);
      error.category = errorCategory(directError) || 'validation';
      throw error;
    }
    return { ...fallback, directError: directError?.message ?? '' };
  } catch (error) {
    if (error.category) throw error;
    const combined = new Error(`${directError?.message ?? 'direct fetch failed'}; fallback failed: ${error.message}`);
    combined.category = errorCategory(directError);
    throw combined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ingestion
// ─────────────────────────────────────────────────────────────────────────────

function keywordSeeds(title, topics) {
  const words = cleanText(title).split(/\s+/).filter((w) => w.length >= 4);
  return [...new Set([...words.slice(0, 10), ...topics])].slice(0, 16);
}

function emptyStats() {
  return {
    subjectsProcessed: 0,
    linksDiscovered: 0,
    detailAttempted: 0,
    detailSucceeded: 0,
    detailRejected: 0,
    commentaryAttempted: 0,
    commentaryFound: 0,
    duplicatesRemoved: 0,
    chunksGenerated: 0,
    fetchMethodCounts: { 'direct-official-html': 0, 'jina-reader-official-url': 0 },
    failuresByCategory: {},
  };
}

async function ingest(manifest) {
  const rows = [];
  const rowsByMatnKey = new Map();
  const errors = [];
  const ledger = [];
  const stats = emptyStats();

  const maxSubjectResults = Number(manifest.maxSubjectResults ?? 40);
  const delay = Number(manifest.requestDelayMs ?? 150);
  const fallbackDelay = Number(manifest.fallbackDelayMs ?? 2500);
  const timeoutMs = Number(manifest.timeoutMs ?? 12000);
  const attempts = Number(manifest.fetchAttempts ?? 3);
  const jinaFallback = manifest.jinaFallback !== false;
  const jinaApiKey = process.env.JINA_API_KEY || '';
  const cookieJar = makeCookieJar();
  const maxCommentaryFetches = Number(manifest.maxCommentaryFetches ?? 30);
  const maxExplanationChars = Number(manifest.maxExplanationChars ?? 6000);
  const allowedOrigins = Array.isArray(manifest.allowedOrigins) && manifest.allowedOrigins.length
    ? manifest.allowedOrigins
    : [OFFICIAL_ORIGIN];

  let commentaryFetches = 0;

  const recordFailure = (url, error, kind) => {
    const category = error?.category || errorCategory(error) || 'error';
    const key = `${kind}:${category}`;
    stats.failuresByCategory[key] = (stats.failuresByCategory[key] ?? 0) + 1;
    errors.push({ url, kind, category, message: String(error?.message ?? error) });
  };

  const addRow = ({ text, chapter, sourceUrl, topicIds, title, parentUrl, hadithText = '', hadithFullText = '', explanationText = '', explanationSourceUrl = '' }) => {
    const fullHadith = cleanText(hadithFullText);
    const explanation = cleanText(explanationText);
    // Keep the retrieval text free of repetitions: the short excerpt and the page
    // text are already contained in the full matn, so they are not appended again.
    const extra = cleanText(text);
    const fullKey = normalizeForDedupe(fullHadith);
    const extraKey = normalizeForDedupe(extra);
    const parts = [fullHadith, explanation];
    if (extraKey && extraKey !== fullKey && !(fullKey && fullKey.includes(extraKey))) parts.push(extra);
    const combined = cleanText(parts.filter(Boolean).join('\n\n'));
    if (!combined || combined.length < 35 || !hasArabic(combined)) return false;

    // One record per unique official matn: repeated results merge their doors
    // instead of flooding retrieval with the same hadith.
    const key = normalizeForDedupe(fullHadith || combined);
    const existing = rowsByMatnKey.get(key);
    if (existing) {
      const before = existing.topics.length;
      existing.topics = [...new Set([...existing.topics, ...topicIds])];
      if (existing.topics.length !== before) {
        existing.keywords = [...new Set([...existing.keywords, ...keywordSeeds(title || chapter || '', topicIds)])].slice(0, 24);
      }
      stats.duplicatesRemoved++;
      return false;
    }

    const row = {
      id: `alifta-html-${String(rows.length + 1).padStart(6, '0')}`,
      sourceId: manifest.sourceId,
      chapter: cleanText(chapter || title || 'جامع السنة'),
      citationStatus: 'verified-page',
      excerptType: 'literal',
      role: 'evidence',
      topics: [...new Set(topicIds)],
      keywords: keywordSeeds(title || chapter || '', topicIds),
      text: combined,
      // Choke point: whatever the caller passed, the stored short excerpt must be
      // grounded in the stored matn. Otherwise it is chapter/title metadata and
      // would be displayed as a hadith.
      ...(() => {
        const excerpt = cleanText(hadithText);
        if (!excerpt) return {};
        if (fullHadith && !isGroundedHadithExcerpt(excerpt, fullHadith)) return {};
        return { hadithText: excerpt };
      })(),
      ...(fullHadith ? { hadithFullText: fullHadith } : {}),
      ...(explanation ? { explanationText: explanation } : {}),
      // An explanation is only ever stored together with the exact official page it came from.
      ...(explanation && explanationSourceUrl ? { explanationSourceUrl } : {}),
      sourceUrl,
      htmlIngestion: {
        method: 'official-html',
        sourcePage: parentUrl || sourceUrl,
        fetchedAt: new Date().toISOString(),
      },
    };
    rowsByMatnKey.set(key, row);
    rows.push(row);
    stats.chunksGenerated = rows.length;
    return true;
  };

  const isAllowedOrigin = (url) => allowedOrigins.some((origin) => String(url).startsWith(origin));

  /** Prime the cookie jar exactly once, like a browser opening the site. */
  const primeCookies = async () => {
    if (cookieJar.header()) return;
    try {
      await fetchText(allowedOrigins[0], { cookieJar, attempts: 1, timeoutMs });
    } catch { /* cookies are an optimization, not a requirement */ }
  };

  for (const target of manifest.targets ?? []) {
    if (!isAllowedOrigin(target.url)) {
      errors.push({ url: target.url, kind: 'target', category: 'not-allowed-origin', message: 'target is not an allowed origin' });
      continue;
    }
    try {
      await primeCookies();
      let fetched = await fetchOfficial(target.url, {
        cookieJar, jinaFallback, jinaApiKey, timeoutMs, attempts,
        validate: (html) => (looksLikeUsefulArabicPage(html, 120) ? { ok: true, reason: '' } : { ok: false, reason: 'not-a-usable-official-page' }),
      });
      stats.fetchMethodCounts[fetched.method] = (stats.fetchMethodCounts[fetched.method] ?? 0) + 1;
      let links = target.kind === 'subject' ? extractSubjectLinks(fetched.text, target.url, maxSubjectResults, { allowedOrigins }) : [];

      // Hosted runners sometimes receive the shell without the result list; re-read the
      // same official page through the reader so its links become discoverable.
      if (target.kind === 'subject' && links.length < Math.max(8, Math.floor(maxSubjectResults * 0.7)) && jinaFallback) {
        try {
          const mirror = await fetchViaJina(target.url, { apiKey: jinaApiKey });
          const mirrorLinks = extractSubjectLinks(mirror.text, target.url, maxSubjectResults, { allowedOrigins });
          if (mirrorLinks.length > links.length) {
            fetched = { ...mirror, parentFetch: fetched };
            links = mirrorLinks;
          }
        } catch (error) {
          recordFailure(target.url, error, 'subject-fallback');
        }
      }

      if (target.kind === 'subject') {
        stats.subjectsProcessed++;
        stats.linksDiscovered += links.length;
        if (!links.length) throw new Error(`No official result links found on ${target.url}`);
        console.log(`Subject ${target.label}: discovered ${links.length} official detail links.`);

        const before = rows.length;
        for (const link of links) {
          stats.detailAttempted++;
          const detailUrl = link.url;
          try {
            const validate = (html) => validateDetailPage(html, { hint: link.title, url: detailUrl });
            const detail = await fetchOfficial(detailUrl, {
              referer: target.url, cookieJar, jinaFallback, jinaApiKey, timeoutMs, attempts, validate,
            });
            stats.fetchMethodCounts[detail.method] = (stats.fetchMethodCounts[detail.method] ?? 0) + 1;
            const verdict = validateDetailPage(detail.text, { hint: link.title, url: detailUrl });
            if (!verdict.ok) {
              const error = new Error(verdict.reason);
              error.category = `validation:${verdict.reason}`;
              throw error;
            }
            stats.detailSucceeded++;

            const { snippet } = parseResultTitle(link.title);
            const shortHadith = snippet || stripBookSuffix(link.title);
            const fullHadith = verdict.matn?.text ?? '';
            let explanationText = '';
            let explanationSourceUrl = '';

            // Optional official commentary: only stored when the official page really
            // returned commentary text for this hadith.
            if (commentaryFetches < maxCommentaryFetches) {
              for (const commentary of extractCommentaryLinks(detail.text, detailUrl, { allowedOrigins })) {
                if (commentaryFetches >= maxCommentaryFetches) break;
                if (!isAllowedOrigin(commentary.url)) continue;
                commentaryFetches++;
                stats.commentaryAttempted++;
                try {
                  const page = await fetchOfficial(commentary.url, {
                    referer: detailUrl, cookieJar, jinaFallback, jinaApiKey, timeoutMs, attempts,
                    validate: (html) => validateCommentaryPage(html, { url: commentary.url }),
                  });
                  stats.fetchMethodCounts[page.method] = (stats.fetchMethodCounts[page.method] ?? 0) + 1;
                  const commentaryVerdict = validateCommentaryPage(page.text, { url: commentary.url });
                  if (commentaryVerdict.ok) {
                    explanationText = truncateAtBoundary(commentaryVerdict.explanation, maxExplanationChars);
                    explanationSourceUrl = commentary.url;
                    stats.commentaryFound++;
                    break;
                  }
                  recordFailure(commentary.url, Object.assign(new Error(commentaryVerdict.reason), { category: `commentary:${commentaryVerdict.reason}` }), 'commentary');
                } catch (error) {
                  recordFailure(commentary.url, error, 'commentary');
                }
                await sleep(delay);
              }
            }

            addRow({
              text: fullHadith || shortHadith,
              hadithText: shortHadith,
              hadithFullText: fullHadith,
              explanationText,
              explanationSourceUrl,
              chapter: target.label,
              sourceUrl: detailUrl,
              topicIds: target.topicIds,
              title: shortHadith,
              parentUrl: target.url,
            });
            await sleep(detail.method === 'jina-reader-official-url' ? fallbackDelay : delay);
          } catch (error) {
            stats.detailRejected++;
            recordFailure(detailUrl, error, 'detail');
          }
        }
        ledger.push({ target: target.url, kind: target.kind, label: target.label, resultLinks: links.length, chunksAdded: rows.length - before, commentaryFetches });
      } else {
        const best = extractHadithAndExplanation(fetched.text, target.label, { maxExplanationChars });
        // Only a complete matn is published as hadithFullText. A short fragment is
        // dropped, and the page counts as evidence only if it still carries an
        // official explanation (always stored with its exact official URL).
        const fullMatn = best.fullHadithText && best.fullHadithText.length >= MIN_FULL_HADITH_CHARS ? best.fullHadithText : '';
        const explanation = best.explanationText ? truncateAtBoundary(best.explanationText, maxExplanationChars) : '';
        if (!fullMatn && !explanation) {
          const error = new Error('no-full-matn-or-explanation');
          error.category = 'page:no-full-matn-or-explanation';
          throw error;
        }
        const added = addRow({
          text: fullMatn || target.label,
          // `target.label` is sometimes a chapter/title, not a hadith excerpt.
          // Store it in the short-excerpt field only when it occurs verbatim in
          // the verified matn; otherwise keep it as chapter metadata only.
          hadithText: verifiedHadithExcerpt(target.label, fullMatn),
          hadithFullText: fullMatn,
          explanationText: explanation,
          explanationSourceUrl: explanation ? target.url : '',
          chapter: target.label, sourceUrl: target.url, topicIds: target.topicIds, title: target.label, parentUrl: target.url,
        });
        ledger.push({ target: target.url, kind: target.kind, label: target.label, resultLinks: 1, chunksAdded: added ? 1 : 0, commentaryFetches });
      }
    } catch (error) {
      recordFailure(target.url, error, 'target');
      ledger.push({ target: target.url, kind: target.kind, label: target.label, resultLinks: 0, chunksAdded: 0, error: error.message });
    }
  }

  const topicCounts = Object.fromEntries((manifest.requiredTopicIds ?? []).map((id) => [id, 0]));
  for (const row of rows) for (const t of row.topics) if (t in topicCounts) topicCounts[t]++;
  return { rows, topicCounts, ledger, errors, stats };
}

function printReport(stats, errors) {
  console.log('');
  console.log('── Al-Ifta ingestion report ─────────────────────────────');
  console.log(`subjects processed      : ${stats.subjectsProcessed}`);
  console.log(`links discovered        : ${stats.linksDiscovered}`);
  console.log(`detail pages attempted  : ${stats.detailAttempted}`);
  console.log(`detail pages succeeded  : ${stats.detailSucceeded}`);
  console.log(`detail pages rejected   : ${stats.detailRejected}`);
  console.log(`commentary attempted    : ${stats.commentaryAttempted}`);
  console.log(`commentary found        : ${stats.commentaryFound}`);
  console.log(`duplicates merged       : ${stats.duplicatesRemoved}`);
  console.log(`chunks generated        : ${stats.chunksGenerated}`);
  console.log(`fetch methods           : ${JSON.stringify(stats.fetchMethodCounts)}`);
  console.log(`failures by category    : ${JSON.stringify(stats.failuresByCategory)}`);
  if (errors.length) {
    console.log('first failures:');
    for (const error of errors.slice(0, 12)) console.log(`  - [${error.kind}/${error.category}] ${error.url} — ${error.message}`);
  }
  console.log('─────────────────────────────────────────────────────────');
}

/**
 * A run may only replace the committed corpus when it is a valid run.
 * Returning a reason instead of throwing keeps the decision testable and lets the
 * caller publish diagnostics without touching the corpus paths.
 */
function assessIngestion({ rowCount, topicCounts, minimum, minimumPerTopic, existingCount, allowShrink = false }) {
  if (rowCount < minimum) {
    return { ok: false, reason: `only ${rowCount} chunks produced; minimum is ${minimum}` };
  }
  const missingTopics = Object.entries(topicCounts).filter(([, count]) => count < minimumPerTopic);
  if (missingTopics.length) {
    return {
      ok: false,
      reason: `weak/missing topic coverage: ${missingTopics.map(([id, count]) => `${id}=${count}`).join(', ')}`,
    };
  }
  // Safety net: a partial crawl (site throttling, a changed page layout, a dropped
  // connection) must not silently replace a fuller committed corpus with less data.
  if (!allowShrink && existingCount >= minimum && rowCount < existingCount * CORPUS_SHRINK_FLOOR) {
    return {
      ok: false,
      reason: `run produced ${rowCount} chunks but the committed corpus holds ${existingCount} `
        + `(below the ${Math.round(CORPUS_SHRINK_FLOOR * 100)}% floor). `
        + 'Re-run with ALLOW_CORPUS_SHRINK=1 only after confirming the source really lost entries.',
    };
  }
  return { ok: true, reason: '' };
}

/** Chunk count of the currently committed corpus (0 when absent or unreadable). */
async function readExistingChunkCount(jsonPath) {
  try {
    const raw = await fs.readFile(jsonPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/** Temp-file + rename so an interrupted write cannot leave a half-written corpus. */
async function writeFileAtomic(target, contents) {
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, contents, 'utf8');
  await fs.rename(tmp, target);
}

/**
 * Diagnostics for a rejected run. The rejected corpus never lands on the app paths
 * (`src/lib/corpus/generated/*`), so the deployed/committed corpus stays usable.
 */
async function writeRejectedRun({ rows, topicCounts, ledger, errors, stats, manifest, reason, reportsDir = path.join(__dirname, 'reports') }) {
  await fs.mkdir(reportsDir, { recursive: true });
  await writeFileAtomic(
    path.join(reportsDir, 'last-run-corpus.json'),
    JSON.stringify(rows, null, 2) + '\n',
  );
  await writeFileAtomic(
    path.join(reportsDir, 'last-run-failure.json'),
    JSON.stringify({
      method: 'official-html', sourceId: manifest.sourceId, generatedAt: new Date().toISOString(),
      rejected: true, reason, totalChunks: rows.length, topicCounts, stats, ledger, errors,
    }, null, 2) + '\n',
  );
}

async function main() {
  const manifestPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  // Output locations are overridable only so the offline regression tests can run the
  // real CLI against a throwaway directory. Production runs use the committed paths.
  const outDir = process.env.ALIFTA_CORPUS_OUT_DIR
    ? path.resolve(process.env.ALIFTA_CORPUS_OUT_DIR)
    : path.join(root, 'src/lib/corpus/generated');
  const reportsDir = process.env.ALIFTA_REPORTS_DIR
    ? path.resolve(process.env.ALIFTA_REPORTS_DIR)
    : path.join(__dirname, 'reports');
  const jsonPath = path.join(outDir, 'alifta-html-chunks.json');
  const tsPath = path.join(outDir, 'alifta-html-chunks.ts');
  const ledgerPath = path.join(outDir, 'alifta-html-ledger.json');
  await fs.mkdir(outDir, { recursive: true });

  const { rows, topicCounts, ledger, errors, stats } = await ingest(manifest);
  const minimum = Number(manifest.minimumChunks ?? 100);
  const minimumPerTopic = Number(manifest.minimumChunksPerTopic ?? 3);
  const existingCount = await readExistingChunkCount(jsonPath);
  const allowShrink = /^(1|true|yes)$/i.test(String(process.env.ALLOW_CORPUS_SHRINK ?? ''));

  printReport(stats, errors);
  console.log(`Generated ${rows.length} Al-Ifta HTML chunks.`);
  console.log(`Fetcher: direct official HTML with Jina Reader fallback=${manifest.jinaFallback !== false ? 'enabled' : 'disabled'}${process.env.JINA_API_KEY ? ' (API key present)' : ' (no API key)'}.`);
  console.log(`Topic coverage: ${JSON.stringify(topicCounts)}`);

  const verdict = assessIngestion({
    rowCount: rows.length, topicCounts, minimum, minimumPerTopic, existingCount, allowShrink,
  });

  if (!verdict.ok) {
    await writeRejectedRun({ rows, topicCounts, ledger, errors, stats, manifest, reason: verdict.reason, reportsDir });
    console.error('');
    console.error(`FAIL: ${verdict.reason}`);
    console.error(`The committed corpus (${existingCount} chunks) was left untouched.`);
    console.error('A rejected run is written to scripts/alifta-html/reports/last-run-corpus.json for inspection.');
    process.exit(1);
  }

  await writeFileAtomic(jsonPath, JSON.stringify(rows, null, 2) + '\n');
  await writeFileAtomic(
    tsPath,
    '// AUTO-GENERATED by scripts/alifta-html/ingest.mjs — do not hand-edit.\n' +
    'import type { CorpusChunk } from "@/lib/types";\n\n' +
    `export const GENERATED_ALIFTA_HTML_CHUNKS: CorpusChunk[] = ${JSON.stringify(rows, null, 2)};\n`,
  );
  await writeFileAtomic(
    ledgerPath,
    JSON.stringify({
      method: 'official-html', sourceId: manifest.sourceId, generatedAt: new Date().toISOString(),
      totalChunks: rows.length, topicCounts, stats, ledger, errors,
    }, null, 2) + '\n',
  );

  console.log(`PASS: ${rows.length} chunks and all ${Object.keys(topicCounts).length} doors meet the ingestion threshold.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.stack || error); process.exit(1); });
}

export {
  cleanText,
  decodeEntities,
  toAbsoluteUrl,
  extractSubjectLinks,
  extractBestPassage,
  extractHadithAndExplanation,
  extractMatnFromPage,
  extractExplanationFromServicePage,
  stripBookSuffix,
  parseResultTitle,
  verifiedHadithExcerpt,
  isGroundedHadithExcerpt,
  extractCommentaryLinks,
  validateDetailPage,
  validateCommentaryPage,
  looksLikeUsefulAliftaDetail,
  normalizeForDedupe,
  tokenOverlapRatio,
  splitMatnAndCommentary,
  truncateAtBoundary,
  errorCategory,
  assessIngestion,
  ingest,
};
