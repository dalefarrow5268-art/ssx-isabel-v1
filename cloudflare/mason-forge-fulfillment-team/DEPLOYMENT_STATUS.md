# Deployment Status and Required Connections

## Active production adapters

- **Oscar Orchestrator** — accepts authenticated intake requests and R2 project-manifest events, creates one durable workflow per project and prevents duplicate workflow IDs.
- **Ivy Intake** — inventories all files beneath the project upload prefix, classifies documents, records R2 fingerprints, identifies exact duplicates and unsupported formats, writes the D1 document register and saves the full register to R2.
- **Dexter Decoder** — reads Ivy’s current-document register, extracts text records directly, routes binary construction files to the private SSX document processor, preserves source locators, writes extraction artifacts to R2 and searchable status records to D1.

## Implemented employment framework

- Named 12-person employee roster used directly by runtime code.
- Durable project Workflow with employee assignments in operational order.
- Parallel estimate, schedule and weather assignments where dependencies allow.
- D1 project, document, extraction and employee-status audit tables.
- Dale approval gate before presentation and release.
- Automatic return-to-standby after assignment closure.
- Safe implementation hold for employees whose production adapters are not yet connected.

## Required Cloudflare resources before deployment

1. D1 database `ssx-mason-forge`.
2. Private R2 bucket `ssx-project-files`.
3. Upload event Queue and dead-letter queue.
4. R2 event notification for uploaded `project-intake.json` objects.
5. Fulfillment Queue.
6. Private `ssx-document-processor` service or Container binding.
7. Actual resource identifiers in `wrangler.jsonc`.
8. `INTERNAL_API_TOKEN` stored as a Cloudflare secret.
9. Existing SSX Weather Center URL.
10. D1 migrations applied in numerical order.
11. Controlled test project before Dale authorizes production.

## Remaining employee adapters

Reggie Rules, Penny Plancheck, Parker Picker, Esther Estimates, Sally Sequence, Wendy Weatherwise, Duncan Duration, Quincy Quality and Piper Presentations.

The system remains fail-closed. Missing services or adapters create explicit holds and can never be mistaken for completed project work.
