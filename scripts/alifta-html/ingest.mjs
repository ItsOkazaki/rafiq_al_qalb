#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

function decodeEntities(input) {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script[\\s\\S]*?<\/script>/gi, ' ')
      .replace(/<style[\\s\\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\\s\\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\\s\\S]*?<\/svg>/gi, ' ')
      .replace(/<img[^>]*>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|div|section|article|main|header|footer|li|h[1-6]|tr|td|th)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\u00a0/g, ' '),
  );
}

function cleanText(raw) {
  let text = stripTags(raw)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

function normalizeForDedupe(text) {
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

const BOOK_SUFFIXES = [
  "صحيح البخاري", "صحيح مسلم", "سنن أبي داود", "سنن الترمذي", "سنن النسائي",
  "سنن ابن ماجه", "موطأ مالك", "صحيح ابن حبان", "صحيح ابن خزيمة",
  "المستدرك على الصحيحين", "مسند أحمد", "الأحاديث المختارة", "المنتقى",
  "السنن الكبرى", "مسند أبي يعلى الموصلي", "مصنف ابن أبي شيبة",
  "مصنف عبد الرزاق", "فتح الباري", "عمدة القاري", "شرح النووي على مسلم",
];

function stripBookSuffix(title) {
  let value = cleanText(title).replace(/^\d+\s*-\s*/, "").trim();
  const match = BOOK_SUFFIXES.find((suffix) => value.endsWith(suffix));
  if (match) value = value.slice(0, -match.length).trim();
  return value.replace(/[،,:;]+$/u, "").trim();
}

function extractHadithNumber(title) {
  const m = cleanText(title).match(/^(\d{1,5})\s*-/);
  return m?.[1] ?? "";
}

function looksLikeUsefulArabicPage(raw, minimumChars = 80) {
  const text = cleanText(extractMainHtml(raw));
  if (text.length < minimumChars || !hasArabic(text)) return false;
  if (/\b(Just a moment|Access Denied|Request Rejected|Enable JavaScript)\b/i.test(text)) return false;
  return true;
}

function looksLikeUsefulAliftaDetail(raw, shortHint = "") {
  if (!looksLikeUsefulArabicPage(raw, 80)) return false;
  const text = normalizeForDedupe(cleanText(extractMainHtml(raw)));
  const hint = normalizeForDedupe(stripBookSuffix(shortHint));
  if (hint.length >= 24 && text.includes(hint.slice(0, Math.min(hint.length, 90)))) return true;
  if (/\b\d{1,5}\s*-\s*/.test(text) && /(تحليل الحديث|المتن|حديث|باب)/.test(text)) return true;
  return false;
}

function extractHadithAndExplanation(pageHtml, shortHint = "") {
  const full = cleanText(extractMainHtml(pageHtml));
  const hint = stripBookSuffix(shortHint);
  const number = extractHadithNumber(shortHint);
  if (!full) return { fullHadithText: "", explanationText: "" };

  const starts = [];
  if (number) {
    const re = new RegExp(`(?:^|\\s)${number}\\s*-\\s+`, "g");
    for (const m of full.matchAll(re)) starts.push(m.index + (m[0].startsWith(" ") ? 1 : 0));
  }
  if (!starts.length) {
    const at = hint ? full.indexOf(hint) : -1;
    if (at >= 0) starts.push(Math.max(0, at - 80));
  }

  let hadithStart = starts[0] ?? 0;
  let hadithEnd = -1;
  if (starts.length > 1 && starts[1] > hadithStart + 120) {
    hadithEnd = starts[1];
  }

  const markers = [
    /مطابقته للترجمة/, /مُطَابَقَتُهُ لِلتَّرْجَمَةِ/, /ذكر معناه/, /ذِكر معناه/,
    /قَوْلُهُ\s*:/, /قوله\s*:/, /ذكر رجاله/, /ذِكر رجاله/, /ذكر لطائف إسناده/,
    /ذكر تعدد موضعه/, /ما يستفاد منه/, /ذكر ما يستفاد منه/,
  ];
  // If there was no duplicate numbered hadith, locate the first commentary marker
  // after the hadith itself and use it as the boundary between matn and explanation.
  if (hadithEnd < 0) {
    for (const marker of markers) {
      const re = new RegExp(marker.source, marker.flags.replace("g", ""));
      const tail = full.slice(hadithStart + 80);
      const m = tail.match(re);
      if (m) {
        const candidate = hadithStart + 80 + (m.index ?? 0);
        if (candidate > hadithStart + 120 && (hadithEnd < 0 || candidate < hadithEnd)) hadithEnd = candidate;
      }
    }
  }
  if (hadithEnd < 0) {
    const analysisAt = full.search(/(?:تحليل الحديث|الرواة|الأعلام والأماكن)\b/);
    if (analysisAt > hadithStart + 80) hadithEnd = analysisAt;
  }
  if (hadithEnd < 0) hadithEnd = Math.min(full.length, hadithStart + 4500);

  const firstBlock = cleanText(full.slice(hadithStart, hadithEnd));
  const postHadith = full.slice(hadithEnd);

  let explanationAt = -1;
  for (const marker of markers) {
    const re = new RegExp(marker.source, marker.flags.replace("g", ""));
    const m = postHadith.match(re);
    if (m && (explanationAt < 0 || m.index < explanationAt)) explanationAt = m.index;
  }

  let explanationText = "";
  if (explanationAt >= 0) {
    explanationText = cleanText(postHadith.slice(explanationAt));
    explanationText = explanationText
      .replace(/(?:تحليل الحديث|الرواة|الأعلام والأماكن)[\s\S]*$/i, "")
      .trim();
  }

  return {
    fullHadithText: firstBlock.replace(/^\d{1,5}\s*-\s*/, "").trim(),
    explanationText,
  };
}

function extractCommentaryLinks(pageHtml, baseUrl) {
  const found = [];
  const seen = new Set();
  const add = (href, title) => {
    const url = toAbsoluteUrl(href, baseUrl);
    if (!url || !url.startsWith("https://sunna.alifta.gov.sa/")) return;
    if (!/(BookToc\/ViewServicePage|MatnService\/HadithServiceData)/i.test(url)) return;
    const label = cleanText(title);
    const likely = /شرح|فتح الباري|عمدة القاري|النووي|التوضيح|تحفة الأحوذي|عون المعبود/i.test(label);
    if (!likely) return;
    if (seen.has(url)) return;
    seen.add(url);
    found.push({ url, title: label });
  };
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(pageHtml))) add(m[1], m[2]);
  const md = /\[([^\]]+)\]\((https:\/\/sunna\.alifta\.gov\.sa\/[^)]+)\)/gi;
  while ((m = md.exec(pageHtml))) add(m[2], m[1]);
  return found.slice(0, 3);
}

