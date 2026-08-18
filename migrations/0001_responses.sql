-- File: /migrations/0001_responses.sql
-- Website: survey.oze.au
-- Description: Store survey submissions so aggregates are real

CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY,
  survey_slug TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  client_hash TEXT,
  answers_json TEXT NOT NULL,
  score INTEGER,
  max_score INTEGER
);

CREATE INDEX IF NOT EXISTS idx_responses_slug ON responses (survey_slug);
CREATE INDEX IF NOT EXISTS idx_responses_slug_created ON responses (survey_slug, created_at);
