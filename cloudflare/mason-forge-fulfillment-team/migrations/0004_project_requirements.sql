CREATE TABLE IF NOT EXISTS project_requirements (
  requirement_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  category TEXT NOT NULL,
  value_text TEXT NOT NULL,
  normalized_value TEXT,
  confidence REAL NOT NULL,
  status TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE TABLE IF NOT EXISTS project_review_queue (
  review_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  question TEXT NOT NULL,
  status TEXT NOT NULL,
  resolution TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_requirements_project
ON project_requirements(project_id, category);

CREATE INDEX IF NOT EXISTS idx_project_review_queue_open
ON project_review_queue(project_id, status, severity);
