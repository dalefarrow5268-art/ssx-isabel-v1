# Future Chat Handoff — Cloudflare Source Projects

Use this handoff for future chats that need to create or manage project source folders in Dale's SSX repository.

## Repository connection

- GitHub repository: `dalefarrow5268-art/ssx-isabel-v1`
- Branch: `main`
- Repository URL: https://github.com/dalefarrow5268-art/ssx-isabel-v1
- Folder root for Cloudflare-related projects: `cloudflare/`

Use the connected GitHub app. Do not ask Dale for GitHub passwords, personal access tokens, Cloudflare API tokens, or other secrets.

Before changing anything, fetch:

```text
https://api.github.com/repos/dalefarrow5268-art/ssx-isabel-v1/contents
https://api.github.com/repos/dalefarrow5268-art/ssx-isabel-v1/contents/cloudflare?ref=main
```

## Creating a new project folder

When Dale requests a new project, create a new sibling folder directly under:

```text
cloudflare/<project-name>/
```

Do not automatically place new projects inside `cloudflare/project-research/`. That is one existing project area, not the required parent for future projects.

Confirm or derive a short lowercase kebab-case folder name from Dale's requested project name. Git does not retain empty folders, so create:

```text
cloudflare/<project-name>/README.md
```

The README should state the project's name and purpose. Commit the file to `main`, fetch `cloudflare/` again, and report the exact path and commit link.

## Default execution behavior

When Dale names a new project and asks to create its folder, that request authorizes the complete safe folder-creation operation: derive the kebab-case name, confirm the path is unused, create `cloudflare/<project-name>/README.md`, commit it to `main`, and verify it.

Do not ask for repeated approval between these safe steps. Pause only if the proposed path already exists, the requested action would alter or delete protected content, required access is unavailable, or the project name cannot be derived reliably.

## Allowed actions

- List files and folders in the repository.
- Create a new project folder directly under `cloudflare/` when Dale asks.
- Add files within the new project folder when Dale asks.
- Update a project only when Dale identifies that project and requests the change.
- Verify every write by fetching the affected folder again.

## Safety boundaries

Treat every existing folder as protected unless Dale explicitly names it as the target.

Do not modify, move, delete, deploy, configure, or inspect credentials for:

- The SSX Weather system
- Weather Workers, buckets, databases, workflows, or environment variables
- Existing backend workflows
- The existing root frontend
- Existing Cloudflare project folders that are unrelated to the request

Never reuse an existing project folder for a new project. Never overwrite an existing path without first fetching it and confirming that it is the requested target.

## Important access distinction

The connected GitHub app provides access to repository source files. It does not by itself provide direct Cloudflare account access. Do not claim access to the Cloudflare dashboard, deployed Workers, R2, D1, Pages, Containers, domains, or account settings unless a separate authenticated Cloudflare connection is actually available.

A future chat may not inherit the GitHub app automatically. Before saying access is unavailable, check whether the GitHub plugin is installed and callable. If it is missing, ask Dale to enable the GitHub plugin for that chat. Never request secrets in chat.
