CREATE TABLE IF NOT EXISTS issue_responses (
  id TEXT PRIMARY KEY,
  poll_month TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  client_hash TEXT NOT NULL,
  location TEXT NOT NULL,
  postcode TEXT,
  state TEXT,
  age TEXT NOT NULL,
  enrolled TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  ip TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  country TEXT,
  asn INTEGER,
  bot_score INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_month_client ON issue_responses (poll_month, client_hash);
CREATE INDEX IF NOT EXISTS idx_issue_month ON issue_responses (poll_month);
CREATE INDEX IF NOT EXISTS idx_issue_month_state ON issue_responses (poll_month, state);
