# Mason Forge Fulfillment Team

This service employs the 12 named SSX fulfillment staff recorded in `cloudflare/ssx-hr`.

## Employment behavior

- Employees remain in **standby** when no project is assigned.
- POSTing a valid project intake starts one durable project workflow.
- Oscar assigns the work in dependency order.
- Esther, Sally and Wendy may work concurrently after Parker finishes the pick list.
- Quincy independently audits the assembled work.
- Dale controls project release.
- Piper publishes only an approved package.
- All employees return to standby when the project assignment closes.

## Current activation level

The event-driven employment framework is implemented. Production adapters and Cloudflare resource bindings must be connected before live project automation can be activated. The workflow fails closed and cannot claim project completion while an adapter is missing.
