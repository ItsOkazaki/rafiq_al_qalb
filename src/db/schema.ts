// رفيق القلوب — سجل خاص للتشغيل والقياس.
// المادة العلمية تبقى في corpus المراجع داخل التطبيق؛ Neon يحتفظ بأثر تشغيلي
// وبيانات تقييم منزوعة الهوية لمقارنة baseline بمسار AI.

import { integer, jsonb, pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const researchSessions = pgTable("research_sessions", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  outcome: text("outcome").notNull(),
  topicIds: jsonb("topic_ids").$type<string[]>().notNull().default([]),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  passageIds: jsonb("passage_ids").$type<string[]>().notNull().default([]),
  passageCount: integer("passage_count").notNull().default(0),
  aiMode: text("ai_mode"),
  safetyTriggered: text("safety_triggered").notNull().default("no"),
  provider: text("provider"),
  chatModel: text("chat_model"),
  embeddingModel: text("embedding_model"),
  aiConfigured: boolean("ai_configured").notNull().default(false),
  candidateCount: integer("candidate_count").notNull().default(0),
  semanticRetrievalUsed: boolean("semantic_retrieval_used").notNull().default(false),
  baselineTopIds: jsonb("baseline_top_ids").$type<string[]>().notNull().default([]),
  hybridTopIds: jsonb("hybrid_top_ids").$type<string[]>().notNull().default([]),
  reranked: jsonb("reranked").$type<unknown[]>().notNull().default([]),
  evidenceGate: jsonb("evidence_gate").$type<unknown>().default(null),
  claims: jsonb("claims").$type<unknown[]>().notNull().default([]),
  conflicts: jsonb("conflicts").$type<unknown[]>().notNull().default([]),
  verifiedClaimCount: integer("verified_claim_count").notNull().default(0),
  totalClaimCount: integer("total_claim_count").notNull().default(0),
  latencyMs: integer("latency_ms"),
  degradedReason: text("degraded_reason"),
  plan: jsonb("plan").$type<unknown>().default(null),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const benchmarkRuns = pgTable("benchmark_runs", {
  id: serial("id").primaryKey(),
  runKey: text("run_key").notNull(),
  baseUrl: text("base_url").notNull(),
  datasetVersion: text("dataset_version").notNull(),
  model: text("model"),
  embeddingModel: text("embedding_model"),
  summary: jsonb("summary").$type<unknown>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const benchmarkResults = pgTable("benchmark_results", {
  id: serial("id").primaryKey(),
  runKey: text("run_key").notNull(),
  caseId: text("case_id").notNull(),
  baseline: jsonb("baseline").$type<unknown>().notNull().default({}),
  ai: jsonb("ai").$type<unknown>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