function toAbsoluteUrl(href, baseUrl) {
  try { return new URL(href, baseUrl).toString(); } catch { return null; }
}

function extractSubjectLinks(html, baseUrl, maxResults) {
  const found = [];
  const seen = new Set();
  const add = (href, rawTitle) => {
    const url = toAbsoluteUrl(href, baseUrl);
    if (!url || !url.startsWith('https://sunna.alifta.gov.sa/')) return;
    if (!/(BookToc\/ViewMatnPage|MatnService\/HadithServiceData|BookToc\/ViewServicePage)/i.test(url)) return;
    const title = cleanText(rawTitle).replace(/^\d+\s*-\s*/, '').trim();
    if (!title || !hasArabic(title)) return;
    const key = `${url}|${normalizeForDedupe(title)}`;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ url, title });
  };

  const htmlRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = htmlRe.exec(html)) && found.length < maxResults * 3) add(match[1], match[2]);

  // Jina Reader fallback returns Markdown rather than raw HTML. Keep the same
  // official Al-Ifta URLs and parse Markdown links when fallback is used.
  if (found.length < maxResults) {
    const mdRe = /\[([^\]]+)\]\((https:\/\/sunna\.alifta\.gov\.sa\/[^)]+)\)/gi;
    while ((match = mdRe.exec(html)) && found.length < maxResults * 3) add(match[2], match[1]);
  }

  return found.slice(0, maxResults);
}

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

