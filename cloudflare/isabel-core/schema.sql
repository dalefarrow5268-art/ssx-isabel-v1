-- Isabel Cloudflare-first persistent data schema.
-- Durable Objects hold live session truth. D1 stores durable cross-session records.

CREATE TABLE IF NOT EXISTS memory_records (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  subject_type TEXT,
  subject_id TEXT,
  kind TEXT NOT NULL,
  value_json TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  provenance_json TEXT,
  approved INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_scope_subject
  ON memory_records(scope, subject_type, subject_id);

CREATE TABLE IF NOT EXISTS commitments (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  owner_id TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  due_at TEXT,
  source_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commitments_project_status
  ON commitments(project_id, status);

CREATE TABLE IF NOT EXISTS work_threads (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  context_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  payload_hash TEXT,
  payload_json TEXT,
  correlation_id TEXT,
  causation_id TEXT,
  recorded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_session_time
  ON audit_events(session_id, recorded_at);

CREATE TABLE IF NOT EXISTS integration_registry (
  id TEXT PRIMARY KEY,
  integration_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  config_json TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
