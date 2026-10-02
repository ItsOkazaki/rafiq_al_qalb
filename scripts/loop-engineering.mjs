#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function run(name, command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('error', () => resolve({ name, ok: false, code: 1 }));
    child.on('exit', (code) => resolve({ name, ok: code === 0, code: code ?? 1 }));
  });
}

const results = [];

// These checks do not require a deployment. They execute the real research pipeline
// against the checked-in corpus with deterministic provider mocks and catch the same
// regressions that previously only appeared after publishing to Vercel.
results.push(await run('syntax-smoke', 'node', ['scripts/syntax-smoke.cjs']));
results.push(await run('runtime-regression', 'node', ['scripts/runtime-smoke.cjs']));

const hasDeps = fs.existsSync(path.join(root, 'node_modules'));
if (hasDeps) {
  results.push(await run('unit-tests', 'npm', ['run', 'test']));
  results.push(await run('typecheck', 'npm', ['run', 'typecheck']));
  results.push(await run('build', 'npm', ['run', 'build']));
} else {
  console.log('\nFull dependency-backed checks skipped: node_modules is not installed.');
  console.log('Install dependencies once with `npm install`; subsequent loop checks remain local and do not require deployment.');
}

console.log('\n=== Rafiq loop-engineering ===');
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}`);
if (results.every((result) => result.ok)) {
  console.log('Local regression loop is clean. No deployment is required for these checks.');
  process.exit(0);
}
process.exit(1);
