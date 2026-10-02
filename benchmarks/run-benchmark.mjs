#!/usr/bin/env node
import fs from 'node:fs/promises';
import pg from 'pg';
import 'dotenv/config';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

if (args.includes('--help')) {
  console.log('Usage: npm run benchmark -- --url http://localhost:3000 [--limit 10]');
  process.exit(0);
}

const baseUrl = getArg('--url', 'http://localhost:3000').replace(/\/$/, '');
const limit = Number(getArg('--limit', '0')) || 0;
const questions = JSON.parse(await fs.readFile(new URL('./questions.json', import.meta.url), 'utf8'));
const selected = limit > 0 ? questions.slice(0, limit) : questions;
const datasetVersion = getArg('--dataset', 'v1-40');

let healthMeta = {};
try {
  const healthResponse = await fetch(`${baseUrl}/api/health`);
  if (healthResponse.ok) healthMeta = await healthResponse.json();
} catch {}

async function runCase(question, mode) {
  const response = await fetch(`${baseUrl}/api/research`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: question.query, mode, audience: 'general' }),
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
  conflictFixture: conflict,
  provider: healthMeta.aiProvider ?? null,
  chatModel: healthMeta.chatModel ?? null,
  embeddingProvider: healthMeta.embeddingProvider ?? null,
  embeddingModel: healthMeta.embeddingModel ?? null,
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
    await pool.query(`insert into benchmark_runs (run_key, base_url, dataset_version, model, embedding_model, summary) values ($1,$2,$3,$4,$5,$6)`, [
      runKey, report.baseUrl, version, report.chatModel ?? null, report.embeddingModel ?? null, JSON.stringify({ ...report.summary, provider: report.provider, embeddingProvider: report.embeddingProvider }),
    ]);
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

function evaluate(q, baseline, ai) {
  const expectedSources = new Set(q.expectedSources ?? []);
  const expectedTopics = new Set(q.expectedTopics ?? []);
  const expectedChunks = new Set(q.expectedChunks ?? []);
  const baselineSources = new Set((baseline.passages ?? []).map(p => p?.source?.sourceId).filter(Boolean));
  const aiSources = new Set((ai.passages ?? []).map(p => p?.source?.sourceId).filter(Boolean));
  const baselineTopics = new Set((baseline.topics ?? []).map(x => x?.topic?.id).filter(Boolean));
  const aiTopics = new Set((ai.topics ?? []).map(x => x?.topic?.id).filter(Boolean));

  const expectedOutcomeOk = x => x?.outcome === q.expectedOutcome;
  const baselineExpectedSources = [...expectedSources].filter(x => baselineSources.has(x));
  const aiExpectedSources = [...expectedSources].filter(x => aiSources.has(x));
  const baselineRetrievalRecall = expectedSources.size === 0 ? null : baselineExpectedSources.length / expectedSources.size;
  const aiRetrievalRecall = expectedSources.size === 0 ? null : aiExpectedSources.length / expectedSources.size;
  const baselineRetrievalHit = baselineRetrievalRecall === null ? null : baselineRetrievalRecall > 0;
  const aiRetrievalHit = aiRetrievalRecall === null ? null : aiRetrievalRecall > 0;
  const baselineChunks = new Set((baseline.passages ?? []).map(p => p?.chunkId).filter(Boolean));
  const aiChunks = new Set((ai.passages ?? []).map(p => p?.chunkId).filter(Boolean));
  const baselineChunkRecall = expectedChunks.size === 0 ? null : [...expectedChunks].filter(x => baselineChunks.has(x)).length / expectedChunks.size;
  const aiChunkRecall = expectedChunks.size === 0 ? null : [...expectedChunks].filter(x => aiChunks.has(x)).length / expectedChunks.size;
  const baselineChunkHit = baselineChunkRecall === null ? null : baselineChunkRecall > 0;
  const aiChunkHit = aiChunkRecall === null ? null : aiChunkRecall > 0;
  const baselineTopicHit = expectedTopics.size === 0 ? null : [...expectedTopics].some(x => baselineTopics.has(x));
  const aiTopicHit = expectedTopics.size === 0 ? null : [...expectedTopics].some(x => aiTopics.has(x));

  const claims = Array.isArray(ai?.diagnostics?.claims) ? ai.diagnostics.claims : [];
  const supported = claims.filter(c => c?.status === 'supported');
  const citationGrounded = claims.length === 0 ? null : supported.length / claims.length;

  const expectedCitationRate = expectedSources.size === 0 || supported.length === 0 ? null :
    supported.filter(c => {
      const ids = Array.isArray(c.evidenceIds) ? c.evidenceIds : [];
      if (ids.length === 0) return false;
      return ids.every(id => {
        const passage = (ai.passages ?? []).find(p => p.chunkId === id);
        return passage && expectedSources.has(passage.source?.sourceId);
      });
    }).length / supported.length;

  return {
    id: q.id,
    type: q.type,
    expectedOutcome: q.expectedOutcome,
    baseline: {
      outcomeCorrect: expectedOutcomeOk(baseline),
      retrievalHit: baselineRetrievalHit,
      retrievalRecall: baselineRetrievalRecall,
      chunkHit: baselineChunkHit,
      chunkRecall: baselineChunkRecall,
      topicHit: baselineTopicHit,
      topIds: (baseline.passages ?? []).map(p => p.chunkId),
      sources: [...baselineSources],
    },
    ai: {
      outcomeCorrect: expectedOutcomeOk(ai),
      retrievalHit: aiRetrievalHit,
      retrievalRecall: aiRetrievalRecall,
      chunkHit: aiChunkHit,
      chunkRecall: aiChunkRecall,
      topicHit: aiTopicHit,
      aiActivated: ai.ai?.mode === 'evidence-gated',
      verifiedClaimRate: citationGrounded,
      expectedCitationRate,
      verifiedClaims: Number(ai.diagnostics?.verifiedClaimCount ?? 0),
      totalClaims: Number(ai.diagnostics?.totalClaimCount ?? 0),
      abstained: ai.outcome === 'abstained',
      topIds: (ai.passages ?? []).map(p => p.chunkId),
      sources: [...aiSources],
      gate: ai.diagnostics?.evidenceGate ?? null,
    },
  };
}

