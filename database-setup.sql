-- رفيق القلوب — Neon production/evaluation setup
-- Run once in Neon SQL Editor.

CREATE TABLE IF NOT EXISTS research_sessions (
  id serial PRIMARY KEY,
  query text NOT NULL,
  outcome text NOT NULL,
  topic_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  passage_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  passage_count integer NOT NULL DEFAULT 0,
  ai_mode text,
  safety_triggered text NOT NULL DEFAULT 'no',
  provider text,
  chat_model text,
  embedding_model text,
  ai_configured boolean NOT NULL DEFAULT false,
  candidate_count integer NOT NULL DEFAULT 0,
  semantic_retrieval_used boolean NOT NULL DEFAULT false,
  baseline_top_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  hybrid_top_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  reranked jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_gate jsonb,
  claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  conflicts jsonb NOT NULL DEFAULT '[]'::jsonb,
  verified_claim_count integer NOT NULL DEFAULT 0,
  total_claim_count integer NOT NULL DEFAULT 0,
  latency_ms integer,
  degraded_reason text,
  plan jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Safe upgrades for an existing database.
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS chat_model text;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS embedding_model text;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS ai_configured boolean NOT NULL DEFAULT false;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS candidate_count integer NOT NULL DEFAULT 0;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS semantic_retrieval_used boolean NOT NULL DEFAULT false;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS baseline_top_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS hybrid_top_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS reranked jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS evidence_gate jsonb;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS claims jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS conflicts jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS verified_claim_count integer NOT NULL DEFAULT 0;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS total_claim_count integer NOT NULL DEFAULT 0;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS latency_ms integer;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS degraded_reason text;
ALTER TABLE research_sessions ADD COLUMN IF NOT EXISTS plan jsonb;

CREATE INDEX IF NOT EXISTS research_sessions_created_at_idx ON research_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS research_sessions_outcome_idx ON research_sessions (outcome);
CREATE INDEX IF NOT EXISTS research_sessions_ai_mode_idx ON research_sessions (ai_mode);

CREATE TABLE IF NOT EXISTS benchmark_runs (
  id serial PRIMARY KEY,
  run_key text NOT NULL,
  base_url text NOT NULL,
  dataset_version text NOT NULL,
  model text,
  embedding_model text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS benchmark_runs_created_at_idx ON benchmark_runs (created_at DESC);

CREATE TABLE IF NOT EXISTS benchmark_results (
  id serial PRIMARY KEY,
  run_key text NOT NULL,
  case_id text NOT NULL,
  baseline jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS benchmark_results_run_key_idx ON benchmark_results (run_key);

SELECT to_regclass('public.research_sessions') AS installed_research_sessions;
SELECT to_regclass('public.benchmark_runs') AS installed_benchmark_runs;
SELECT to_regclass('public.benchmark_results') AS installed_benchmark_results;
