import type { Env, ProjectIntake, WorkResult } from "../types";
import { recordStatus } from "../work";

type IvyDocument = {
  documentId: string;
  key: string;
  fileName: string;
  extension: string;
  documentType: string;
  status: "current" | "duplicate" | "unsupported";
};

type IvyRegister = { documents: IvyDocument[] };

type ProcessorResponse = {
  text: string;
  pageCount?: number;
  sheetCount?: number;
  locators?: Array<{ locator: string; start: number; end: number }>;
  metadata?: Record<string, unknown>;
  warnings?: string[];
  passwordProtected?: boolean;
};

const DIRECT_TEXT = new Set(["txt", "csv", "json", "md", "xml"]);

async function extractDirect(object: R2ObjectBody): Promise<ProcessorResponse> {
  return { text: await object.text(), pageCount: 1, warnings: [] };
}

async function extractWithService(env: Env, document: IvyDocument, object: R2ObjectBody): Promise<ProcessorResponse> {
  if (!env.DOCUMENT_PROCESSOR) {
    return { text: "", warnings: ["SSX document-processing service is not connected."] };
  }
  const headers = new Headers({
    "content-type": object.httpMetadata?.contentType || "application/octet-stream",
    "x-ssx-document-id": document.documentId,
    "x-ssx-file-name": encodeURIComponent(document.fileName),
    "x-ssx-document-type": document.documentType
  });
  const response = await env.DOCUMENT_PROCESSOR.fetch("https://ssx.internal/extract", {
    method: "POST",
    headers,
    body: object.body
  });
  if (!response.ok) throw new Error(`Document processor returned ${response.status} for ${document.fileName}`);
  return response.json<ProcessorResponse>();
}

async function processDocument(env: Env, intake: ProjectIntake, document: IvyDocument) {
  const object = await env.PROJECT_FILES.get(document.key);
  if (!object) throw new Error(`R2 source object is missing: ${document.key}`);
  const extracted = DIRECT_TEXT.has(document.extension)
    ? await extractDirect(object)
    : await extractWithService(env, document, object);

  const warnings = extracted.warnings || [];
  const status =
    extracted.passwordProtected ? "password-protected" :
    extracted.text.trim().length > 0 ? "extracted" :
    warnings.length > 0 ? "needs-processor" : "empty";

  const outputRef = `projects/${intake.projectId}/extracted/${document.documentId}.json`;
  const record = {
    schemaVersion: "1.0.0",
    projectId: intake.projectId,
    preparedBy: { employeeId: "SSX-EMP-003", name: "Dexter Decoder" },
    document,
    extractedAt: new Date().toISOString(),
    status,
    text: extracted.text,
    pageCount: extracted.pageCount || null,
    sheetCount: extracted.sheetCount || null,
    locators: extracted.locators || [],
    metadata: extracted.metadata || {},
    warnings
  };

  await env.PROJECT_FILES.put(outputRef, JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: "application/json" }
  });

  await env.DB.prepare(
    `INSERT INTO document_extractions
      (document_id, project_id, output_ref, status, character_count, page_count, sheet_count, warnings_json, extracted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(document_id) DO UPDATE SET
       output_ref=excluded.output_ref, status=excluded.status,
       character_count=excluded.character_count, page_count=excluded.page_count,
       sheet_count=excluded.sheet_count, warnings_json=excluded.warnings_json,
       extracted_at=excluded.extracted_at`
  ).bind(
    document.documentId, intake.projectId, outputRef, status, extracted.text.length,
    extracted.pageCount || null, extracted.sheetCount || null, JSON.stringify(warnings)
  ).run();

  return { documentId: document.documentId, fileName: document.fileName, outputRef, status, warnings, characters: extracted.text.length };
}

export async function dexterDecoder(env: Env, intake: ProjectIntake, inputRefs: string[]): Promise<WorkResult> {
  await recordStatus(env, intake.projectId, "SSX-EMP-003", "working", "Extracting indexed project documents.");
  const registerRef = inputRefs[0];
  const registerObject = registerRef ? await env.PROJECT_FILES.get(registerRef) : null;
  if (!registerObject) {
    const summary = "Dexter could not locate Ivy's document register.";
    await recordStatus(env, intake.projectId, "SSX-EMP-003", "exception", summary);
    return { projectId: intake.projectId, employeeId: "SSX-EMP-003", status: "exception", outputRef: "", summary, exceptions: [summary] };
  }

  const register = await registerObject.json<IvyRegister>();
  const documents = register.documents.filter((item) => item.status === "current");
  const results: Awaited<ReturnType<typeof processDocument>>[] = [];
  const failures: string[] = [];

  for (let i = 0; i < documents.length; i += 4) {
    const batch = documents.slice(i, i + 4);
    const settled = await Promise.allSettled(batch.map((document) => processDocument(env, intake, document)));
    settled.forEach((result, index) => {
      if (result.status === "fulfilled") results.push(result.value);
      else failures.push(`${batch[index].fileName}: ${String(result.reason)}`);
    });
  }

  const pending = results.filter((item) => item.status !== "extracted");
  const outputRef = `projects/${intake.projectId}/employee-work/SSX-EMP-003-extraction-register.json`;
  const exceptions = [
    ...failures,
    ...pending.map((item) => `${item.fileName}: ${item.status}`)
  ];
  const summaryRecord = {
    schemaVersion: "1.0.0",
    projectId: intake.projectId,
    preparedBy: { employeeId: "SSX-EMP-003", name: "Dexter Decoder" },
    generatedAt: new Date().toISOString(),
    totals: {
      assigned: documents.length,
      extracted: results.filter((item) => item.status === "extracted").length,
      pending: pending.length,
      failed: failures.length,
      characters: results.reduce((total, item) => total + item.characters, 0)
    },
    results,
    failures,
    exceptions
  };
  await env.PROJECT_FILES.put(outputRef, JSON.stringify(summaryRecord, null, 2), {
    httpMetadata: { contentType: "application/json" }
  });

  const status = failures.length ? "exception" : pending.length ? "waiting-for-input" : "completed";
  const summary = `Dexter processed ${documents.length} documents: ${summaryRecord.totals.extracted} extracted, ${pending.length} pending and ${failures.length} failed.`;
  await recordStatus(env, intake.projectId, "SSX-EMP-003", status, summary);
  return { projectId: intake.projectId, employeeId: "SSX-EMP-003", status, outputRef, summary, exceptions };
}
