ALTER TABLE poll_responses ADD COLUMN source TEXT DEFAULT 'live';
CREATE INDEX IF NOT EXISTS idx_poll_month_source ON poll_responses (poll_month, source);
