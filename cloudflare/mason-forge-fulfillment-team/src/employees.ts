export type EmployeeStatus = "standby" | "assigned" | "working" | "waiting-for-input" | "waiting-for-approval" | "completed" | "exception" | "held";

export type EmployeeDefinition = {
  employeeId: string;
  name: string;
  title: string;
  order: number;
  handler: string;
};

export const EMPLOYEES: EmployeeDefinition[] = [
  {
    "employeeId": "SSX-EMP-001",
    "name": "Oscar Orchestrator",
    "title": "Director of Project Fulfillment",
    "order": 1,
    "handler": "oscar_orchestrator"
  },
  {
    "employeeId": "SSX-EMP-002",
    "name": "Ivy Intake",
    "title": "Project Intake and Document Control Coordinator",
    "order": 2,
    "handler": "ivy_intake"
  },
  {
    "employeeId": "SSX-EMP-003",
    "name": "Dexter Decoder",
    "title": "Document Extraction Specialist",
    "order": 3,
    "handler": "dexter_decoder"
  },
  {
    "employeeId": "SSX-EMP-004",
    "name": "Reggie Rules",
    "title": "Project Requirements Coordinator",
    "order": 4,
    "handler": "reggie_rules"
  },
  {
    "employeeId": "SSX-EMP-005",
    "name": "Penny Plancheck",
    "title": "Plans and Specifications Review Lead",
    "order": 5,
    "handler": "penny_plancheck"
  },
  {
    "employeeId": "SSX-EMP-006",
    "name": "Parker Picker",
    "title": "Construction Inventory Fulfillment Specialist",
    "order": 6,
    "handler": "parker_picker"
  },
  {
    "employeeId": "SSX-EMP-007",
    "name": "Esther Estimates",
    "title": "Senior Project Estimator",
    "order": 7,
    "handler": "esther_estimates"
  },
  {
    "employeeId": "SSX-EMP-008",
    "name": "Sally Sequence",
    "title": "Construction Schedule Builder",
    "order": 8,
    "handler": "sally_sequence"
  },
  {
    "employeeId": "SSX-EMP-009",
    "name": "Wendy Weatherwise",
    "title": "Weather and Natural Hazard Analyst",
    "order": 9,
    "handler": "wendy_weatherwise"
  },
  {
    "employeeId": "SSX-EMP-010",
    "name": "Duncan Duration",
    "title": "Duration and Construction Logic Engineer",
    "order": 10,
    "handler": "duncan_duration"
  },
  {
    "employeeId": "SSX-EMP-011",
    "name": "Quincy Quality",
    "title": "Quality and Traceability Auditor",
    "order": 11,
    "handler": "quincy_quality"
  },
  {
    "employeeId": "SSX-EMP-012",
    "name": "Piper Presentations",
    "title": "Client Schedule and Export Coordinator",
    "order": 12,
    "handler": "piper_presentations"
  }
];

export function employee(employeeId: string): EmployeeDefinition {
  const found = EMPLOYEES.find((item) => item.employeeId === employeeId);
  if (!found) throw new Error(`Unknown SSX employee: ${employeeId}`);
  return found;
}
