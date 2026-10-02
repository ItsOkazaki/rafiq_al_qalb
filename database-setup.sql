-- رفيق القلوب — production database setup
-- Paste this entire file into Neon Console → SQL Editor → Run.

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
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_sessions_created_at_idx
  ON research_sessions (created_at DESC);

-- Verification query: should return one row with the table name.
SELECT to_regclass('public.research_sessions') AS installed_table;
