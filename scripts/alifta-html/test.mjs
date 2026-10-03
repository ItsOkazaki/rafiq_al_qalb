#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Offline regression tests for the Al-Ifta crawler.
//
// No network access is required: the fixtures in scripts/alifta-html/fixtures
// reproduce the real DOM shape of sunna.alifta.gov.sa (subject page, individual
// hadith page, official service/commentary page, error page). The end-to-end test
// at the bottom serves those fixtures over 127.0.0.1 and runs the real ingest()
// pipeline against them, so link discovery, validation, extraction, commentary
// handling, de-duplication and the failure counters are all exercised.
//
// Run: npm run alifta:test
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanText,
  decodeEntities,
  toAbsoluteUrl,
  extractSubjectLinks,
  extractHadithAndExplanation,
  extractMatnFromPage,
  extractExplanationFromServicePage,
  extractCommentaryLinks,
  parseResultTitle,
  stripBookSuffix,
  validateDetailPage,
  validateCommentaryPage,
  normalizeForDedupe,
  errorCategory,
  MIN_FULL_HADITH_CHARS,
  ingest,
} from './ingest.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OFFLINE = path.join(__dirname, 'fixtures', 'offline');
const read = (file) => fs.readFile(path.join(__dirname, file), 'utf8');
const readOffline = (file) => fs.readFile(path.join(OFFLINE, file), 'utf8');
/** Pages captured verbatim from the live official site (npm run alifta:capture). */
const readFixture = (file) => fs.readFile(path.join(__dirname, 'fixtures', file), 'utf8');

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') return result.then(() => { passed++; console.log(`PASS ${name}`); }, (error) => { failures.push([name, error]); console.error(`FAIL ${name}: ${error.message}`); });
    passed++;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push([name, error]);
    console.error(`FAIL ${name}: ${error.message}`);
  }
  return Promise.resolve();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * The official pages sometimes order combining marks differently (ن + shadda + fatha
 * vs ن + fatha + shadda). Compare diacritic-insensitively so the assertions test the
 * text, not the byte order of tashkeel.
 */
function hasNorm(haystack, needle) {
  return normalizeForDedupe(haystack).includes(normalizeForDedupe(needle));
}

function eq(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
}

const OFFICIAL = 'https://sunna.alifta.gov.sa/';
const DETAIL_ESCAPED = 'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&amp;mainId=5507';
const DETAIL_PLAIN = 'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=5507';

const runs = [];

// ── TASK 2: entity decoding is general, not an &amp; special case ────────────
runs.push(test('decodeEntities handles named, decimal, hex, unterminated and doubled entities', () => {
  eq(decodeEntities('?bookId=1&amp;mainId=5507'), '?bookId=1&mainId=5507', '&amp;');
  eq(decodeEntities('?bookId=1&AMP;mainId=5507'), '?bookId=1&mainId=5507', 'case-insensitive &AMP;');
  eq(decodeEntities('?bookId=1&amp;amp;mainId=5507'), '?bookId=1&mainId=5507', 'doubly escaped');
  eq(decodeEntities('?bookId=1&amp mainId=5507'), '?bookId=1& mainId=5507', 'unterminated legacy form');
  // Per the HTML rule an unterminated entity followed by an alphanumeric is left
  // alone, so a legitimate parameter called "ampersand" is never corrupted.
  eq(decodeEntities('?flag=1&ampersand=2'), '?flag=1&ampersand=2', 'unknown entity left intact');
  eq(decodeEntities('q=&quot;قيمة&quot;'), 'q="قيمة"', '&quot;');
  eq(decodeEntities("q=&#39;قيمة&#39;"), "q='قيمة'", '&#39;');
  eq(decodeEntities("q=&#x27;قيمة&#x27;"), "q='قيمة'", '&#x27;');
  eq(decodeEntities('a=1&#38;b=2'), 'a=1&b=2', 'decimal &#38;');
  eq(decodeEntities('a&nbsp;b'), 'a\u00a0b', '&nbsp;');
  // Unknown entities and look-alike words must survive untouched.
  eq(decodeEntities('لا يوجد كيانات هنا'), 'لا يوجد كيانات هنا', 'plain Arabic untouched');
}));

