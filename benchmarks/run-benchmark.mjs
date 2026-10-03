#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Fixed-case benchmark runner — baseline vs AI organization.
//
// It replays the frozen 40 cases in benchmarks/questions.json against a running
// deployment (local `npm start` or a Vercel URL):
//   mode=baseline → approved retrieval + deterministic organization (no model call)
//   mode=ai       → approved retrieval + model-grounded organization when a provider
//                   key is configured, otherwise the same deterministic organization
//
// Retrieval is deterministic in both modes by design; the runner therefore reports
// retrieval metrics once (labelled `baseline`/`ai` for compatibility) and treats the
// difference between the two runs as the answer-organization signal.
//
// It never invents numbers: every figure in benchmarks/results/latest.json comes from
// a real HTTP response of the target deployment.
//
// Usage: npm run benchmark -- --url http://localhost:3000 [--limit 10] [--dataset v1-40]
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs/promises';
import pg from 'pg';
import 'dotenv/config';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

if (args.includes('--help')) {
  console.log('Usage: npm run benchmark -- --url http://localhost:3000 [--limit 10] [--dataset v1-40]');
  process.exit(0);
}

const baseUrl = getArg('--url', 'http://localhost:3000').replace(/\/$/, '');
const limit = Number(getArg('--limit', '0')) || 0;
const questions = JSON.parse(await fs.readFile(new URL('./questions.json', import.meta.url), 'utf8'));
const selected = limit > 0 ? questions.slice(0, limit) : questions;
const datasetVersion = getArg('--dataset', 'v1-40');

let health = {};
try {
  const response = await fetch(`${baseUrl}/api/health`);
  if (response.ok) health = await response.json();
} catch { /* health metadata is nice-to-have; a reachable /api/research is the gate */ }

async function runCase(question, mode) {
  const response = await fetch(`${baseUrl}/api/research`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: question.query, mode }),
  });
  if (!response.ok) throw new Error(`${question.id}/${mode}: HTTP ${response.status}`);
  return response.json();
}

async function runConflictFixture() {
  try {
    const response = await fetch(`${baseUrl}/api/benchmark/conflict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const payload = await response.json().catch(() => null);
    return {
      ok: response.ok && Boolean(payload?.conflicts?.length),
      httpStatus: response.status,
      conflictCount: Array.isArray(payload?.conflicts) ? payload.conflicts.length : 0,
      message: payload?.message ?? null,
    };
  } catch (error) {
    return { ok: false, httpStatus: null, conflictCount: 0, message: String(error) };
  }
}

/** Metrics that are identical in both modes because retrieval does not call the model. */
function retrievalSignals(question, result) {
  const expectedSources = new Set(question.expectedSources ?? []);
  const expectedChunks = new Set(question.expectedChunks ?? []);
  const expectedTopics = new Set(question.expectedTopics ?? []);
  const sources = new Set((result.passages ?? []).map((p) => p?.source?.sourceId).filter(Boolean));
  const chunks = new Set((result.passages ?? []).map((p) => p?.chunkId).filter(Boolean));
  const topics = new Set((result.topics ?? []).map((x) => x?.topic?.id).filter(Boolean));

  const recall = (expected, got) =>
    expected.size === 0 ? null : [...expected].filter((x) => got.has(x)).length / expected.size;

  return {
    outcomeCorrect: result.outcome === question.expectedOutcome,
    retrievalRecall: recall(expectedSources, sources),
    chunkRecall: recall(expectedChunks, chunks),
    topicHit: expectedTopics.size === 0 ? null : [...expectedTopics].some((x) => topics.has(x)),
    topIds: (result.passages ?? []).map((p) => p.chunkId),
    sources: [...sources],
  };
}

function evaluate(question, baseline, ai) {
  return {
    id: question.id,
    type: question.type,
    expectedOutcome: question.expectedOutcome,
    baseline: retrievalSignals(question, baseline),
    ai: {
      ...retrievalSignals(question, ai),
      // The model layer organizes evidence when a provider key exists; without a key the
      // run is an honest deterministic fallback, not a failure.
      organization: ai.ai?.mode ?? null,
      modelOrganized: ai.ai?.mode === 'model',
      passages: (ai.passages ?? []).length,
      abstained: ai.outcome === 'abstained',
    },
  };
}

const rows = [];
for (const question of selected) {
  const baseline = await runCase(question, 'baseline');
  const ai = await runCase(question, 'ai');
  rows.push(evaluate(question, baseline, ai));
  process.stdout.write(`\r${rows.length}/${selected.length}`);
}
process.stdout.write('\n');

const conflict = await runConflictFixture();
const report = aggregate(rows, {
  baseUrl,
  questionCount: rows.length,
  generatedAt: new Date().toISOString(),
  datasetVersion,
  conflictFixture: conflict,
  health,
});

await fs.mkdir(new URL('./results/', import.meta.url), { recursive: true });
await fs.writeFile(new URL('./results/latest.json', import.meta.url), JSON.stringify(report, null, 2), 'utf8');
await persistToNeon(report, datasetVersion);
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Conflict fixture: ${conflict.ok ? 'PASS' : 'CHECK'} (${conflict.conflictCount} conflicts reported)`);
console.log('Saved: benchmarks/results/latest.json');

async function persistToNeon(report, version) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('Neon persistence: SKIP (DATABASE_URL not configured for the benchmark runner).');
    return;
  }
  const pool = new pg.Pool({ connectionString: url });
  const runKey = `bench-${Date.now()}`;
  try {
    await pool.query(
      `insert into benchmark_runs (run_key, base_url, dataset_version, model, embedding_model, summary) values ($1,$2,$3,$4,$5,$6)`,
      [runKey, report.baseUrl, version, report.health?.ai?.chatModel ?? null, null, JSON.stringify({ ...report.summary, provider: report.health?.ai?.provider ?? null })],
    );
    for (const row of report.rows) {
      await pool.query(`insert into benchmark_results (run_key, case_id, baseline, ai) values ($1,$2,$3,$4)`, [
        runKey, row.id, JSON.stringify(row.baseline), JSON.stringify(row.ai),
      ]);
    }
    console.log(`Neon persistence: PASS (${report.rows.length} cases, run ${runKey}).`);
  } catch (error) {
    console.log(`Neon persistence: CHECK (${String(error).slice(0, 180)}).`);
  } finally {
    await pool.end().catch(() => {});
  }
}

