import type { Env, ProjectIntake, WorkResult } from "../types";
import { recordStatus } from "../work";

type DexterItem = { documentId: string; fileName: string; outputRef: string; status: string };
type DexterRegister = { results: DexterItem[] };
type Locator = { documentId: string; fileName: string; locator: string; excerpt: string };

type Requirement = {
  requirementId: string;
  category: string;
  value: string;
  normalizedValue: string | null;
  confidence: number;
  evidence: Locator[];
  status: "detected" | "conflict" | "confirmation-required";
};

const RULES = [
  { category: "working-hours", patterns: [/work(?:ing)? hours?[^.\n]{0,100}/gi, /construction hours?[^.\n]{0,100}/gi, /(?:monday|mon\.)\s*(?:through|to|-)\s*(?:friday|fri\.)[^.\n]{0,100}/gi] },
  { category: "union-status", patterns: [/\bnon[- ]?union\b/gi, /\bopen shop\b/gi, /\bunion labor\b/gi, /project labor agreement|\bPLA\b/gi] },
  { category: "wage-requirement", patterns: [/prevailing wage[^.\n]{0,100}/gi, /Davis[- ]Bacon[^.\n]{0,100}/gi, /certified payroll[^.\n]{0,100}/gi] },
  { category: "weekend-work", patterns: [/weekend work[^.\n]{0,100}/gi, /saturday work[^.\n]{0,100}/gi, /sunday work[^.\n]{0,100}/gi] },
  { category: "holiday-work", patterns: [/holiday(?:s)?[^.\n]{0,120}/gi] },
  { category: "night-work", patterns: [/night work[^.\n]{0,100}/gi, /after[- ]hours[^.\n]{0,100}/gi] },
  { category: "noise-restriction", patterns: [/noise (?:restriction|ordinance|limit)[^.\n]{0,120}/gi, /quiet hours?[^.\n]{0,100}/gi] },
  { category: "delivery-window", patterns: [/deliver(?:y|ies)[^.\n]{0,120}/gi] },
  { category: "inspection-window", patterns: [/inspection(?:s)?[^.\n]{0,120}/gi] },
  { category: "shutdown-window", patterns: [/shutdown(?:s)?[^.\n]{0,120}/gi, /tie[- ]in[^.\n]{0,120}/gi] },
  { category: "permit", patterns: [/permit(?:s|ting)?[^.\n]{0,120}/gi] },
  { category: "ahj", patterns: [/authority having jurisdiction[^.\n]{0,120}/gi, /fire marshal[^.\n]{0,120}/gi] }
];

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

function normalize(category: string, value: string): string | null {
  const v = value.toLowerCase();
  if (category === "union-status") {
    if (/non[- ]?union|open shop/.test(v)) return "non-union";
    if (/project labor agreement|\bpla\b/.test(v)) return "PLA";
    if (/union labor/.test(v)) return "union";
  }
  if (category === "wage-requirement") {
    if (/davis[- ]bacon/.test(v)) return "Davis-Bacon";
    if (/prevailing wage/.test(v)) return "prevailing-wage";
  }
  return null;
}

async function loadExtraction(env: Env, item: DexterItem) {
  const object = await env.PROJECT_FILES.get(item.outputRef);
  if (!object) return null;
  return object.json<{ text: string; locators?: Array<{ locator: string; start: number; end: number }> }>();
}

