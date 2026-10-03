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

function toAbsoluteUrl(href, baseUrl) {
  try { return new URL(href, baseUrl).toString(); } catch { return null; }
}

function extractSubjectLinks(html, baseUrl, maxResults) {
  const found = [];
  const seen = new Set();
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) && found.length < maxResults * 3) {
    const url = toAbsoluteUrl(match[1], baseUrl);
    if (!url || !url.startsWith('https://sunna.alifta.gov.sa/')) continue;
    if (!/(BookToc\/ViewMatnPage|MatnService\/HadithServiceData|BookToc\/ViewServicePage)/i.test(url)) continue;
    const title = cleanText(match[2]).replace(/^\d+\s*-\s*/, '');
    if (!title || !hasArabic(title)) continue;
    const key = `${url}|${normalizeForDedupe(title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ url, title });
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

async function fetchText(url, timeoutMs = 25000, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          'user-agent': 'Rafiq-AlQulub-Alifta-Ingest/1.0 (+official-source-ingestion)',
          'accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(300 * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

async function sleep(ms) { if (ms > 0) await new Promise((r) => setTimeout(r, ms)); }

async function ingest(manifest) {
  const rows = [];
  const seen = new Set();
  const errors = [];
  const ledger = [];
  const maxSubjectResults = Number(manifest.maxSubjectResults ?? 30);
  const delay = Number(manifest.requestDelayMs ?? 120);

  const addRow = ({ text, chapter, sourceUrl, topicIds, title, parentUrl }) => {
    const cleaned = cleanText(text);
    if (!cleaned || cleaned.length < 35 || !hasArabic(cleaned)) return;
    const key = normalizeForDedupe(cleaned);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      id: `alifta-html-${String(rows.length + 1).padStart(6, '0')}`,
      sourceId: manifest.sourceId,
      chapter: cleanText(chapter || title || 'جامع السنة'),
      citationStatus: 'verified-page',
      excerptType: 'literal',
      role: 'evidence',
      topics: [...new Set(topicIds)],
      keywords: keywordSeeds(title || chapter || '', topicIds),
      text: cleaned,
      sourceUrl,
      htmlIngestion: {
        method: 'official-html',
        sourcePage: parentUrl || sourceUrl,
        fetchedAt: new Date().toISOString(),
      },
    });
  };

  for (const target of manifest.targets ?? []) {
    try {
      const html = await fetchText(target.url);
      if (!html.includes('sunna.alifta.gov.sa') && !target.url.startsWith('https://sunna.alifta.gov.sa/')) {
        throw new Error('non-official host');
      }
      if (target.kind === 'subject') {
        const links = extractSubjectLinks(html, manifest.baseUrl, maxSubjectResults);
        if (!links.length) throw new Error(`No official result links found on ${target.url}`);
        const before = rows.length;
        for (const link of links) {
          try {
            const page = await fetchText(link.url);
            const best = extractBestPassage(page, link.title);
            addRow({
              text: best.text || link.title,
              chapter: best.chapter || target.label,
              sourceUrl: link.url,
              topicIds: target.topicIds,
              title: link.title,
              parentUrl: target.url,
            });
          } catch (error) {
            errors.push(`${link.url}: ${error.message}`);
            // Do not promote a search-result title/summary to evidence if the official
            // detail page failed. The minimum-evidence gate below must remain honest.
          }
          await sleep(delay);
        }
        ledger.push({ target: target.url, kind: target.kind, resultLinks: links.length, chunksAdded: rows.length - before });
      } else {
        const best = extractBestPassage(html, target.label);
        addRow({ text: best.text || target.label, chapter: best.chapter || target.label, sourceUrl: target.url, topicIds: target.topicIds, title: target.label, parentUrl: target.url });
        ledger.push({ target: target.url, kind: target.kind, resultLinks: 1, chunksAdded: 1 });
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
  console.log(`Topic coverage: ${JSON.stringify(topicCounts)}`);
  if (errors.length) console.error(`Recoverable fetch errors: ${errors.length}`);
  if (rows.length < minimum) throw new Error(`Only ${rows.length} chunks produced; minimum is ${minimum}.`);
  if (missingTopics.length) throw new Error(`Weak/missing topic coverage: ${missingTopics.map(([id, count]) => `${id}=${count}`).join(', ')}`);
  console.log(`PASS: ${rows.length} chunks and all 12 doors meet the ingestion threshold.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.stack || error); process.exit(1); });
}

export { cleanText, extractSubjectLinks, extractBestPassage, ingest };
