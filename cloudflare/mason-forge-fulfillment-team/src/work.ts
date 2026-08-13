import { employee } from "./employees";
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
  const staff = employee(employeeId);
  await recordStatus(env, intake.projectId, employeeId, "working", assignment);

  const result: WorkResult = {
    projectId: intake.projectId,
    employeeId,
    status: "completed",
    outputRef: `projects/${intake.projectId}/employee-work/${employeeId}.json`,
    summary: `${staff.name} completed the assigned ${assignment} stage.`,
    exceptions: []
  };

  // Each employee-specific business adapter replaces this packet with its
  // structured work product. Until configured, the packet makes missing
  // integration explicit and prevents false project release.
  const packet = {
    ...result,
    employee: staff,
    assignment,
    inputRefs,
    generatedAt: new Date().toISOString(),
    implementationStatus: "adapter-required",
    releaseBlocking: true
  };
  result.status = "waiting-for-input";
  result.exceptions.push(`${staff.name}'s production adapter is not configured.`);

  await env.PROJECT_FILES.put(result.outputRef, JSON.stringify(packet, null, 2), {
    httpMetadata: { contentType: "application/json" }
  });
  await recordStatus(env, intake.projectId, employeeId, result.status, result.summary);
  return result;
}

export async function returnToStandby(env: Env, projectId: string, employeeId: string) {
  await recordStatus(env, projectId, employeeId, "standby", "Assignment closed; available for the next project.");
}
