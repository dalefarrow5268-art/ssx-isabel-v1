# Deployment Status and Required Connections

## Active production adapters

- **Oscar Orchestrator** — accepts authenticated intake requests and R2 project-manifest events, creates one durable workflow per project and prevents duplicate instance IDs.
- **Ivy Intake** — inventories all files beneath the project upload prefix, classifies documents, records R2 fingerprints, identifies exact duplicates and unsupported file types, writes the D1 document register and saves the full register to R2.

## Implemented employment framework

- Named 12-person employee roster used directly by runtime code.
- Durable project Workflow with employee assignments in operational order.
- Parallel estimate, schedule and weather assignments where dependencies allow.
- D1 project and employee-status audit tables.
- Dale approval gate before presentation and release.
- Automatic return-to-standby after assignment closure.
- Safe implementation hold for employees whose production adapters are not yet connected.

## Required Cloudflare resources before deployment

1. D1 database `ssx-mason-forge`.
2. Private R2 bucket `ssx-project-files`.
3. Upload event Queue `ssx-project-upload-events` and DLQ `ssx-project-upload-events-dlq`.
4. R2 event notification for uploaded `project-intake.json` objects.
5. Fulfillment Queue `ssx-mason-forge-fulfillment`.
6. Actual resource identifiers in `wrangler.jsonc`.
7. `INTERNAL_API_TOKEN` stored as a Cloudflare secret.
8. Existing SSX Weather Center URL.
9. D1 migrations applied in numerical order.
10. Controlled test project before Dale authorizes production.

## Remaining employee adapters

Dexter Decoder, Reggie Rules, Penny Plancheck, Parker Picker, Esther Estimates, Sally Sequence, Wendy Weatherwise, Duncan Duration, Quincy Quality and Piper Presentations.

The system remains fail-closed. Missing adapters create an explicit hold and can never be mistaken for completed project work.
