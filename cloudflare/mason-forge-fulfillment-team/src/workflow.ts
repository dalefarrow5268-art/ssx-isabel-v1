import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { Env, ProjectIntake, WorkResult } from "./types";
import { completeAssignment, recordStatus, returnToStandby } from "./work";

export class MasonForgeProjectWorkflow extends WorkflowEntrypoint<Env, ProjectIntake> {
  async run(event: WorkflowEvent<ProjectIntake>, step: WorkflowStep) {
    const p = event.payload;

    await step.do("Oscar opens project fulfillment", async () => {
      await this.env.DB.prepare(
        `INSERT INTO projects (project_id, project_name, upload_prefix, status, received_at)
         VALUES (?, ?, ?, 'intake', ?)
         ON CONFLICT(project_id) DO NOTHING`
      ).bind(p.projectId, p.projectName, p.uploadPrefix, p.receivedAt).run();
      await recordStatus(this.env, p.projectId, "SSX-EMP-001", "working", "Project fulfillment opened.");
      return { projectId: p.projectId };
    });

    const ivy = await step.do("Ivy performs intake", async () =>
      completeAssignment(this.env, p, "SSX-EMP-002", "intake-and-document-control", [p.uploadPrefix])
    );

    const dexter = await step.do("Dexter extracts documents", async () =>
      completeAssignment(this.env, p, "SSX-EMP-003", "document-extraction", [ivy.outputRef])
    );

    const reggie = await step.do("Reggie establishes project requirements", async () =>
      completeAssignment(this.env, p, "SSX-EMP-004", "project-requirements", [dexter.outputRef])
    );

    const penny = await step.do("Penny reviews plans and specifications", async () =>
      completeAssignment(this.env, p, "SSX-EMP-005", "plans-and-specifications-review", [dexter.outputRef, reggie.outputRef])
    );

    const parker = await step.do("Parker creates warehouse pick list", async () =>
      completeAssignment(this.env, p, "SSX-EMP-006", "warehouse-picking", [penny.outputRef])
    );

    const [esther, sally, wendy] = await Promise.all([
      step.do("Esther builds estimate", async () =>
        completeAssignment(this.env, p, "SSX-EMP-007", "estimate-building", [parker.outputRef, reggie.outputRef])
      ),
      step.do("Sally builds schedule structure", async () =>
        completeAssignment(this.env, p, "SSX-EMP-008", "schedule-building", [parker.outputRef, reggie.outputRef])
      ),
      step.do("Wendy develops weather and hazard profile", async () =>
        completeAssignment(this.env, p, "SSX-EMP-009", "weather-and-hazard-analysis", [reggie.outputRef, penny.outputRef])
      )
    ]);

    const duncan = await step.do("Duncan calculates duration and logic", async () =>
      completeAssignment(this.env, p, "SSX-EMP-010", "duration-and-logic", [esther.outputRef, sally.outputRef, wendy.outputRef])
    );

    const quincy = await step.do("Quincy conducts independent audit", async () =>
      completeAssignment(this.env, p, "SSX-EMP-011", "quality-and-traceability-audit", [
        reggie.outputRef, penny.outputRef, parker.outputRef, esther.outputRef, sally.outputRef, wendy.outputRef, duncan.outputRef
      ])
    );

    const results: WorkResult[] = [ivy, dexter, reggie, penny, parker, esther, sally, wendy, duncan, quincy];
    const blockers = results.flatMap((result) => result.exceptions);
    if (blockers.length > 0) {
      await step.do("Oscar places project on implementation hold", async () => {
        await recordStatus(this.env, p.projectId, "SSX-EMP-001", "held", blockers.join(" | "));
        await this.env.DB.prepare("UPDATE projects SET status = 'held' WHERE project_id = ?").bind(p.projectId).run();
      });
      return { projectId: p.projectId, status: "held", blockers };
    }

    await recordStatus(this.env, p.projectId, "SSX-EMP-001", "waiting-for-approval", "Waiting for Dale's release decision.");
    const approval = await step.waitForEvent<{ approved: boolean; note?: string }>("Dale project release", {
      event: "dale-project-release",
      timeout: "30 days"
    });

    if (!approval.payload.approved) {
      await step.do("Oscar records release rejection", async () => {
        await this.env.DB.prepare("UPDATE projects SET status = 'held' WHERE project_id = ?").bind(p.projectId).run();
      });
      return { projectId: p.projectId, status: "held", note: approval.payload.note };
    }

    const piper = await step.do("Piper prepares approved presentations and exports", async () =>
      completeAssignment(this.env, p, "SSX-EMP-012", "presentation-and-export", [duncan.outputRef, quincy.outputRef])
    );

    await step.do("Oscar closes assignments and team returns to standby", async () => {
      for (const id of Array.from({ length: 12 }, (_, index) => `SSX-EMP-${String(index + 1).padStart(3, "0")}`)) {
        await returnToStandby(this.env, p.projectId, id);
      }
      await this.env.DB.prepare("UPDATE projects SET status = 'released' WHERE project_id = ?").bind(p.projectId).run();
    });

    return { projectId: p.projectId, status: "released", outputRef: piper.outputRef };
  }
}
