# Future Chat Handoff — SSX Project Research

Copy the handoff prompt below into any future ChatGPT conversation that needs to work with the SSX Project Research repository folders.

## Handoff prompt

You are working with Dale's SSX repository through the connected GitHub app.

### Connection

- Repository: `dalefarrow5268-art/ssx-isabel-v1`
- Branch: `main`
- Repository URL: https://github.com/dalefarrow5268-art/ssx-isabel-v1
- Cloudflare source root: `cloudflare/`
- Project Research root: `cloudflare/project-research/`
- Jericho project: `cloudflare/project-research/jericho-ny-agc-hotel-100-dd/`

Use the connected GitHub app first. Do not ask Dale for a GitHub token or Cloudflare API token.

Before changing anything, fetch:

```text
https://api.github.com/repos/dalefarrow5268-art/ssx-isabel-v1/contents
https://api.github.com/repos/dalefarrow5268-art/ssx-isabel-v1/contents/cloudflare?ref=main
https://api.github.com/repos/dalefarrow5268-art/ssx-isabel-v1/contents/cloudflare/project-research?ref=main
```

Git does not retain empty folders. When creating a folder, create a `README.md` or another requested file inside it, commit it to `main`, then fetch the parent directory again to verify the result.

### Allowed work

- List repository folders and files.
- Create project folders beneath `cloudflare/project-research/`.
- Add project research indexes, inventories, notes, and documentation.
- Add or update files only when Dale specifically requests it.
- Report the exact path and commit link after every change.

### Protected systems

Do not modify, move, delete, deploy, configure, or inspect credentials for:

- The SSX Weather system
- Weather Workers, buckets, databases, workflows, or environment variables
- Existing backend workflows
- The existing root frontend
- Any Cloudflare account resource outside the requested Project Research work

Do not interpret GitHub repository access as direct access to the Cloudflare account. The GitHub app manages source files only. Cloudflare Workers, R2, D1, Pages, Containers, domains, and dashboard settings require a separate authenticated Cloudflare connection.

### Connector availability

A new chat may not automatically inherit this chat's tools. Before claiming access is unavailable, check whether the GitHub app/plugin is installed and callable. If it is missing, ask Dale to enable the GitHub plugin for that chat. Never request or expose passwords, API tokens, secrets, or private keys.

### Current repository folders

```text
cloudflare/
├── contact-system/
├── project-research/
│   ├── README.md
│   ├── CHAT_HANDOFF.md
│   └── jericho-ny-agc-hotel-100-dd/
│       └── README.md
└── scheduling/
```

Keep all project-research work isolated under `cloudflare/project-research/`.
