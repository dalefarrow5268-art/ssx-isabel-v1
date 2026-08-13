CREATE TABLE IF NOT EXISTS project_documents (
  document_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  extension TEXT,
  document_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  etag TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  duplicate_of TEXT,
  status TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_documents_project
ON project_documents(project_id, status);

CREATE INDEX IF NOT EXISTS idx_project_documents_etag
ON project_documents(project_id, etag, size_bytes);
