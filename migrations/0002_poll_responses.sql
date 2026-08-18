CREATE TABLE IF NOT EXISTS poll_responses (
  id TEXT PRIMARY KEY,
  poll_month TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  client_hash TEXT NOT NULL,
  postcode TEXT NOT NULL,
  state TEXT NOT NULL,
  age TEXT NOT NULL,
  gender TEXT NOT NULL,
  enrolled TEXT NOT NULL,
  vic_now TEXT NOT NULL,
  federal_now TEXT NOT NULL,
  vic_last TEXT NOT NULL,
  federal_last TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_poll_month_client ON poll_responses (poll_month, client_hash);
CREATE INDEX IF NOT EXISTS idx_poll_month ON poll_responses (poll_month);
