# SSX Mason Forge Fulfillment Center — CSI 2026

This is the machine-readable fulfillment layer for the SSX estimating and scheduling system.

- **Divisions are warehouse zones**
- **CSI sections are aisles**
- **Activities are individually barcoded inventory**
- **Uploaded plans create the project pick list**
- **Mason Forge pulls only applicable records into a project-specific estimate and schedule**
- **The source Markdown libraries remain unchanged**

## Current inventory

- 35 active divisions
- 3,138 CSI sections
- 47,620 potential activities

## Operating rule

The master catalog does not guess project duration. Each selected activity receives its project-specific quantity, crew, production rate, working calendar, holiday calendar, weather model, location, start and finish during project assembly.

## Files

- `manifest.json` — division-level inventory and counts
- `schema.json` — permanent ID and assembly rules
- `indexes/sections.json` — section-to-inventory locator
- `inventory/division-##.json` — complete section and activity inventory for each division
