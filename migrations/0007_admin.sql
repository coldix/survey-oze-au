ALTER TABLE poll_responses ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE poll_responses ADD COLUMN flag_reason TEXT;

ALTER TABLE issue_responses ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE issue_responses ADD COLUMN flag_reason TEXT;

ALTER TABLE responses ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE responses ADD COLUMN flag_reason TEXT;
ALTER TABLE responses ADD COLUMN ip TEXT;
ALTER TABLE responses ADD COLUMN user_agent TEXT;
ALTER TABLE responses ADD COLUMN country TEXT;

CREATE TABLE IF NOT EXISTS admin_codes (
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (email)
);

CREATE TABLE IF NOT EXISTS survey_settings (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  open_start TEXT,
  open_end TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS survey_archives (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  response_count INTEGER NOT NULL
);

INSERT OR IGNORE INTO survey_settings (slug, title, open_start, open_end, archived, updated_at)
VALUES
  ('monthly-poll', 'Monthly voting poll', '2026-08-18', '2026-11-28', 0, 0),
  ('vic-issues', 'Victoria 2026 issues', '2026-08-18', '2026-11-28', 0, 0),
  ('money', 'Money in Your Wallet', NULL, NULL, 0, 0);