runs.push(test('toAbsoluteUrl decodes the escaped Al-Ifta href before it is fetched', () => {
  eq(toAbsoluteUrl(DETAIL_ESCAPED, OFFICIAL), DETAIL_PLAIN, 'absolute escaped href');
  eq(toAbsoluteUrl('/BookToc/ViewMatnPage?bookId=1&amp;mainId=5507', OFFICIAL), DETAIL_PLAIN, 'relative escaped href');
  eq(toAbsoluteUrl('  /BookToc/ViewMatnPage?bookId=1&amp;mainId=5507\n', OFFICIAL), DETAIL_PLAIN, 'whitespace/newlines stripped');
  eq(toAbsoluteUrl('/BookToc/ViewMatnPage?bookId=1&amp;mainId=8804', 'https://sunna.alifta.gov.sa/Search/ViewSubjectHits?subjectId=33772'),
    'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=8804', 'resolved against the subject page');
}));

runs.push(test('toAbsoluteUrl keeps Arabic query parameters intact and never double-encodes', () => {
  const arabic = toAbsoluteUrl('/Subjects/ViewSubjectLevel?ParentId=33766&IsLeaf=False&jumpTo=التوبة من الذنوب', OFFICIAL);
  const url = new URL(arabic);
  eq(url.searchParams.get('jumpTo'), 'التوبة من الذنوب', 'Arabic value survives normalization');
  assert(/jumpTo=%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9/.test(arabic), `Arabic value must be percent-encoded on the wire: ${arabic}`);

  const alreadyEncoded = toAbsoluteUrl('/Subjects/ViewSubjectLevel?jumpTo=%D8%A7%D9%84%D8%AA%D9%88%D8%A8%D8%A9', OFFICIAL);
  eq(new URL(alreadyEncoded).searchParams.get('jumpTo'), 'التوبة', 'pre-encoded value is not double-encoded');
  assert(!alreadyEncoded.includes('%25'), `must not double-encode percent signs: ${alreadyEncoded}`);
}));

runs.push(test('toAbsoluteUrl rejects non-HTTP and fragment-only hrefs', () => {
  eq(toAbsoluteUrl('javascript:void(0)', OFFICIAL), null, 'javascript:');
  eq(toAbsoluteUrl('#', OFFICIAL), null, 'bare fragment');
  eq(toAbsoluteUrl('/BookToc/ViewMatnPage?bookId=1&mainId=8804#', OFFICIAL), 'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=8804#', 'fragment on a real URL is kept');
  eq(toAbsoluteUrl('', OFFICIAL), null, 'empty href');
  eq(toAbsoluteUrl(null, OFFICIAL), null, 'null href');
}));

// ── Result titles: the ordinal is not a hadith number ────────────────────────
runs.push(test('parseResultTitle splits ordinal, excerpt and book from the real result shape', () => {
  const parsed = parseResultTitle('5 - <br /> لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ<br /><br /> صحيح البخاري');
  eq(parsed.ordinal, '5', 'ordinal');
  eq(parsed.snippet, 'لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ', 'excerpt without the book suffix');
  eq(parsed.book, 'صحيح البخاري', 'book name');

  const inline = parseResultTitle('1 - كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ صحيح البخاري');
  eq(inline.snippet, 'كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ', 'inline shape');
  eq(stripBookSuffix('3470 - حَدِيثٌ طَوِيلٌ صحيح مسلم'), 'حَدِيثٌ طَوِيلٌ', 'stripBookSuffix');
}));

// ── Link discovery on the real subject-page shape ────────────────────────────
runs.push(test('extractSubjectLinks finds individual detail links and drops non-detail routes', async () => {
  const html = await readOffline('subject-tawba.html');
  const links = extractSubjectLinks(html, OFFICIAL, 10);
  eq(links.length, 5, 'five official result links');
  assert(links.every((l) => /ViewMatnPage/.test(l.url)), 'only ViewMatnPage routes');
  assert(links.every((l) => !l.url.includes('&amp;')), 'no HTML entities survive into the URL');
  const first = links.find((l) => l.url.includes('mainId=5507'));
  assert(first, 'mainId=5507 link discovered');
  eq(first.url, 'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=5507', 'decoded URL for mainId=5507');
  eq(first.title, 'كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ قَتَلَ تِسْعَةً وَتِسْعِينَ إِنْسَانًا', 'short excerpt kept as the title');
  assert(!links.some((l) => /ViewSubjectLevel|TextSearchView|IndexMatnBooks/.test(l.url)), 'navigation links rejected');
}));

