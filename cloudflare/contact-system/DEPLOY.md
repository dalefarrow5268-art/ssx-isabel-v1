# SSX Contact System — Cloudflare Deploy

Backend source: `cloudflare/contact-system/`

## One-time Cloudflare setup

```bash
cd cloudflare/contact-system
npx wrangler login
npx wrangler d1 create ssx-contact-system
npx wrangler r2 bucket create ssx-contact-attachments
```

Copy the D1 `database_id` returned by Cloudflare into `wrangler.toml`.

## Initialize database

```bash
npx wrangler d1 execute ssx-contact-system --remote --file=migrations/0001.sql
```

## Deploy Worker

```bash
npx wrangler deploy
```

## Verify

```bash
curl https://ssx-contact-intake.<your-subdomain>.workers.dev/api/health
```

Expected: `{ "ok": true, "service": "ssx-contact-intake", "version": "v3" }`

## Connect frontend

Set `NEXT_PUBLIC_SSX_CONTACT_API` on the Vercel project to the Worker origin, for example:

`https://ssx-contact-intake.<your-subdomain>.workers.dev`

Then redeploy the Vercel frontend.

## Required backend bindings

- D1 `DB` -> `ssx-contact-system`
- R2 `ATTACHMENTS` -> `ssx-contact-attachments`

The Worker already implements intake upload/paste, R2 file storage, D1 intake/task persistence, task list/update/summary, CORS, health checks, and scheduled digest records.
