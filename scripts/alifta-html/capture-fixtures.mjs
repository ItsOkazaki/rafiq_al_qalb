#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Live capture + diagnostics for the official Al-Ifta encyclopedia.
//
// This does NOT generate corpus data. It saves the raw HTML of a handful of real
// official pages (one subject/search page, a few individual hadith pages, and an
// official service/commentary page) plus a machine-readable report, so that:
//
//   1. the offline regression tests can run against the site's real DOM shape, and
//   2. failures such as "every detail page returns HTTP 500" can be diagnosed with
//      evidence instead of guesses.
//
// Run:  npm run alifta:capture            (writes scripts/alifta-html/fixtures/live)
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const outDir = path.join(__dirname, 'fixtures', 'live');
const fixtureDir = path.join(__dirname, 'fixtures');

const BASE = 'https://sunna.alifta.gov.sa/';

/**
 * Pages that are also committed as permanent offline regression fixtures, so
 * `npm run alifta:test` exercises the extractor against the site's real DOM
 * shape without any network access.
 */
const COMMITTED_FIXTURES = {
  'https://sunna.alifta.gov.sa/Search/ViewSubjectHits?subjectId=33772': 'subject-tawba.html',
  'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=8804': 'detail-bukhari-8804.html',
  'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=5507': 'detail-bukhari-5507.html',
  'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=10&mainId=31978': 'detail-ibn-hibban-31978.html',
  'https://sunna.alifta.gov.sa/MatnService/HadithServiceData?serviceId=6&mainId=8804&inx=0': 'service-fath-al-bari-8804.html',
};

/** Individual (detail) pages — the only pages that carry a full hadith matn. */
const DETAIL_PAGES = [
  'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=8804',
  'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=5507',
  'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=2&mainId=19902',
  'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=10&mainId=31978',
];

/** Subject/search pages — result lists, never treated as full hadiths. */
const SUBJECT_PAGES = [
  'https://sunna.alifta.gov.sa/Search/ViewSubjectHits?subjectId=33772',
  'https://sunna.alifta.gov.sa/Search/ViewSubjectHits?subjectId=10996',
  'https://sunna.alifta.gov.sa/Search/ViewSubjectHits?subjectId=31033',
  'https://sunna.alifta.gov.sa/Search/ViewSubjectHits?subjectId=33942',
];

/** Official service (commentary) pages. */
const SERVICE_PAGES = [
  'https://sunna.alifta.gov.sa/MatnService/HadithServiceData?serviceId=6&mainId=8804&inx=0',
  'https://sunna.alifta.gov.sa/MatnService/HadithServiceData?serviceId=6&mainId=5507&inx=0',
];

const BROWSER_HEADERS = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'ar-SA,ar;q=0.9,en;q=0.6',
};