runs.push(test('extractSubjectLinks respects maxResults and de-duplicates', async () => {
  const html = await readOffline('subject-tawba.html');
  eq(extractSubjectLinks(html, OFFICIAL, 2).length, 2, 'maxResults honoured');
  const duplicated = html + html;
  eq(extractSubjectLinks(duplicated, OFFICIAL, 20).length, 5, 'duplicate anchors collapsed');
}));

runs.push(test('extractSubjectLinks still parses the reader Markdown fallback', () => {
  const markdown = '[1 - حديث التوبة](https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=5507)';
  const links = extractSubjectLinks(markdown, OFFICIAL, 30);
  eq(links.length, 1, 'one markdown link');
  eq(links[0].title, 'حديث التوبة', 'markdown title');
}));

// ── TASK 5: the FULL matn, from the individual page, without duplication ─────
runs.push(test('extractMatnFromPage returns the complete matn, not the search excerpt', async () => {
  const html = await readOffline('detail-bukhari-5507.html');
  const matn = extractMatnFromPage(cleanText(html), 'كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ قَتَلَ تِسْعَةً وَتِسْعِينَ إِنْسَانًا');
  eq(matn.number, '3470', 'hadith number taken from the page, not the result ordinal');
  assert(matn.text.startsWith('حَدَّثَنَا مُحَمَّدُ بْنُ بَشَّارٍ'), 'isnad kept');
  assert(matn.text.includes('فَأَدْرَكَهُ الْمَوْتُ فَنَاءَ بِصَدْرِهِ نَحْوَهَا'), 'middle of the matn kept');
  assert(matn.text.trim().endsWith('فَغُفِرَ لَهُ .'), 'end of the matn kept');
  eq(matn.text.split('كَانَ فِي بَنِي إِسْرَائِيلَ').length - 1, 1, 'the duplicated rendering is collapsed to one copy');
  assert(matn.text.length > 700, `full matn expected, got ${matn.text.length} chars`);
  assert(!matn.text.includes('تحليل الحديث'), 'page chrome excluded');
}));

runs.push(test('extractMatnFromPage keeps the whole matn for mainId=8804', async () => {
  const html = await readOffline('detail-bukhari-8804.html');
  const matn = extractMatnFromPage(cleanText(html), 'لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ');
  eq(matn.number, '5673', 'hadith number from the page');
  assert(matn.text.includes('فَسَدِّدُوا وَقَارِبُوا'), 'rest of the matn kept');
  assert(matn.text.trim().endsWith('فَلَعَلَّهُ أَنْ يَسْتَعْتِبَ .'), 'ends with the real closing');
  eq(matn.text.split('لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ').length - 1, 1, 'single copy only');
}));

runs.push(test('Arabic diacritics and punctuation survive text cleaning', async () => {
  const html = await readOffline('detail-bukhari-8804.html');
  const matn = extractMatnFromPage(cleanText(html), 'لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ');
  assert(/[\u064B-\u065F]/.test(matn.text), 'tashkeel preserved');
  assert(matn.text.includes('،'), 'Arabic comma preserved');
  assert(matn.text.includes('؟'), 'Arabic question mark preserved');
}));