export async function reggieRules(env: Env, intake: ProjectIntake, inputRefs: string[]): Promise<WorkResult> {
  await recordStatus(env, intake.projectId, "SSX-EMP-004", "working", "Reviewing project calendars, labor rules and governing requirements.");
  const dexterRef = inputRefs[0];
  const object = dexterRef ? await env.PROJECT_FILES.get(dexterRef) : null;
  if (!object) {
    const summary = "Reggie could not locate Dexter's extraction register.";
    await recordStatus(env, intake.projectId, "SSX-EMP-004", "exception", summary);
    return { projectId: intake.projectId, employeeId: "SSX-EMP-004", status: "exception", outputRef: "", summary, exceptions: [summary] };
  }

  const register = await object.json<DexterRegister>();
  const findings: Requirement[] = [];
  let sequence = 0;

  for (const item of register.results.filter((entry) => entry.status === "extracted")) {
    const extraction = await loadExtraction(env, item);
    if (!extraction?.text) continue;
    for (const rule of RULES) {
      for (const pattern of rule.patterns) {
        pattern.lastIndex = 0;
        for (const match of extraction.text.matchAll(pattern)) {
          const value = compact(match[0]);
          sequence++;
          const locator = extraction.locators?.find((loc) => match.index! >= loc.start && match.index! <= loc.end)?.locator || "document text";
          findings.push({
            requirementId: `${intake.projectId}-REQ-${String(sequence).padStart(5, "0")}`,
            category: rule.category,
            value,
            normalizedValue: normalize(rule.category, value),
            confidence: 0.72,
            evidence: [{ documentId: item.documentId, fileName: item.fileName, locator, excerpt: value }],
            status: "detected"
          });
        }
      }
    }
  }

  const requirements: Requirement[] = [];
  const conflicts: string[] = [];
  for (const finding of findings) {
    const existing = requirements.find((r) => r.category === finding.category && (r.normalizedValue || r.value.toLowerCase()) === (finding.normalizedValue || finding.value.toLowerCase()));
    if (existing) existing.evidence.push(...finding.evidence);
    else requirements.push(finding);
  }

  for (const category of ["union-status", "working-hours"]) {
    const values = new Set(requirements.filter((r) => r.category === category).map((r) => r.normalizedValue || r.value.toLowerCase()));
    if (values.size > 1) {
      requirements.filter((r) => r.category === category).forEach((r) => r.status = "conflict");
      conflicts.push(`Conflicting ${category} requirements require Dale's confirmation.`);
    }
  }

  const requiredMissing = [
    ["working-hours", "Daily project working hours were not located."],
    ["union-status", "Union/non-union/PLA status was not located."]
  ].filter(([category]) => !requirements.some((r) => r.category === category));

  const reviewItems = [
    ...conflicts,
    ...requiredMissing.map(([, message]) => message)
  ];
  const outputRef = `projects/${intake.projectId}/employee-work/SSX-EMP-004-project-requirements.json`;
  const packageData = {
    schemaVersion: "1.0.0",
    projectId: intake.projectId,
    preparedBy: { employeeId: "SSX-EMP-004", name: "Reggie Rules" },
    generatedAt: new Date().toISOString(),
    holidayCalendar: {
      masterReference: "SSX-20-YEAR-HOLIDAY-CALENDAR",
      treatmentStatus: "project-treatment-required"
    },
    requirements,
    reviewQueue: reviewItems.map((question, index) => ({
      reviewId: `${intake.projectId}-REG-REV-${String(index + 1).padStart(4, "0")}`,
      severity: "blocking",
      question,
      status: "open"
    }))
  };

  await env.PROJECT_FILES.put(outputRef, JSON.stringify(packageData, null, 2), { httpMetadata: { contentType: "application/json" } });

  for (const requirement of requirements) {
    await env.DB.prepare(
      `INSERT INTO project_requirements
       (requirement_id, project_id, category, value_text, normalized_value, confidence, status, evidence_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(requirement_id) DO UPDATE SET
         value_text=excluded.value_text, normalized_value=excluded.normalized_value,
         confidence=excluded.confidence, status=excluded.status, evidence_json=excluded.evidence_json`
    ).bind(requirement.requirementId, intake.projectId, requirement.category, requirement.value, requirement.normalizedValue, requirement.confidence, requirement.status, JSON.stringify(requirement.evidence)).run();
  }

  for (const item of packageData.reviewQueue) {
    await env.DB.prepare(
      `INSERT INTO project_review_queue
       (review_id, project_id, employee_id, severity, question, status, created_at)
       VALUES (?, ?, 'SSX-EMP-004', ?, ?, 'open', datetime('now'))
       ON CONFLICT(review_id) DO UPDATE SET question=excluded.question, status='open'`
    ).bind(item.reviewId, intake.projectId, item.severity, item.question).run();
  }

  const status = reviewItems.length ? "waiting-for-input" : "completed";
  const summary = `Reggie recorded ${requirements.length} project requirements and opened ${reviewItems.length} review items.`;
  await recordStatus(env, intake.projectId, "SSX-EMP-004", status, summary);
  return { projectId: intake.projectId, employeeId: "SSX-EMP-004", status, outputRef, summary, exceptions: reviewItems };
}
