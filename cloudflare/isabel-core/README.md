# SSX Isabel Core — Cloudflare First

This directory makes Cloudflare the primary runtime home for Isabel's stateful core. The browser office at `/live-office` no longer requires Unreal or a home GPU machine to function.

## Runtime split

- **Cloudflare Worker**: public/private API edge and routing.
- **Durable Object (`IsabelSession`)**: canonical live session state, WebSocket coordination, activity/anchor/pose state, ordered revisions, and session-local audit trail.
- **D1 (`DB`)**: durable cross-session memory, commitments, work threads, integrations, and audit metadata.
- **R2 (`ASSETS`)**: reserved for documents, media, avatar assets, evidence, and larger files.
- **Browser renderer**: `/live-office` renders Isabel's office directly in the user's browser. No Pixel Streaming is required.
- **Unreal**: preserved at `/live-office/unreal` as an optional future high-end renderer, not a dependency of Isabel core.

## Account-specific resources required before first deploy

1. Create D1 database `ssx-isabel` and replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml`.
2. Create R2 bucket `ssx-isabel-assets`.
3. Apply `schema.sql` to D1.
4. Deploy this Worker.
5. Set the web application's `NEXT_PUBLIC_ISABEL_CORE_URL` to the deployed Worker HTTPS origin.
6. Set `ALLOWED_ORIGIN` to the exact private UI origin once known.
7. Protect the UI and Worker with Cloudflare Access before treating the environment as private production.

## Local/deployment commands

```bash
npx wrangler d1 execute ssx-isabel --remote --file=./schema.sql --config=./wrangler.toml
npx wrangler deploy --config=./wrangler.toml
```

## Security rules

- No arbitrary shell/console execution is exposed by the Worker.
- Browser commands are high-level allowlisted actions only.
- `OPEN_LIVE_SESSION` cannot bypass the `liveAllowed` gate.
- External actions are not replayed by session recovery.
- The Unreal renderer is optional and does not own canonical session truth.
- Cloudflare Access is required before production use with private/sensitive data.

## Browser environment

Set:

```text
NEXT_PUBLIC_ISABEL_CORE_URL=https://<worker-hostname>
```

If this variable is missing, `/live-office` clearly identifies itself as a local visual preview and does not pretend its state is persisted in Cloudflare.
