import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanText, extractSubjectLinks } from './ingest.mjs';

const fixture = await fs.readFile(path.join(process.cwd(), 'scripts/alifta-html/test-fixture.html'), 'utf8');
const links = extractSubjectLinks(fixture, 'https://sunna.alifta.gov.sa/', 30);
if (links.length !== 1) throw new Error(`expected 1 official result link, got ${links.length}`);
if (!links[0].url.startsWith('https://sunna.alifta.gov.sa/')) throw new Error('fixture produced non-official URL');
if (!cleanText('<p>اختبار&nbsp; نظيف</p>').includes('اختبار نظيف')) throw new Error('HTML cleaning failed');
console.log('PASS: direct HTML extractor fixture');
