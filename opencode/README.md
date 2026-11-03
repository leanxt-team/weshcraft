# WeshCraft for OpenCode 2 and OpenChamber

Two parts, both in this repository: the **OpenCode plugin** (tools, `/weshcraft`, the server) and the **OpenChamber extension** (the WeshCraft panel, a Work Status section and styled tool calls in the chat). Install the plugin for OpenCode alone; add the extension too in OpenChamber.

A native OpenCode 2 plugin (2.2 and later). OpenChamber runs on the OpenCode server and reads the same configuration, so the same plugin works there.

- WeshCraft starts with the project: one `weshcraft serve` per project on a stable port, shared by every session, stopped when the plugin unloads.
- Its tools are OpenCode tools, under the `weshcraft` namespace: `weshcraft_open` (the browser link), `weshcraft_status`, `_generate`, `_check`, `_links`, `_manifest`, `_read_spec`, `_write_notes`, `_sync`, `_publish`. With a live FigCraft attached, FigCraft's design tools are added under `figcraft`.
- `/weshcraft` gives the link, the parity result, front ⇄ back links and gaps, and open questions.
- Specs regenerate when a design, OpenAPI or MCP file is saved — by OpenCode, OpenChamber or you.

## Install

For OpenChamber, or every project on this machine:

```bash
node /path/to/weshcraft/bin/weshcraft.mjs init --client opencode --global
```

For one project (commit `.opencode/` to share it):

```bash
node /path/to/weshcraft/bin/weshcraft.mjs init --client opencode
```

That writes `plugins/weshcraft.js` under `~/.config/opencode` (`--global`) or `.opencode`: one line re-exporting `opencode/plugin.mjs` from your WeshCraft checkout. Restart OpenCode or OpenChamber; `opencode plugin list` should show `weshcraft`.

`--no-plugin` registers WeshCraft as an MCP server in `opencode.json` (`mcp.servers.weshcraft`) instead.

## What the plugin finds

In each project it looks in the root, `design/` and `api/` for `*.figcraft`, `weshcraft.surface.json`, `openapi.yaml|json` and `*.mcp.json`. With none, it stays idle (no tools, no process). Settings come from, in order of precedence, `.opencode/weshcraft.json` and the plugin's options in `opencode.json`:

```jsonc
// .opencode/weshcraft.json — or { "plugins": [{ "package": "./.opencode/plugins/weshcraft.js", "options": { … } }] }
{ "file": "design/app.figcraft", "surface": ["api/openapi.yaml"], "mcpServer": ["node dist/server.js"],
  "attach": 7979, "figcraftCli": "/path/to/figcraft-cli", "sync": "git", "port": 4650, "token": "…" }
```

`init` writes `.opencode/weshcraft.json` when you pass `--file`, `--surface`, `--mcp-server`, `--attach`, `--figcraft-cli` or `--sync`.

## OpenChamber extension

The repository root is an OpenChamber extension (`"openchamber"` in `package.json`, files in `openchamber/`). In OpenChamber: **Settings → Extensions**, paste the path of your WeshCraft checkout (or its git URL) into **Folder, ZIP, or URL**, choose **Add**, and allow it. It asks for one thing: a local service (it starts or finds the project's WeshCraft server).

- **Rail panel** (also a full-screen page): parity with its score, screens / MCP tools / endpoints / operations / links / gaps, and three lists — parity issues, every spec with its status, front ⇄ back gaps. A click opens the full WeshCraft view on that spec; in the desktop app it opens in the browser panel beside the chat. **Regenerate**, **Sync now** (when a sync target is set) and **Ask agent** (puts `/weshcraft` in the chat box). The rail icon shows a badge with parity errors + gaps.
- **Work Status section**: one line — in sync or not, links and gaps, what the front is; click opens WeshCraft.
- **Chat**: `weshcraft_*` and `figcraft_*` calls get their own icon and title; `weshcraft_read_spec` renders as markdown, status, check and links as a JSON tree.
- Native look: the panel uses OpenChamber's UI kit and theme tokens, light and dark, and follows the open project.

The panel and section talk to `openchamber/service/main.js`, which reuses the plugin's bridge, so the plugin's tools, the panel and every session share one WeshCraft server per project (same port). A project with nothing to spec shows **Set up with the agent** (`/wesh-plan-view-mode new`).

Rebuild the frames after editing `openchamber/src/` (needs `npm install` for the dev dependencies):

```bash
npm run build:openchamber
```

## Notes

- Tool calls are proxied to the server's `/mcp` endpoint, so the plugin, the browser view and any MCP client always agree. Stopping a session cancels the call in flight (`context.signal`).
- The server binds 127.0.0.1 unless a `token` is set; nothing is pushed unless `sync` is configured with a push.
- Server plugins have no UI of their own: in OpenCode, `/weshcraft` and the tools report status; in OpenChamber, the extension above shows it.
