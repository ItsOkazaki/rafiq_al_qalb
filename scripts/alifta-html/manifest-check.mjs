#!/usr/bin/env node
// Manifest guard: the ingestion must only ever target the official Al-Ifta site,
// and the quality thresholds may not be silently lowered.
import fs from 'node:fs/promises';

const OFFICIAL = 'https://sunna.alifta.gov.sa/';
const m = JSON.parse(await fs.readFile('scripts/alifta-html/manifest.json', 'utf8'));

if (m.sourceId !== 'alifta-sunna-encyclopedia') throw new Error(`FAIL: wrong sourceId: ${m.sourceId}`);
if (m.baseUrl !== OFFICIAL) throw new Error('FAIL: wrong Al-Ifta base URL');
if (!Array.isArray(m.targets) || m.targets.length < 8) throw new Error('FAIL: insufficient official targets');

const topics = new Set(m.requiredTopicIds);
if (topics.size !== 12) throw new Error(`FAIL: expected 12 topics, got ${topics.size}`);
for (const t of m.targets) {
  if (!t.url.startsWith(OFFICIAL)) throw new Error(`FAIL: target is not official: ${t.url}`);
  if (!Array.isArray(t.topicIds) || !t.topicIds.length) throw new Error(`FAIL: target has no doors: ${t.url}`);
  if (!t.topicIds.every((id) => topics.has(id))) throw new Error(`FAIL: target has unknown topic: ${t.url}`);
}

// The crawler may only fetch the official origin. A test harness can point
// allowedOrigins at a local mirror, but the committed manifest never may.
if (m.allowedOrigins !== undefined) {
  if (!Array.isArray(m.allowedOrigins) || m.allowedOrigins.length !== 1 || m.allowedOrigins[0] !== OFFICIAL) {
    throw new Error(`FAIL: manifest allowedOrigins must be exactly [${OFFICIAL}]`);
  }
}

if (Number(m.minimumChunks) < 100) throw new Error(`FAIL: minimumChunks must stay >= 100, got ${m.minimumChunks}`);
if (Number(m.minimumChunksPerTopic) < 3) throw new Error(`FAIL: minimumChunksPerTopic must stay >= 3, got ${m.minimumChunksPerTopic}`);
if (Number(m.maxSubjectResults) < 28) throw new Error(`FAIL: maxSubjectResults must stay >= 28, got ${m.maxSubjectResults}`);
if (Number(m.fetchAttempts) < 1) throw new Error('FAIL: fetchAttempts must be >= 1');

console.log(`PASS: ${m.targets.length} official Al-Ifta HTML targets configured for all ${topics.size} doors.`);
console.log(`PASS: quality thresholds intact (minimumChunks=${m.minimumChunks}, minimumChunksPerTopic=${m.minimumChunksPerTopic}).`);
