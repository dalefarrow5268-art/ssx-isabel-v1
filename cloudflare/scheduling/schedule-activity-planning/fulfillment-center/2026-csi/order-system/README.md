# Mason Forge Order and Picking System

The uploaded plans are the order. The CSI 2026 catalog is the inventory. Mason Forge creates the pick list and assembles one project-specific estimate and schedule.

## Fulfillment flow

1. Receive and preserve every uploaded project document.
2. Read project location, working hours, labor rules, stored holidays, municipal restrictions, weather and hazards.
3. Detect supported divisions, sections, quantities, locations and source evidence.
4. Create the pick list and locate permanent section and activity barcodes.
5. Retrieve only applicable construction pieces and record every exception.
6. Build the estimate and schedule together through shared scope and section IDs.
7. Calculate time from quantity, production, crew, project calendars, holidays, weather and constraints.
8. Run the release checks in `validation-rules.json`.
9. Send conflicts, assumptions and low-confidence detections to Dale's review queue.
10. Release structured data to estimating, the living Schedule System, the synchronized Gantt bridge and exports.

## Non-negotiable rules

- Uploaded source documents remain unchanged.
- Master CSI inventory remains unchanged.
- Catalog existence is never evidence that an item belongs in a project.
- Master duration is never guessed.
- Every project item traces to source evidence and a permanent SSX barcode.
- Project-added activities are labeled as additions, never disguised as master inventory.