// ── TASK 3: only the requested individual page counts as evidence ────────────
runs.push(test('validateDetailPage accepts the requested page and rejects impostors', async () => {
  const good = await readOffline('detail-bukhari-8804.html');
  const ok = validateDetailPage(good, { hint: 'لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ', url: `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=8804` });
  eq(ok.ok, true, 'real detail page accepted');

  eq(validateDetailPage('', { url: `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=8804` }).reason, 'empty-response', 'empty page rejected');
  const errorPage = await readOffline('server-error.html');
  assert(validateDetailPage(errorPage, { url: `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=9999` }).ok === false, 'server error page rejected');
  const wrongId = validateDetailPage(good, { hint: 'لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ', url: `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=7777` });
  eq(wrongId.ok, false, 'page that does not reference the requested mainId rejected');
  assert(wrongId.reason.includes('mainId-7777'), `reason names the mismatch: ${wrongId.reason}`);

  const mismatched = validateDetailPage(good, { hint: 'لَا يَزْنِي الزَّانِي حِينَ يَزْنِي وَهُوَ مُؤْمِنٌ', url: `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=8804` });
  eq(mismatched.ok, false, 'page whose matn is not the searched excerpt rejected');
  eq(mismatched.reason, 'matn-does-not-match-result-excerpt', 'reason recorded');
}));

runs.push(test('validateDetailPage rejects block/CDN interstitial pages', () => {
  const block = '<html><body><h1>Just a moment...</h1><p>Enable JavaScript and cookies to continue</p></body></html>';
  eq(validateDetailPage(block, { url: `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=8804` }).ok, false, 'interstitial rejected');
}));

// ── TASK 6: commentary discovery on image-only service anchors ───────────────
runs.push(test('extractCommentaryLinks finds image-only service anchors and ranks «شرح» first', async () => {
  const html = await readOffline('detail-bukhari-8804.html');
  const url = `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=8804`;
  const links = extractCommentaryLinks(html, url);
  assert(links.length >= 1, 'at least one commentary candidate');
  eq(links[0].url, `${OFFICIAL}MatnService/HadithServiceData?serviceId=6&mainId=8804&inx=0`, 'official sharh service first, entities decoded');
  assert(links.every((l) => !l.url.includes('&amp;')), 'no entities in commentary URLs');

  const noSharh = await readOffline('detail-no-commentary-4242.html');
  const derived = extractCommentaryLinks(noSharh, `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=4242`);
  eq(derived.length, 1, 'derived serviceId=6 candidate when the service bar has no sharh entry');
  eq(derived[0].url, `${OFFICIAL}MatnService/HadithServiceData?serviceId=6&mainId=4242&inx=0`, 'derived URL');
}));

runs.push(test('extractExplanationFromServicePage returns the commentator text without the matn', async () => {
  const html = await readOffline('service-fath-al-bari-8804.html');
  const explanation = extractExplanationFromServicePage(html);
  assert(explanation.includes('قَوْلُهُ'), 'commentary marker kept');
  assert(explanation.includes('هُوَ أَبُو عُبَيْدٍ مَوْلَى ابْنِ أَزْهَرَ'), 'commentary body kept');
  assert(!explanation.includes('حَدَّثَنَا أَبُو الْيَمَانِ'), 'repeated matn excluded from the explanation');
  assert(!explanation.includes('تحليل الحديث'), 'analysis tree excluded');
  eq(validateCommentaryPage(html, { url: `${OFFICIAL}MatnService/HadithServiceData?serviceId=6&mainId=8804&inx=0` }).ok, true, 'validated as commentary');
}));

runs.push(test('validateCommentaryPage rejects a plain hadith page', async () => {
  const html = await readOffline('detail-bukhari-8804.html');
  eq(validateCommentaryPage(html, { url: `${OFFICIAL}MatnService/HadithServiceData?serviceId=6&mainId=8804&inx=0` }).ok, false, 'matn page is not commentary');
}));

runs.push(test('no explanation is invented when the page carries none', async () => {
  const html = await readOffline('detail-no-commentary-4242.html');
  const parts = extractHadithAndExplanation(html, '7 - <br /> حَدِيثٌ بِلَا شَرْحٍ<br /><br /> صحيح البخاري');
  eq(parts.explanationText, '', 'explanationText stays empty');
  assert(parts.fullHadithText.length > 100, 'full matn still extracted');
}));

