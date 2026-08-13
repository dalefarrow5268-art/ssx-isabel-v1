CREATE TABLE IF NOT EXISTS document_extractions (
  document_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  output_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  character_count INTEGER NOT NULL DEFAULT 0,
  page_count INTEGER,
  sheet_count INTEGER,
  warnings_json TEXT NOT NULL DEFAULT '[]',
  extracted_at TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES project_documents(document_id),
  FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE INDEX IF NOT EXISTS idx_document_extractions_project
ON document_extractions(project_id, status);
