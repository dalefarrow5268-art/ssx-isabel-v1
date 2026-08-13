export interface Env {
  DB: D1Database;
  PROJECT_FILES: R2Bucket;
  PROJECT_WORKFLOW: Workflow<ProjectIntake>;
  DOCUMENT_PROCESSOR?: Fetcher;
  FULFILLMENT_QUEUE: Queue<FulfillmentMessage>;
  WAREHOUSE_INDEX?: VectorizeIndex;
  AI?: Ai;
  WEATHER_CENTER_URL?: string;
  INTERNAL_API_TOKEN?: string;
}

export type ProjectIntake = {
  projectId: string;
  projectName: string;
  uploadPrefix: string;
  receivedAt: string;
  requestedBy: string;
};

export type FulfillmentMessage = {
  projectId: string;
  employeeId: string;
  assignment: string;
  inputRefs: string[];
  idempotencyKey: string;
};

export type R2ObjectEvent = {
  action: string;
  bucket?: string;
  object: { key: string; size?: number; eTag?: string };
  eventTime?: string;
};

export type WorkResult = {
  projectId: string;
  employeeId: string;
  status: "completed" | "waiting-for-input" | "exception";
  outputRef: string;
  summary: string;
  exceptions: string[];
};
