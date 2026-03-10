-- Personas table: stores unified user JSON blobs
CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