function meanBoolean(values) {
  const usable = values.filter((v) => typeof v === 'boolean');
  return usable.length ? usable.filter(Boolean).length / usable.length : null;
}

function meanNumber(values) {
  const usable = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  return usable.length ? usable.reduce((a, b) => a + b, 0) / usable.length : null;
}

function aggregate(rows, meta) {
  const sourceRows = rows.filter((r) => r.ai.retrievalRecall !== null);
  const chunkRows = rows.filter((r) => r.ai.chunkRecall !== null);
  const topicRows = rows.filter((r) => r.ai.topicHit !== null);
  const abstentionRows = rows.filter((r) => ['out-of-scope', 'fatwa-safety', 'hallucination'].includes(r.type));
  const answerRows = rows.filter((r) => ['ok', 'abstained', 'fatwa', 'safety'].includes(r.ai.outcome));

  return {
    ...meta,
    summary: {
      cases: rows.length,
      outcome_accuracy: meanBoolean(rows.map((r) => r.ai.outcomeCorrect)),
      baseline_outcome_accuracy: meanBoolean(rows.map((r) => r.baseline.outcomeCorrect)),
      retrieval_source_recall: meanNumber(sourceRows.map((r) => r.ai.retrievalRecall)),
      retrieval_source_hit_at_4: meanBoolean(sourceRows.map((r) => r.ai.retrievalRecall > 0)),
      retrieval_chunk_recall: meanNumber(chunkRows.map((r) => r.ai.chunkRecall)),
      retrieval_chunk_hit_at_4: meanBoolean(chunkRows.map((r) => r.ai.chunkRecall > 0)),
      topic_hit: meanBoolean(topicRows.map((r) => r.ai.topicHit)),
      abstention_accuracy: meanBoolean(abstentionRows.map((r) => r.ai.outcomeCorrect)),
      model_organization_rate: meanBoolean(answerRows.map((r) => r.ai.modelOrganized)),
      deterministic_organization_rate: meanBoolean(answerRows.map((r) => r.ai.organization === 'deterministic')),
      retrieval_identical_between_modes: rows.every((r) => JSON.stringify(r.baseline.topIds) === JSON.stringify(r.ai.topIds)),
    },
    rows,
  };
}
