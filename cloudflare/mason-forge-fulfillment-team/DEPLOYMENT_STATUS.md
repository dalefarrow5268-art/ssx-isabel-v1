# Deployment Status and Required Connections

## What is implemented

- Named 12-person employee roster used directly by runtime code.
- Event-driven project intake endpoint.
- Durable project Workflow with employee assignments in operational order.
- Parallel estimate, schedule and weather assignments where dependencies allow.
- D1 project and employee-status audit tables.
- R2 employee work-product storage.
- Dale approval gate before presentation and release.
- Automatic return-to-standby after assignment closure.
- Safe implementation hold: employees cannot falsely release a project until each production adapter is connected.

## Required before first live project

1. Create or identify D1 database `ssx-mason-forge`.
2. Create or identify private R2 bucket `ssx-project-files`.
3. Create Queue `ssx-mason-forge-fulfillment` and dead-letter queue.
4. Add actual IDs to `wrangler.jsonc`.
5. Store `INTERNAL_API_TOKEN` as a Cloudflare secret.
6. Connect the existing SSX Weather Center URL.
7. Implement and test each employee’s production adapter:
   - document classification and fingerprinting
   - OCR and drawing/spec extraction
   - requirements extraction
   - scope detection
   - warehouse barcode search
   - estimating
   - scheduling
   - weather/hazard analysis
   - duration/logic
   - quality validation
   - presentation/export
8. Apply D1 migration.
9. Run a controlled test project.
10. Dale approves production activation.

## Important

The workflow is intentionally fail-closed. Until the production adapters are connected, every employee produces an auditable `adapter-required` result and Oscar places the project on hold. This prevents a skeleton system from pretending it completed a real estimate or schedule.
