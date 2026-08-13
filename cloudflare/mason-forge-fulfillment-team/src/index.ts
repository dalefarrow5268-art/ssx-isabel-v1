import type { Env, ProjectIntake } from "./types";
import { EMPLOYEES } from "./employees";
export { MasonForgeProjectWorkflow } from "./workflow";

function authorized(request: Request, env: Env) {
  if (!env.INTERNAL_API_TOKEN) return false;
  return request.headers.get("authorization") === `Bearer ${env.INTERNAL_API_TOKEN}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, service: "ssx-mason-forge-fulfillment-team", employees: EMPLOYEES.length });
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
      const id = `project-${intake.projectId}`;
      const instance = await env.PROJECT_WORKFLOW.create({ id, params: intake });
      return Response.json({ accepted: true, workflowInstanceId: instance.id, projectId: intake.projectId }, { status: 202 });
    }
    return new Response("Not found", { status: 404 });
  }
};