function meanBoolean(values) {
  const usable = values.filter(v => typeof v === 'boolean');
  return usable.length ? usable.filter(Boolean).length / usable.length : null;
}

function meanNumber(values) {
  const usable = values.filter(v => typeof v === 'number' && Number.isFinite(v));
  return usable.length ? usable.reduce((a, b) => a + b, 0) / usable.length : null;
}

function aggregate(rows, meta) {
  const expectedSourceRows = rows.filter(r => r.ai.retrievalRecall !== null);
  const expectedTopicRows = rows.filter(r => r.ai.topicHit !== null);
  const expectedChunkRows = rows.filter(r => r.ai.chunkRecall !== null);
  const eligibleAiRows = rows.filter(r => ['direct', 'vague', 'multi-source', 'hallucination'].includes(r.type));
  const abstentionRows = rows.filter(r => ['out-of-scope', 'fatwa-safety', 'hallucination'].includes(r.type));
  const baselineRecall = meanNumber(expectedSourceRows.map(r => r.baseline.retrievalRecall));
  const aiRecall = meanNumber(expectedSourceRows.map(r => r.ai.retrievalRecall));

  return {
    ...meta,
    summary: {
      baseline_outcome_accuracy: meanBoolean(rows.map(r => r.baseline.outcomeCorrect)),
      ai_outcome_accuracy: meanBoolean(rows.map(r => r.ai.outcomeCorrect)),
      baseline_retrieval_source_recall: baselineRecall,
      ai_retrieval_source_recall: aiRecall,
      ai_retrieval_recall_delta: baselineRecall === null || aiRecall === null ? null : aiRecall - baselineRecall,
      baseline_chunk_recall: meanNumber(expectedChunkRows.map(r => r.baseline.chunkRecall)),
      ai_chunk_recall: meanNumber(expectedChunkRows.map(r => r.ai.chunkRecall)),
      ai_chunk_recall_delta: meanNumber(expectedChunkRows.map(r => r.baseline.chunkRecall)) === null || meanNumber(expectedChunkRows.map(r => r.ai.chunkRecall)) === null ? null : meanNumber(expectedChunkRows.map(r => r.ai.chunkRecall)) - meanNumber(expectedChunkRows.map(r => r.baseline.chunkRecall)),
      baseline_chunk_hit: meanBoolean(expectedChunkRows.map(r => r.baseline.chunkHit)),
      ai_chunk_hit: meanBoolean(expectedChunkRows.map(r => r.ai.chunkHit)),
      baseline_retrieval_hit: meanBoolean(expectedSourceRows.map(r => r.baseline.retrievalHit)),
      ai_retrieval_hit: meanBoolean(expectedSourceRows.map(r => r.ai.retrievalHit)),
      baseline_topic_hit: meanBoolean(expectedTopicRows.map(r => r.baseline.topicHit)),
      ai_topic_hit: meanBoolean(expectedTopicRows.map(r => r.ai.topicHit)),
      ai_verified_claim_rate: meanNumber(rows.map(r => r.ai.verifiedClaimRate)),
      ai_expected_citation_rate: meanNumber(rows.map(r => r.ai.expectedCitationRate)),
      ai_activation_rate: meanBoolean(eligibleAiRows.map(r => r.ai.aiActivated)),
      abstention_accuracy: meanBoolean(abstentionRows.map(r => r.ai.outcomeCorrect)),
      cases_where_ai_changed_top_result: rows.filter(r => JSON.stringify(r.baseline.topIds) !== JSON.stringify(r.ai.topIds)).length,
    },
    rows,
  };
}
