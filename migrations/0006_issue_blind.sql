DROP TABLE IF EXISTS issue_picks;
DROP TABLE IF EXISTS issue_rounds;
DROP TABLE IF EXISTS issue_responses;

CREATE TABLE issue_responses (
  id TEXT PRIMARY KEY,
  poll_month TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  client_hash TEXT NOT NULL,
  location TEXT NOT NULL,
  postcode TEXT,
  state TEXT,
  age TEXT NOT NULL,
  enrolled TEXT NOT NULL,
  ratings_json TEXT NOT NULL,
  top3_json TEXT NOT NULL,
  issue_set TEXT NOT NULL,
  matrix_hash TEXT NOT NULL,
  blind INTEGER NOT NULL,
  unweighted_json TEXT NOT NULL,
  weighted_json TEXT NOT NULL,
  ip TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  country TEXT,
  asn INTEGER,
  bot_score INTEGER,
  source TEXT NOT NULL DEFAULT 'live'
);

CREATE UNIQUE INDEX idx_issue_month_client ON issue_responses (poll_month, client_hash);
CREATE INDEX idx_issue_month ON issue_responses (poll_month);
CREATE INDEX idx_issue_month_state ON issue_responses (poll_month, state);

CREATE TABLE issue_picks (
  response_id TEXT NOT NULL,
  issue_slug TEXT NOT NULL,
  chosen TEXT NOT NULL,
  chosen_slot INTEGER,
  shown_order TEXT NOT NULL,
  ms_to_pick INTEGER,
  rating INTEGER NOT NULL,
  PRIMARY KEY (response_id, issue_slug)
);

CREATE INDEX idx_picks_issue ON issue_picks (issue_slug, chosen);

CREATE TABLE issue_rounds (
  poll_month TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  matrix_hash TEXT NOT NULL,
  shown_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (poll_month, client_hash)
);