function extractBestPassage(pageHtml, hintTitle) {
  const main = extractMainHtml(pageHtml);
  const text = cleanText(main);
  const compactHint = cleanText(hintTitle).replace(/^\d+\s*-\s*/, '').slice(0, 140);
  if (!text) return { text: '', chapter: '' };

  // Prefer a window around the exact official result text. This normally captures the
  // hadith matn and its surrounding book/chapter context without importing the whole page UI.
  const at = compactHint ? text.indexOf(compactHint) : -1;
  let window = at >= 0 ? text.slice(Math.max(0, at - 180), Math.min(text.length, at + 2600)) : text.slice(0, 2600);

  const lines = window.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const useful = lines.filter((line) => hasArabic(line) && line.length >= 30);
  if (useful.length) window = useful.slice(0, 8).join('\n');
  const chapter = (lines.find((line) => /^باب\s/.test(line)) || lines.find((line) => /باب/.test(line))) ?? '';
  return { text: cleanText(window), chapter };
}

function keywordSeeds(title, topics) {
  const words = cleanText(title).split(/\s+/).filter((w) => w.length >= 4);
  return [...new Set([...words.slice(0, 10), ...topics])].slice(0, 16);
}

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

async function fetchText(url, { timeoutMs = 9000, attempts = 1, referer = '', cookieJar = null } = {}) {
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
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return { text: await res.text(), method: 'direct-official-html', finalUrl: res.url || url, status: res.status };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(900 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

async function fetchViaJina(url, { timeoutMs = 30000, apiKey = '' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    accept: 'text/plain,text/markdown;q=0.9,*/*;q=0.8',
  };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  try {
    const proxyUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(proxyUrl, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`Jina HTTP ${res.status} for ${url}`);
    const text = await res.text();
    if (!text.trim()) throw new Error(`Jina returned empty content for ${url}`);
    return { text, method: 'jina-reader-official-url', finalUrl: url, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOfficial(url, { referer = "", cookieJar, jinaFallback = true, jinaApiKey = "", validate, directTimeoutMs = 9000, directAttempts = 1 } = {}) {
  try {
    const direct = await fetchText(url, { referer, cookieJar, timeoutMs: directTimeoutMs, attempts: directAttempts });
    if (!validate || validate(direct.text)) return direct;
    throw new Error("direct response was not usable Arabic source HTML");
  } catch (directError) {
    if (!jinaFallback) throw directError;
    const fallback = await fetchViaJina(url, { apiKey: jinaApiKey });
    if (validate && !validate(fallback.text)) {
      throw new Error(`${directError.message}; Jina returned unusable source content`);
    }
    return { ...fallback, directError: directError.message };
  }
}

async function sleep(ms) { if (ms > 0) await new Promise((r) => setTimeout(r, ms)); }

async function ingest(manifest) {
  const rows = [];
  const seen = new Set();
  const errors = [];
  const ledger = [];
  const maxSubjectResults = Number(manifest.maxSubjectResults ?? 28);
  const delay = Number(manifest.requestDelayMs ?? 120);
  const fallbackDelay = Number(manifest.fallbackDelayMs ?? 3200);
  const jinaFallback = manifest.jinaFallback !== false;
  const jinaApiKey = process.env.JINA_API_KEY || "";
  const cookieJar = makeCookieJar();
  let commentaryFetches = 0;
  const maxCommentaryFetches = Number(manifest.maxCommentaryFetches ?? 24);

  const addRow = ({ text, chapter, sourceUrl, topicIds, title, parentUrl, hadithText = "", hadithFullText = "", explanationText = "", explanationSourceUrl = "" }) => {
    const combined = cleanText([hadithFullText, explanationText, text].filter(Boolean).join("\n\n"));
    if (!combined || combined.length < 35 || !hasArabic(combined)) return false;
    const key = normalizeForDedupe(combined);
    if (seen.has(key)) return false;
    seen.add(key);
    rows.push({
      id: `alifta-html-${String(rows.length + 1).padStart(6, "0")}`,
      sourceId: manifest.sourceId,
      chapter: cleanText(chapter || title || "جامع السنة"),
      citationStatus: "verified-page",
      excerptType: "literal",
      role: "evidence",
      topics: [...new Set(topicIds)],
      keywords: keywordSeeds(title || chapter || "", topicIds),
      text: combined,
      ...(hadithText ? { hadithText: cleanText(hadithText) } : {}),
      ...(hadithFullText ? { hadithFullText: cleanText(hadithFullText) } : {}),
      ...(explanationText ? { explanationText: cleanText(explanationText) } : {}),
      ...(explanationSourceUrl ? { explanationSourceUrl } : {}),
      sourceUrl,
      htmlIngestion: {
        method: "official-html",
        sourcePage: parentUrl || sourceUrl,
        fetchedAt: new Date().toISOString(),
      },
    });
    return true;
  };

  for (const target of manifest.targets ?? []) {
    try {
      let fetched = await fetchOfficial(target.url, {
        cookieJar, jinaFallback, jinaApiKey,
        validate: (html) => hasArabic(cleanText(html)),
        directTimeoutMs: 9000, directAttempts: 1,
      });
      let links = target.kind === "subject" ? extractSubjectLinks(fetched.text, manifest.baseUrl, maxSubjectResults) : [];

      // Some hosted requests receive valid HTML without the result links (edge/client rendering).
      // In that case explicitly fetch the same official page through Jina Reader so its Markdown links become discoverable.
      if (target.kind === "subject" && links.length < Math.max(8, Math.floor(maxSubjectResults * 0.7)) && jinaFallback) {
        try {
          const mirror = await fetchViaJina(target.url, { apiKey: jinaApiKey });
          const mirrorLinks = extractSubjectLinks(mirror.text, manifest.baseUrl, maxSubjectResults);
          if (mirrorLinks.length > links.length) {
            fetched = { ...mirror, parentFetch: fetched };
            links = mirrorLinks;
          }
        } catch (error) {
          errors.push(`${target.url}: subject link fallback failed: ${error.message}`);
        }
      }

      if (!links.length && target.kind === "subject") throw new Error(`No official result links found on ${target.url}`);
      if (target.kind === "subject") console.log(`Subject ${target.label}: discovered ${links.length} official detail links.`);

      if (target.kind === "subject") {
        const before = rows.length;
        for (const link of links) {
          try {
            const detail = await fetchOfficial(link.url, {
              referer: target.url, cookieJar, jinaFallback, jinaApiKey,
              validate: (html) => looksLikeUsefulAliftaDetail(html, link.title),
              directTimeoutMs: 9000, directAttempts: 1,
            });
            const detailParts = extractHadithAndExplanation(detail.text, link.title);
            let explanationText = detailParts.explanationText;
            let explanationSourceUrl = "";

            // Detail pages may expose official service/commentary links. When one is found,
            // fetch a small number of those pages and attach only their source-grounded explanation.
            if (!explanationText && commentaryFetches < maxCommentaryFetches) {
              const commentaryLinks = extractCommentaryLinks(detail.text, link.url);
              for (const commentary of commentaryLinks) {
                if (commentaryFetches >= maxCommentaryFetches) break;
                commentaryFetches++;
                try {
                  const commentaryPage = await fetchOfficial(commentary.url, {
                    referer: link.url, cookieJar, jinaFallback, jinaApiKey,
                    validate: (html) => looksLikeUsefulArabicPage(html, 120),
                    directTimeoutMs: 9000, directAttempts: 1,
                  });
                  const commentaryParts = extractHadithAndExplanation(commentaryPage.text, link.title);
                  if (commentaryParts.explanationText) {
                    explanationText = commentaryParts.explanationText;
                    explanationSourceUrl = commentary.url;
                    break;
                  }
                } catch (error) {
                  errors.push(`${commentary.url}: commentary fetch failed: ${error.message}`);
                }
                await sleep(fallbackDelay);
              }
            }

            const shortHadith = stripBookSuffix(link.title);
            const added = addRow({
              text: detailParts.explanationText || detailParts.fullHadithText || shortHadith,
              hadithText: shortHadith,
              hadithFullText: detailParts.fullHadithText,
              explanationText,
              explanationSourceUrl,
              chapter: target.label,
              sourceUrl: link.url,
              topicIds: target.topicIds,
              title: shortHadith,
              parentUrl: target.url,
            });
            if (!added) throw new Error("official detail content was fetched but produced no usable Arabic evidence");

            await sleep(detail.method === "jina-reader-official-url" ? fallbackDelay : delay);
          } catch (error) {
            errors.push(`${link.url}: ${error.message}`);
          }
        }
        ledger.push({ target: target.url, kind: target.kind, resultLinks: links.length, chunksAdded: rows.length - before, fetchMode: "direct-or-jina-fallback", commentaryFetches });
      } else {
        const best = extractHadithAndExplanation(fetched.text, target.label);
        const added = addRow({
          text: best.explanationText || best.fullHadithText || target.label,
          hadithText: stripBookSuffix(target.label),
          hadithFullText: best.fullHadithText,
          explanationText: best.explanationText,
          explanationSourceUrl: best.explanationText ? target.url : "",
          chapter: target.label, sourceUrl: target.url, topicIds: target.topicIds, title: target.label, parentUrl: target.url,
        });
        ledger.push({ target: target.url, kind: target.kind, resultLinks: 1, chunksAdded: added ? 1 : 0, fetchMode: "direct-or-jina-fallback", commentaryFetches });
      }
    } catch (error) {
      errors.push(`${target.url}: ${error.message}`);
      ledger.push({ target: target.url, kind: target.kind, resultLinks: 0, chunksAdded: 0, error: error.message });
    }
  }

  const topicCounts = Object.fromEntries((manifest.requiredTopicIds ?? []).map((id) => [id, 0]));
  for (const row of rows) for (const t of row.topics) if (t in topicCounts) topicCounts[t]++;
  return { rows, topicCounts, ledger, errors };
}

async function main() {
  const manifestPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const outDir = path.join(root, 'src/lib/corpus/generated');
  const jsonPath = path.join(outDir, 'alifta-html-chunks.json');
  const tsPath = path.join(outDir, 'alifta-html-chunks.ts');
  const ledgerPath = path.join(outDir, 'alifta-html-ledger.json');
  await fs.mkdir(outDir, { recursive: true });

  const result = await ingest(manifest);
  const { rows, topicCounts, ledger, errors } = result;
  const minimum = Number(manifest.minimumChunks ?? 100);
  const minPerTopic = Number(manifest.minimumChunksPerTopic ?? 3);
  const missingTopics = Object.entries(topicCounts).filter(([, count]) => count < minPerTopic);

  await fs.writeFile(jsonPath, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  await fs.writeFile(
    tsPath,
    '// AUTO-GENERATED by scripts/alifta-html/ingest.mjs — do not hand-edit.\n' +
    'import type { CorpusChunk } from "@/lib/types";\n\n' +
    `export const GENERATED_ALIFTA_HTML_CHUNKS: CorpusChunk[] = ${JSON.stringify(rows, null, 2)};\n`,
    'utf8',
  );
  await fs.writeFile(ledgerPath, JSON.stringify({ method: 'official-html', sourceId: manifest.sourceId, totalChunks: rows.length, topicCounts, ledger, errors }, null, 2) + '\n', 'utf8');

  console.log(`Generated ${rows.length} Al-Ifta HTML chunks.`);
  const jinaApiKey = process.env.JINA_API_KEY || '';
  console.log(`Fetcher: direct official HTML with Jina Reader fallback=${manifest.jinaFallback !== false ? "enabled" : "disabled"}${process.env.JINA_API_KEY ? " (API key present)" : " (no API key)"}.`);
  console.log(`Topic coverage: ${JSON.stringify(topicCounts)}`);
  if (errors.length) {
    console.error(`Recoverable fetch errors: ${errors.length}`);
    console.error('First fetch errors:');
    for (const error of errors.slice(0, 10)) console.error(`  - ${error}`);
  }
  if (rows.length < minimum) throw new Error(`Only ${rows.length} chunks produced; minimum is ${minimum}.`);
  if (missingTopics.length) throw new Error(`Weak/missing topic coverage: ${missingTopics.map(([id, count]) => `${id}=${count}`).join(', ')}`);
  console.log(`PASS: ${rows.length} chunks and all 12 doors meet the ingestion threshold.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.stack || error); process.exit(1); });
}

export { cleanText, extractSubjectLinks, extractBestPassage, extractHadithAndExplanation, stripBookSuffix, extractCommentaryLinks, ingest };
