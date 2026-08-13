import type { Env, ProjectIntake, R2ObjectEvent } from "./types";
import { EMPLOYEES } from "./employees";
export { MasonForgeProjectWorkflow } from "./workflow";

function authorized(request: Request, env: Env) {
  if (!env.INTERNAL_API_TOKEN) return false;
  return request.headers.get("authorization") === `Bearer ${env.INTERNAL_API_TOKEN}`;
}

async function startProject(env: Env, intake: ProjectIntake) {
  const id = `project-${intake.projectId}`;
  const instance = await env.PROJECT_WORKFLOW.create({ id, params: intake });
  return instance.id;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "ssx-mason-forge-fulfillment-team", employees: EMPLOYEES.length, activeAdapters: ["Oscar Orchestrator", "Ivy Intake"] });
    }
    if (url.pathname === "/employees" && request.method === "GET") {
      return Response.json({ employees: EMPLOYEES });
    }
    if (url.pathname === "/projects/intake" && request.method === "POST") {
      if (!authorized(request, env)) return new Response("Unauthorized", { status: 401 });
      const intake = await request.json<ProjectIntake>();
      if (!intake.projectId || !intake.projectName || !intake.uploadPrefix) {
        return Response.json({ error: "projectId, projectName and uploadPrefix are required" }, { status: 400 });
      }
      const workflowInstanceId = await startProject(env, intake);
      return Response.json({ accepted: true, workflowInstanceId, projectId: intake.projectId }, { status: 202 });
    }
    return new Response("Not found", { status: 404 });
  },

  async queue(batch: MessageBatch<R2ObjectEvent>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const event = message.body;
        if (event.action !== "PutObject" || !event.object.key.endsWith("/project-intake.json")) {
          message.ack();
          continue;
        }
        const object = await env.PROJECT_FILES.get(event.object.key);
        if (!object) throw new Error(`Project intake manifest not found: ${event.object.key}`);
        const intake = await object.json<ProjectIntake>();
        if (!intake.projectId || !intake.projectName || !intake.uploadPrefix) {
          throw new Error("Invalid project-intake.json manifest.");
        }
        await startProject(env, intake);
        message.ack();
      } catch (error) {
        console.error("Oscar could not open the uploaded project.", error);
        message.retry({ delaySeconds: 60 });
      }
    }
  }
};
