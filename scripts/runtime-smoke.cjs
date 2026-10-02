const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const srcRoot = path.join(root, 'src');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const candidate = path.join(srcRoot, request.slice(2));
    for (const ext of ['.ts', '.tsx', '.js']) {
      if (fs.existsSync(candidate + ext)) return candidate + ext;
    }
    if (fs.existsSync(path.join(candidate, 'index.ts'))) return path.join(candidate, 'index.ts');
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

function transpile(module, filename) {
  const input = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(input, {
    fileName: filename,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      strict: false,
    },
  }).outputText;
  module._compile(output, filename);
}

Module._extensions['.ts'] = transpile;
Module._extensions['.tsx'] = transpile;

(async () => {
  const { runResearch } = require(path.join(srcRoot, 'lib/research/pipeline.ts'));
  const { detectSafetyRisk } = require(path.join(srcRoot, 'lib/safety.ts'));
  const { detectDiagnosisRequest } = require(path.join(srcRoot, 'lib/policy/diagnosis.ts'));
  const { detectFatwaRequest } = require(path.join(srcRoot, 'lib/policy/fatwa.ts'));
  const { detectPrescriptionRequest } = require(path.join(srcRoot, 'lib/policy/prescription.ts'));
  const { detectHealthQuery } = require(path.join(srcRoot, 'lib/policy/health.ts'));

  const questions = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'questions.json'), 'utf8'));
  const failures = [];

  for (const item of questions) {
    const result = await runResearch(item.query);
    if (result.outcome !== item.expectedOutcome) {
      failures.push({ id: item.id, expected: item.expectedOutcome, actual: result.outcome });
    }
  }

  const explicitChecks = [
    ['bare الموت is not safety', !detectSafetyRisk('الموت')],
    ['الخوف من الموت is not safety', !detectSafetyRisk('الخوف من الموت')],
    ['انتحار is safety', detectSafetyRisk('انتحار')],
    ['diagnosis request is blocked', detectDiagnosisRequest('هل أنا مصاب بالاكتئاب؟')],
    ['fatwa request is blocked', detectFatwaRequest('هل يجوز لي ترك صلاة الجماعة بسبب قلقي؟').isFatwa],
    ['subject research is not fatwa', !detectFatwaRequest('أبحث في الزكاة وآثارها').isFatwa],
    ['personal treatment is blocked', detectPrescriptionRequest('أي دواء أستعمل لعلاج الحزن؟')],
    ['health warning is informational', detectHealthQuery('صداع') && !detectSafetyRisk('صداع')],
    ['repeat-sin research returns evidence', (await runResearch('أرجع لنفس الذنب كل مرة')).outcome === 'ok'],
    ['normal research returns evidence', (await runResearch('أشعر أن قلبي قاسٍ ولا أتأثر بالقرآن')).outcome === 'ok'],
  ];

  for (const [name, passed] of explicitChecks) {
    if (!passed) failures.push({ check: name });
  }

  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, benchmarkCases: questions.length, benchmarkFailures: 0, explicitChecks: explicitChecks.length }, null, 2));
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