runs.push(test('errorCategory distinguishes recoverable from fatal failures', () => {
  eq(errorCategory(new Error('HTTP 500 for https://x')), 'http-500', 'http-500');
  eq(errorCategory(new Error('HTTP 404 for https://x')), 'http-404', 'http-404');
  eq(errorCategory(Object.assign(new Error('x'), { name: 'AbortError' })), 'timeout', 'abort → timeout');
  eq(errorCategory(new Error('fetch failed: ENOTFOUND')), 'network', 'DNS → network');
}));

// ── Legacy fixtures kept from the previous suite ─────────────────────────────
runs.push(test('legacy fixture: subject + detail extraction still works', async () => {
  const fixture = await read('test-fixture.html');
  eq(extractSubjectLinks(fixture, OFFICIAL, 30).length, 1, 'one link');
  assert(cleanText('<p>اختبار&nbsp; نظيف</p>').includes('اختبار نظيف'), 'HTML cleaning');
  const escapedLinks = extractSubjectLinks(`<a href="${DETAIL_ESCAPED}">3470 - كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ صحيح البخاري</a>`, OFFICIAL, 30);
  eq(escapedLinks.length, 1, 'escaped link extracted');
  eq(escapedLinks[0].url, DETAIL_PLAIN, 'entity decoded');

  const detailFixture = await read('test-detail-fixture.html');
  const parts = extractHadithAndExplanation(detailFixture, '3470 - كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ قَتَلَ تِسْعَةً وَتِسْعِينَ إِنْسَانًا صحيح البخاري');
  assert(parts.fullHadithText.includes('كَانَ فِي بَنِي إِسْرَائِيلَ'), 'hadith extracted');
  assert(parts.explanationText.includes('قَوْلُهُ'), 'explanation extracted');
}));

// ── End-to-end: the real ingest() pipeline over a local mirror ───────────────
const ROUTES = (mainId, pathname) => {
  if (pathname.endsWith('/Search/ViewSubjectHits')) return { file: 'subject-tawba.html', status: 200 };
  if (pathname.endsWith('/BookToc/ViewMatnPage')) {
    if (mainId === '9999') return { file: 'server-error.html', status: 500 };
    if (mainId === '19902') return { status: 404 };
    const files = { '8804': 'detail-bukhari-8804.html', '5507': 'detail-bukhari-5507.html', '4242': 'detail-no-commentary-4242.html' };
    return files[mainId] ? { file: files[mainId], status: 200 } : { status: 404 };
  }
  if (pathname.endsWith('/MatnService/HadithServiceData')) {
    return mainId === '8804' ? { file: 'service-fath-al-bari-8804.html', status: 200 } : { status: 404 };
  }
  return { status: 404 };
};

