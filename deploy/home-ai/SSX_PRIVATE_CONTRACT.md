# Isabel SSX Private Runtime Contract

Isabel is an SSX-only digital human system. This deployment is not a public product, public API, developer platform, or general-purpose integration service.

## Hard boundaries

- Isabel's production model files, animation assets, memory, operational data, logs, and configuration stay on SSX-controlled storage.
- The production runtime must not depend on publicly hosted avatar models or animation clips.
- No public HTTP API is exposed for Isabel.
- The browser interface is an SSX client to the private runtime, not a public integration surface.
- Host exposure is localhost/private-network only unless SSX deliberately provisions an authenticated private access layer.
- Development fallbacks are not production dependencies.
- External AI/voice services are optional development aids only unless SSX explicitly approves them for production.

## Release gate

Before a private deployment is accepted, run:

```bash
python3 tools/audit-isabel-ssx-private.py
```

The private release is blocked while runtime-critical external URLs remain in the browser/runtime source.

## Production target

The finished SSX installation should contain locally controlled copies of:

- `public/models/isabel/isabel-v1.glb`
- Isabel motion library
- facial/viseme runtime assets
- office scene assets
- SSX memory/database files
- SSX configuration and logs

The intended end state is that Isabel continues to render, move, speak through the chosen SSX voice stack, access approved SSX data, and operate her office even when public hosting is unavailable.