async function capture(url, { timeoutMs = 25000, cookie = '' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const headers = { ...BROWSER_HEADERS };
    if (cookie) headers.cookie = cookie;
    const res = await fetch(url, { headers, redirect: 'follow', signal: controller.signal });
    const text = await res.text();
    const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    return {
      url,
      requestedUrl: url,
      status: res.status,
      ok: res.ok,
      finalUrl: res.url,
      bytes: text.length,
      ms: Date.now() - started,
      contentType: res.headers.get('content-type') || '',
      setCookie,
      text,
      error: null,
    };
  } catch (error) {
    return {
      url,
      requestedUrl: url,
      status: 0,
      ok: false,
      finalUrl: url,
      bytes: 0,
      ms: Date.now() - started,
      contentType: '',
      setCookie: [],
      text: '',
      error: `${error.name}: ${error.message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

function slug(url) {
  const u = new URL(url);
  const qs = [...u.searchParams.entries()].map(([k, v]) => `${k}-${v}`).join('_');
  return `${u.pathname.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}${qs ? `__${qs}` : ''}`.slice(0, 120);
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const report = { capturedAt: new Date().toISOString(), node: process.version, base: BASE, pages: [], diagnostics: [] };

  // Seed the cookie jar with the site root first, like a browser would.
  const home = await capture(BASE);
  const cookie = home.setCookie.map((c) => String(c).split(';', 1)[0]).join('; ');
  report.pages.push({ kind: 'home', url: BASE, status: home.status, bytes: home.bytes, ms: home.ms, setCookie: home.setCookie, error: home.error });
  console.log(`home ${home.status} bytes=${home.bytes} cookies=${home.setCookie.length}`);

  const groups = [
    ['subject', SUBJECT_PAGES],
    ['detail', DETAIL_PAGES],
    ['service', SERVICE_PAGES],
  ];

  for (const [kind, urls] of groups) {
    for (const url of urls) {
      const res = await capture(url, { cookie });
      const entry = { kind, url, status: res.status, finalUrl: res.finalUrl, bytes: res.bytes, ms: res.ms, contentType: res.contentType, setCookie: res.setCookie, error: res.error };
      report.pages.push(entry);
      if (res.text) {
        const file = path.join(outDir, `${kind}--${slug(url)}.html`);
        await fs.writeFile(file, res.text, 'utf8');
        entry.file = path.relative(root, file);
        const committed = COMMITTED_FIXTURES[url];
        if (committed) {
          await fs.mkdir(fixtureDir, { recursive: true });
          await fs.writeFile(path.join(fixtureDir, committed), res.text, 'utf8');
          entry.fixture = `scripts/alifta-html/fixtures/${committed}`;
        }
        entry.title = (res.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
        entry.mainIdMatches = (res.text.match(/mainId=\d+/gi) || []).length;
      }
      console.log(`${kind} ${res.status} bytes=${res.bytes} ms=${res.ms} ${url}`);
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // Diagnostic: the exact bug that broke the previous ingestion. An href copied
  // straight out of the subject HTML still contains &amp; — fetching it verbatim
  // asks Al-Ifta for a page without mainId.
  const escaped = 'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&amp;mainId=8804';
  const escapedRes = await capture(escaped);
  report.diagnostics.push({
    case: 'html-escaped-href-fetched-verbatim',
    url: escaped,
    status: escapedRes.status,
    bytes: escapedRes.bytes,
    error: escapedRes.error,
    expectation: 'must NOT be fetched verbatim; entities are decoded to ?bookId=1&mainId=8804 first',
  });
  console.log(`diagnostic html-escaped ${escapedRes.status} bytes=${escapedRes.bytes}`);

  const decoded = 'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=8804';
  const decodedRes = await capture(decoded);
  report.diagnostics.push({
    case: 'decoded-href',
    url: decoded,
    status: decodedRes.status,
    bytes: decodedRes.bytes,
    error: decodedRes.error,
    expectation: 'HTTP 200 with the individual hadith page',
  });
  console.log(`diagnostic decoded ${decodedRes.status} bytes=${decodedRes.bytes}`);

  // Arabic query parameter round-trip (the subject tree uses jumpTo=<Arabic>).
  const arabic = 'https://sunna.alifta.gov.sa/Subjects/ViewSubjectLevel?ParentId=33766&IsLeaf=False&jumpTo=' + encodeURIComponent('التوبة من الذنوب');
  const arabicRes = await capture(arabic);
  report.diagnostics.push({
    case: 'arabic-query-parameter',
    url: arabic,
    status: arabicRes.status,
    bytes: arabicRes.bytes,
    error: arabicRes.error,
    expectation: 'percent-encoded Arabic query parameters are accepted by the official site',
  });
  console.log(`diagnostic arabic-query ${arabicRes.status} bytes=${arabicRes.bytes}`);

  const reportPath = path.join(outDir, 'capture-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${report.pages.length} captures + ${report.diagnostics.length} diagnostics to ${path.relative(root, reportPath)}`);

  const failed = report.pages.filter((p) => p.kind !== 'home' && p.status !== 200);
  if (failed.length) {
    for (const f of failed) console.error(`NON-200 ${f.status} ${f.url} ${f.error ?? ''}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
