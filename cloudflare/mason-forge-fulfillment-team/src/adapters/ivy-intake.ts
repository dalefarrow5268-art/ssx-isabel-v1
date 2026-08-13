import type { Env, ProjectIntake, WorkResult } from "../types";
import { recordStatus } from "../work";

type DocumentRecord = {
  documentId: string;
  key: string;
  fileName: string;
  extension: string;
  documentType: string;
  size: number;
  eTag: string;
  uploaded: string;
  duplicateOf: string | null;
  status: "current" | "duplicate" | "unsupported";
};

const SUPPORTED = new Set(["pdf", "dwg", "dxf", "doc", "docx", "xls", "xlsx", "csv", "txt", "jpg", "jpeg", "png", "tif", "tiff", "zip", "msg", "eml"]);

function documentType(fileName: string): string {
  const n = fileName.toLowerCase();
  if (/addendum|addenda/.test(n)) return "addendum";
  if (/spec|project manual/.test(n)) return "specification";
  if (/geotech|soil report/.test(n)) return "geotechnical";
  if (/contract|agreement/.test(n)) return "contract";
  if (/schedule/.test(n)) return "schedule";
  if (/intake/.test(n)) return "intake";
  if (/municipal|ordinance|permit/.test(n)) return "municipal";
  if (/^[acspmelft][-_ ]?\d+/i.test(fileName) || /plan|drawing|sheet/.test(n)) return "plan";
  return "other";
}

function documentId(projectId: string, index: number): string {
  return `${projectId}-DOC-${String(index + 1).padStart(5, "0")}`;
}

export async function ivyIntake(env: Env, intake: ProjectIntake): Promise<WorkResult> {
  await recordStatus(env, intake.projectId, "SSX-EMP-002", "working", "Inventorying uploaded project documents.");

  const objects: R2Object[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.PROJECT_FILES.list({
      prefix: intake.uploadPrefix.endsWith("/") ? intake.uploadPrefix : `${intake.uploadPrefix}/`,
      cursor,
      limit: 1000
    });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const sourceObjects = objects.filter((item) => !item.key.endsWith("/project-intake.json"));
  const firstByFingerprint = new Map<string, string>();
  const documents: DocumentRecord[] = sourceObjects.map((item, index) => {
    const fileName = item.key.split("/").pop() || item.key;
    const extension = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
    const fingerprint = `${item.etag}:${item.size}`;
    const duplicateOf = firstByFingerprint.get(fingerprint) || null;
    const id = documentId(intake.projectId, index);
    if (!duplicateOf) firstByFingerprint.set(fingerprint, id);
    const supported = SUPPORTED.has(extension);
    return {
      documentId: id,
      key: item.key,
      fileName,
      extension,
      documentType: documentType(fileName),
      size: item.size,
      eTag: item.etag,
      uploaded: item.uploaded.toISOString(),
      duplicateOf,
      status: duplicateOf ? "duplicate" : supported ? "current" : "unsupported"
    };
  });

  const unsupported = documents.filter((item) => item.status === "unsupported");
  const duplicates = documents.filter((item) => item.status === "duplicate");
  const outputRef = `projects/${intake.projectId}/employee-work/SSX-EMP-002-document-register.json`;
  const exceptions: string[] = [];
  if (documents.length === 0) exceptions.push("No source documents were found beneath the uploaded project prefix.");
  if (unsupported.length) exceptions.push(`${unsupported.length} unsupported files require review.`);

  const register = {
    schemaVersion: "1.0.0",
    projectId: intake.projectId,
    preparedBy: { employeeId: "SSX-EMP-002", name: "Ivy Intake" },
    generatedAt: new Date().toISOString(),
    uploadPrefix: intake.uploadPrefix,
    totals: {
      files: documents.length,
      current: documents.filter((item) => item.status === "current").length,
      duplicates: duplicates.length,
      unsupported: unsupported.length,
      bytes: documents.reduce((total, item) => total + item.size, 0)
    },
    documents,
    exceptions
  };

  await env.PROJECT_FILES.put(outputRef, JSON.stringify(register, null, 2), {
    httpMetadata: { contentType: "application/json" }
  });

  if (documents.length) {
    const statements = documents.map((item) =>
      env.DB.prepare(
        `INSERT INTO project_documents
          (document_id, project_id, object_key, file_name, extension, document_type, size_bytes, etag, uploaded_at, duplicate_of, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(document_id) DO UPDATE SET
           object_key=excluded.object_key, size_bytes=excluded.size_bytes, etag=excluded.etag,
           duplicate_of=excluded.duplicate_of, status=excluded.status`
      ).bind(item.documentId, intake.projectId, item.key, item.fileName, item.extension, item.documentType, item.size, item.eTag, item.uploaded, item.duplicateOf, item.status)
    );
    for (let i = 0; i < statements.length; i += 100) await env.DB.batch(statements.slice(i, i + 100));
  }

  const status = documents.length === 0 ? "exception" : unsupported.length ? "waiting-for-input" : "completed";
  const summary = `Ivy inventoried ${documents.length} project files, found ${duplicates.length} duplicates and ${unsupported.length} unsupported files.`;
  await recordStatus(env, intake.projectId, "SSX-EMP-002", status, summary);

  return { projectId: intake.projectId, employeeId: "SSX-EMP-002", status, outputRef, summary, exceptions };
}
