ALTER TABLE poll_responses ADD COLUMN ip TEXT;
ALTER TABLE poll_responses ADD COLUMN ip_hash TEXT;
ALTER TABLE poll_responses ADD COLUMN user_agent TEXT;
ALTER TABLE poll_responses ADD COLUMN country TEXT;
ALTER TABLE poll_responses ADD COLUMN asn INTEGER;
ALTER TABLE poll_responses ADD COLUMN bot_score INTEGER;

CREATE INDEX IF NOT EXISTS idx_poll_month_ip ON poll_responses (poll_month, ip_hash);

CREATE TABLE IF NOT EXISTS poll_rate (
  ip_hash TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, bucket)
);
