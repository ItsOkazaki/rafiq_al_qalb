#!/usr/bin/env node
import fs from 'node:fs/promises';

const m = JSON.parse(await fs.readFile('scripts/alifta-html/manifest.json','utf8'));
let failures = 0;
for (const target of m.targets) {
  try {
    const res = await fetch(target.url, { redirect: 'follow', headers: { 'user-agent': 'Rafiq-AlQulub-Alifta-Live-Check/1.0', accept: 'text/html,application/xhtml+xml' } });
    const text = await res.text();
    const ok = res.ok && text.length > 200 && /sunna\.alifta\.gov\.sa/i.test(res.url || target.url);
    console.log(`${ok ? 'PASS' : 'FAIL'} ${res.status} ${target.kind} ${target.url}`);
    if (!ok) failures++;
  } catch (error) {
    failures++;
    console.log(`FAIL network ${target.url} ${error.message}`);
  }
}
if (failures) process.exit(1);
console.log(`PASS: ${m.targets.length} official Al-Ifta targets are reachable.`);