runs.push(test('ingest() end-to-end: discovers, fetches, validates, extracts and counts', async () => {
  const cache = new Map();
  for (const file of ['subject-tawba.html', 'detail-bukhari-8804.html', 'detail-bukhari-5507.html', 'detail-no-commentary-4242.html', 'service-fath-al-bari-8804.html', 'server-error.html']) {
    cache.set(file, await readOffline(file));
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const route = ROUTES(url.searchParams.get('mainId'), url.pathname);
    res.writeHead(route.status, { 'content-type': 'text/html; charset=utf-8' });
    res.end(route.file ? cache.get(route.file) : '<html><body>Not Found</body></html>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}/`;

  try {
    const manifest = {
      sourceId: 'alifta-sunna-encyclopedia',
      baseUrl: origin,
      allowedOrigins: [origin],
      maxSubjectResults: 10,
      requestDelayMs: 0,
      fallbackDelayMs: 0,
      timeoutMs: 5000,
      fetchAttempts: 2,
      jinaFallback: false,
      maxCommentaryFetches: 5,
      minimumChunks: 3,
      minimumChunksPerTopic: 1,
      requiredTopicIds: ['al-tawba', 'athar-al-dhunub'],
      targets: [{
        kind: 'subject',
        url: `${origin}Search/ViewSubjectHits?subjectId=33772`,
        label: 'التوبة من الذنوب',
        topicIds: ['al-tawba', 'athar-al-dhunub'],
      }],
    };

    const { rows, topicCounts, stats, errors } = await ingest(manifest);

    eq(stats.linksDiscovered, 5, 'links discovered');
    eq(stats.detailAttempted, 5, 'detail pages attempted');
    eq(stats.detailSucceeded, 3, 'detail pages succeeded');
    eq(stats.detailRejected, 2, 'detail pages rejected (404 + 500)');
    eq(stats.commentaryFound, 1, 'one official commentary found');
    eq(rows.length, 3, 'three evidence chunks');
    eq(topicCounts['al-tawba'], 3, 'topic coverage counted');
    assert(stats.failuresByCategory['detail:http-404'] === 1, `404 counted: ${JSON.stringify(stats.failuresByCategory)}`);
    assert(stats.failuresByCategory['detail:http-500'] === 1, `500 counted: ${JSON.stringify(stats.failuresByCategory)}`);

    // Every stored record is an individual official page, never the subject page.
    for (const row of rows) {
      assert(row.sourceUrl.includes('ViewMatnPage'), `sourceUrl is an individual page: ${row.sourceUrl}`);
      assert(!row.sourceUrl.includes('ViewSubjectHits'), 'subject page never stored as evidence');
      assert(row.hadithText && row.hadithFullText, `hadith fields present on ${row.id}`);
      assert(row.hadithFullText.length > row.hadithText.length, `full matn is longer than the excerpt on ${row.id}`);
      assert(row.role === 'evidence' && row.excerptType === 'literal', 'role/excerptType');
      assert(row.htmlIngestion?.method === 'official-html', 'provenance');
      if (row.explanationText) assert(row.explanationSourceUrl, 'explanation always carries its official URL');
    }

    const withSharh = rows.find((r) => r.sourceUrl.includes('mainId=8804'));
    assert(withSharh?.explanationText?.includes('قَوْلُهُ'), 'official explanation attached to mainId=8804');
    eq(withSharh.explanationSourceUrl, `${origin}MatnService/HadithServiceData?serviceId=6&mainId=8804&inx=0`, 'exact commentary URL');

    const withoutSharh = rows.find((r) => r.sourceUrl.includes('mainId=4242'));
    eq(withoutSharh.explanationText, undefined, 'no fabricated explanation when the service page is missing');
    eq(withoutSharh.explanationSourceUrl, undefined, 'no commentary URL without commentary');

    assert(errors.every((e) => e.url && e.category), 'every failure carries url + category');
    assert(normalizeForDedupe(withSharh.hadithFullText).includes(normalizeForDedupe('فَسَدِّدُوا وَقَارِبُوا')), 'full matn stored');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}));

runs.push(test('ingest() merges duplicate hadiths instead of duplicating them', async () => {
  const html = await readOffline('subject-tawba.html');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const mainId = url.searchParams.get('mainId');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    if (url.pathname.endsWith('/Search/ViewSubjectHits')) return res.end(html);
    if (url.pathname.endsWith('/BookToc/ViewMatnPage')) {
      const file = mainId === '5507' ? 'detail-bukhari-5507.html' : 'detail-bukhari-8804.html';
      return readOffline(file).then((body) => res.end(body));
    }
    return res.end('<html><body>Not Found</body></html>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}/`;
  try {
    const target = (topicIds, url) => ({ kind: 'subject', url: `${origin}${url}`, label: 'موضوع', topicIds });
    const manifest = {
      sourceId: 'alifta-sunna-encyclopedia', baseUrl: origin, allowedOrigins: [origin],
      maxSubjectResults: 10, requestDelayMs: 0, fallbackDelayMs: 0, timeoutMs: 5000, fetchAttempts: 1,
      jinaFallback: false, maxCommentaryFetches: 0, requiredTopicIds: ['al-tawba', 'qaswat-al-qalb'],
      targets: [target(['al-tawba'], 'Search/ViewSubjectHits?subjectId=1'), target(['qaswat-al-qalb'], 'Search/ViewSubjectHits?subjectId=2')],
    };
    const { rows, stats, topicCounts } = await ingest(manifest);
    eq(rows.length, 2, 'the two distinct hadiths are stored once each, not twice');
    eq(stats.duplicatesRemoved, 2, 'duplicate results merged');
    eq(topicCounts['al-tawba'], 2, 'doors from the first subject');
    eq(topicCounts['qaswat-al-qalb'], 2, 'doors merged into the same records');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}));

// ── Regression tests on pages captured verbatim from the live official site ───
// These guard the failure that produced 4 chunks: the site keeps hidden panels
// (note modal, analysis tree) BEFORE the hadith frame in the DOM, so a scanner
// that stops at the first piece of chrome extracts nothing at all.
runs.push(test('live subject page: individual links discovered with entities decoded', async () => {
  const links = extractSubjectLinks(await readFixture('subject-tawba.html'), OFFICIAL, 40);
  assert(links.length >= 28, `expected >=28 results, got ${links.length}`);
  assert(links.every((l) => !l.url.includes('&amp;')), 'no HTML entities survive into the URL');
  assert(links.every((l) => /^https:\/\/sunna\.alifta\.gov\.sa\/BookToc\/ViewMatnPage\?/.test(l.url)), 'individual matn pages only');
  const target = links.find((l) => l.url === 'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=8804');
  assert(target, 'mainId=8804 discovered from the real subject page');
  eq(normalizeForDedupe(target.title), normalizeForDedupe('لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ'), 'short excerpt kept as the result title');
}));

runs.push(test('live detail page mainId=8804: full matn 5673, single copy, no truncation', async () => {
  const html = await readFixture('detail-bukhari-8804.html');
  const url = 'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=8804';
  const verdict = validateDetailPage(html, { hint: 'لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ', url });
  eq(verdict.ok, true, 'accepted as the requested page');
  const matn = verdict.matn;
  eq(matn.number, '5673', 'hadith number read from the page');
  assert(normalizeForDedupe(matn.text).startsWith(normalizeForDedupe('حَدَّثَنَا أَبُو الْيَمَانِ')), 'isnad kept');
  assert(hasNorm(matn.text, 'فَسَدِّدُوا وَقَارِبُوا'), 'middle of the matn kept');
  assert(normalizeForDedupe(matn.text.trim()).endsWith(normalizeForDedupe('فَلَعَلَّهُ أَنْ يَسْتَعْتِبَ')), 'matn not truncated');
  eq(normalizeForDedupe(matn.text).split(normalizeForDedupe('لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ')).length - 1, 1, "site's duplicate rendering collapsed");
  assert(matn.text.length > 'لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ'.length * 4, 'full matn, not the search excerpt');
  assert(!matn.text.includes('تحليل الحديث') && !matn.text.includes('إضافة تعليق'), 'page chrome excluded');
}));

runs.push(test('live detail page mainId=5507: the complete hadith 3470, not the search snippet', async () => {
  const html = await readFixture('detail-bukhari-5507.html');
  const url = 'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=1&mainId=5507';
  const hint = 'كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ قَتَلَ تِسْعَةً وَتِسْعِينَ إِنْسَانًا';
  const verdict = validateDetailPage(html, { hint, url });
  eq(verdict.ok, true, 'accepted as the requested page');
  eq(verdict.matn.number, '3470', 'hadith number read from the page');
  assert(hasNorm(verdict.matn.text, 'كَانَ فِي بَنِي إِسْرَائِيلَ رَجُلٌ قَتَلَ تِسْعَةً وَتِسْعِينَ إِنْسَانًا'), 'the search excerpt is inside the full matn');
  assert(hasNorm(verdict.matn.text, 'فَأَدْرَكَهُ الْمَوْتُ فَنَاءَ بِصَدْرِهِ نَحْوَهَا'), 'continuation kept');
  assert(hasNorm(verdict.matn.text, 'فَاخْتَصَمَتْ فِيهِ مَلَائِكَةُ الرَّحْمَةِ وَمَلَائِكَةُ الْعَذَابِ'), 'rest of the matn kept');
  assert(normalizeForDedupe(verdict.matn.text.trim()).endsWith(normalizeForDedupe('فَغُفِرَ لَهُ')), 'matn not truncated');
  assert(verdict.matn.text.length > hint.length * 2, `full matn (${verdict.matn.text.length}) far exceeds the snippet (${hint.length})`);
}));

runs.push(test('live detail page mainId=31978: Ibn Hibban matn 930 extracted whole', async () => {
  const html = await readFixture('detail-ibn-hibban-31978.html');
  const url = 'https://sunna.alifta.gov.sa/BookToc/ViewMatnPage?bookId=10&mainId=31978';
  const verdict = validateDetailPage(html, { url });
  eq(verdict.ok, true, 'accepted');
  eq(verdict.matn.number, '930', 'hadith number read from the page');
  assert(verdict.matn.text.length > 400, `full matn expected, got ${verdict.matn.text.length}`);
}));

runs.push(test('live detail pages expose the official sharh service as the first commentary candidate', async () => {
  for (const mainId of ['5507', '8804']) {
    const html = await readFixture(`detail-bukhari-${mainId}.html`);
    const links = extractCommentaryLinks(html, `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=${mainId}`);
    assert(links.length >= 1, `commentary candidate for mainId=${mainId}`);
    eq(links[0].url, `${OFFICIAL}MatnService/HadithServiceData?serviceId=6&mainId=${mainId}&inx=0`, 'serviceId=6 first');
  }
}));

runs.push(test('live service page: official Fath al-Bari explanation, matn excluded', async () => {
  const html = await readFixture('service-fath-al-bari-8804.html');
  const url = `${OFFICIAL}MatnService/HadithServiceData?serviceId=6&mainId=8804&inx=0`;
  const verdict = validateCommentaryPage(html, { url });
  eq(verdict.ok, true, 'validated as official commentary');
  assert(hasNorm(verdict.explanation, 'قَوْلُهُ'), 'commentary markers kept');
  assert(hasNorm(verdict.explanation, 'هُوَ أَبُو عُبَيْدٍ مَوْلَى ابْنِ أَزْهَرَ'), 'commentary body kept');
  assert(!hasNorm(verdict.explanation, 'حَدَّثَنَا أَبُو الْيَمَانِ'), 'repeated matn excluded');
  assert(verdict.explanation.length > 1000, `substantial official explanation, got ${verdict.explanation.length}`);
}));

runs.push(test('live detail page rejects a request for a different mainId', async () => {
  const html = await readFixture('detail-bukhari-8804.html');
  const verdict = validateDetailPage(html, { hint: 'لَنْ يُدْخِلَ أَحَدًا عَمَلُهُ الْجَنَّةَ', url: `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=12345` });
  eq(verdict.ok, false, 'rejected');
  assert(verdict.reason.includes('mainId-12345'), `reason names the mismatch: ${verdict.reason}`);
}));

runs.push(test('a fragment is refused instead of being published as the complete matn', async () => {
  const html = await readOffline('detail-short-matn-777.html');
  const url = `${OFFICIAL}BookToc/ViewMatnPage?bookId=1&mainId=777`;
  const verdict = validateDetailPage(html, { hint: '', url });
  eq(verdict.ok, false, 'rejected');
  eq(verdict.reason, 'matn-too-short', `reason: ${verdict.reason}`);
  const lenient = validateDetailPage(html, { hint: '', url, minMatnChars: 10 });
  eq(lenient.ok, true, 'same page validates when a fragment is explicitly allowed');
  assert(lenient.matn.text.length < MIN_FULL_HADITH_CHARS, `fixture really is a fragment (${lenient.matn.text.length})`);
}));

runs.push(test('crawler and corpus verifier agree on the minimum length of a full matn', async () => {
  const verifySrc = await read('verify.mjs');
  const match = verifySrc.match(/hadithFullText\.length < (\d+)/);
  assert(match, 'verify.mjs states a minimum matn length');
  eq(MIN_FULL_HADITH_CHARS, Number(match[1]), 'crawler minimum === verifier minimum');
}));

await Promise.all(runs);

console.log('');
if (failures.length) {
  console.error(`FAILED ${failures.length}/${passed + failures.length} Al-Ifta crawler tests:`);
  for (const [name, error] of failures) console.error(`  - ${name}: ${error.message}`);
  process.exit(1);
}
console.log(`PASS: ${passed} Al-Ifta crawler regression tests (offline, real DOM fixtures).`);
