import { employee } from "./employees";
import { ivyIntake } from "./adapters/ivy-intake";
import { dexterDecoder } from "./adapters/dexter-decoder";
import type { Env, ProjectIntake, WorkResult } from "./types";

export async function recordStatus(env: Env, projectId: string, employeeId: string, status: string, detail: string) {
  await env.DB.prepare(
    `INSERT INTO employee_assignments
      (project_id, employee_id, status, detail, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(project_id, employee_id)
     DO UPDATE SET status = excluded.status, detail = excluded.detail, updated_at = excluded.updated_at`
  ).bind(projectId, employeeId, status, detail).run();
}

export async function completeAssignment(
  env: Env,
  intake: ProjectIntake,
  employeeId: string,
  assignment: string,
  inputRefs: string[]
): Promise<WorkResult> {
  if (employeeId === "SSX-EMP-002") return ivyIntake(env, intake);
  if (employeeId === "SSX-EMP-003") return dexterDecoder(env, intake, inputRefs);

  const staff = employee(employeeId);
  await recordStatus(env, intake.projectId, employeeId, "working", assignment);
  const outputRef = `projects/${intake.projectId}/employee-work/${employeeId}.json`;
  const summary = `${staff.name} is waiting for the production adapter required for ${assignment}.`;
  const exceptions = [`${staff.name}'s production adapter is not configured.`];

  await env.PROJECT_FILES.put(outputRef, JSON.stringify({
    projectId: intake.projectId,
    employee: staff,
    assignment,
    inputRefs,
    generatedAt: new Date().toISOString(),
    implementationStatus: "adapter-required",
    releaseBlocking: true,
    exceptions
  }, null, 2), { httpMetadata: { contentType: "application/json" } });

  await recordStatus(env, intake.projectId, employeeId, "waiting-for-input", summary);
  return { projectId: intake.projectId, employeeId, status: "waiting-for-input", outputRef, summary, exceptions };
}

export async function returnToStandby(env: Env, projectId: string, employeeId: string) {
  await recordStatus(env, projectId, employeeId, "standby", "Assignment closed; available for the next project.");
}
