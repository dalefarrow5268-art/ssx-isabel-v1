# SSX Contact System Cloudflare Backend

Authoritative backend package is the verified SSX Contact System V3 build from Mason Forge.

Target runtime: Cloudflare Worker + D1 + R2.

Required bindings:
- D1: `DB` -> `ssx-contact-system`
- R2: `ATTACHMENTS` -> `ssx-contact-attachments`
- Static assets binding: `ASSETS`

API contract:
- POST `/api/intake`
- GET `/api/intake/:id`
- GET `/api/tasks`
- GET `/api/tasks/summary`
- PATCH `/api/tasks/:id`
- GET `/api/health`

Scheduled Dale digests: 8 AM, 12 PM, 4 PM America/Chicago.

The Vercel `/contact/` page should remain a static frontend. The processing/database backend belongs on Cloudflare and the UI should point to the Worker endpoint once the Worker deployment URL is confirmed.
