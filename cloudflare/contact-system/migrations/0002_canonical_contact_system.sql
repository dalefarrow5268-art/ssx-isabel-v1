PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  company TEXT,
  phone TEXT,
  source_intake_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(source_intake_id) REFERENCES intake_submissions(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email ON contacts(lower(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  intake_id TEXT NOT NULL,
  contact_id TEXT,
  subject TEXT,
  body_text TEXT,
  message_date TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(intake_id) REFERENCES intake_submissions(id),
  FOREIGN KEY(contact_id) REFERENCES contacts(id)
);

CREATE TABLE IF NOT EXISTS task_events (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);
CREATE INDEX IF NOT EXISTS idx_task_events_task_created ON task_events(task_id,created_at);

ALTER TABLE tasks ADD COLUMN timer_started_at TEXT;
ALTER TABLE tasks ADD COLUMN timer_paused_at TEXT;
ALTER TABLE tasks ADD COLUMN timer_elapsed_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN completed_at TEXT;
