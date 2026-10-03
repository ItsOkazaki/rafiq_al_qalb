#!/usr/bin/env node
import fs from 'node:fs/promises';

const m = JSON.parse(await fs.readFile('scripts/alifta-html/manifest.json','utf8'));
if (m.baseUrl !== 'https://sunna.alifta.gov.sa/') throw new Error('FAIL: wrong Al-Ifta base URL');
if (!Array.isArray(m.targets) || m.targets.length < 8) throw new Error('FAIL: insufficient official targets');
const topics = new Set(m.requiredTopicIds);
if (topics.size !== 12) throw new Error(`FAIL: expected 12 topics, got ${topics.size}`);
for (const t of m.targets) {
  if (!t.url.startsWith(m.baseUrl)) throw new Error(`FAIL: target is not official: ${t.url}`);
  if (!Array.isArray(t.topicIds) || !t.topicIds.every((id) => topics.has(id))) throw new Error(`FAIL: target has unknown topic: ${t.url}`);
}
console.log(`PASS: ${m.targets.length} official Al-Ifta HTML targets configured for all ${topics.size} doors.`);
