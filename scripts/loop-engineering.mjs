#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const commands = [
  ["tests", "npm", ["run", "test"]],
  ["typecheck", "npm", ["run", "typecheck"]],
];

function run(name, command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
    child.on("exit", (code) => resolve({ name, ok: code === 0, code: code ?? 1 }));
  });
}

const results = [];
for (const c of commands) results.push(await run(...c));

const latest = path.join(root, "benchmarks", "results", "latest.json");
let benchmark = null;
try { benchmark = JSON.parse(await fs.readFile(latest, "utf8")); } catch {}

console.log("\n=== Rafiq loop-engineering ===");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name}`);
if (benchmark?.summary) {
  console.log("Benchmark snapshot:");
  for (const [k, v] of Object.entries(benchmark.summary)) {
    if (typeof v === "number") console.log(`  ${k}: ${v}`);
  }
  console.log(`  cases: ${benchmark.rows?.length ?? 0}`);
} else {
  console.log("Benchmark snapshot: not run yet. Start the app and run `npm run benchmark -- --url <deployment>`.");
}

if (!results.every((r) => r.ok)) process.exit(1);
