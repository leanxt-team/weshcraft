# WeshCraft for OpenCode and OpenChamber

Two parts in this repository, used together:

| | What it adds | Where |
|---|---|---|
| **OpenCode plugin** (`opencode/plugin.mjs`) | WeshCraft's tools for the agent (`design_*`, `weshcraft_*`), the `/weshcraft` command, and the WeshCraft server for the project | OpenCode 2.2+, and OpenChamber (it runs on the OpenCode server) |
| **OpenChamber extension** (`openchamber/`, manifest in `package.json`) | **Rail panel**: the whole WeshCraft interface (design editor, prototype, specs, links), in OpenChamber's theme. Sync with GitHub / GitLab / this repository from its **⋯** menu | OpenChamber 2.0.1+, web and desktop |

## How it feels

Open a session in a repository:

- **It already has WeshCraft work** (a design chosen before, `design/*.figcraft`, or the only `.figcraft` in the repo): the rail panel shows it right away. Change it by hand in the panel, or ask the agent ("make the sign-up button say Join"); either way the canvas, the prototype and the specs update within a second, and both see each other's changes. Switching branches switches the design.
- **It has several designs**: the panel lists them; pick one, it is remembered for the project (`.weshcraft.json`).
- **It has none**: start one in the panel (pick a screen size), or ask the agent ("start a WeshCraft design for the checkout"). Then it is the first case: the agent gets its design tools as soon as the design exists, the panel shows what the agent builds.

## Install

1. The plugin, for every project on this machine (OpenCode and OpenChamber read the same folder):

   ```bash
   node /path/to/weshcraft/bin/weshcraft.mjs init --client opencode --global
   ```

   or for one project (commit `.opencode/` to share it): `init --client opencode`.
2. The extension: in OpenChamber, **Settings → Extensions**, paste the path of your WeshCraft folder (or its git URL) into **Folder, ZIP, or URL**, choose **Add**, and allow it. It asks for one permission: a local service, which runs this project's WeshCraft.
3. Restart OpenCode / reload OpenChamber.

## The rail panel (WeshCraft)

**Functions** is how the product works at a glance: who uses it → its functions (each with a purpose, in journey order, with where it leads) → the data they read and write. Click one to see its screens, operations and data, and its section of `specs/FUNCTIONS.md` opens in the spec panel. Suggested from the prototype until you keep them; then rename them, give each a purpose and its screens (✎, **+ Function**, or a screen's **Function** field in the editor), or ask the agent. Screen specs, the API spec, the maps and the editor's screen list follow them.

The WeshCraft icon on the right opens the full interface for the open project. Its header is one line: the views (**Functions · Design · Prototype · Front ⇄ back · Manifest**) on the left; on the right the **Specs** menu, the parity and **⋯** for the actions (Regenerate, Regenerate all, Open .figcraft, Publish & sync, Download zip, Open prototype in a new tab). Sync is set up and run from **⋯** too (see Sync below).

The spec list, the view and the spec sit side by side. The **Specs** menu in the header has two ticks, **Spec list** and **Spec panel**: tick one, both or neither, at any width. The spec is on by default in every view, and picking a spec anywhere (the list, the parity, the links map) shows it. While designing, the spec follows the screen being edited (the inspector is the design inspector only), and the spec list starts unticked, since the editor has its own screens and layers: tick it to see all three. Each view remembers its own choice for the visit. Drag the divider between two blocks to make one wider (the spec list, the spec, the editor's screens and its inspector); double-click a divider to reset it. Widths last for the visit. Narrow, the panel shows one view at a time with a tab bar at the bottom (Specs · Design · Prototype · Links · Spec). The same page is in **Extension pages › WeshCraft** full screen. It uses OpenChamber's colours, font, radius and light/dark theme, follows the open project (OpenChamber names it, so the header does not), and puts a dot on the rail icon when the specs are out of sync or a sync failed.

**Open in a new tab** (the prototype, a spec, the zip) uses the address you reach OpenChamber with. On this machine (`localhost`), links go to WeshCraft's server. From another machine (a LAN address, a Tailscale name), the extension's service shares the built prototype, specs and zip on that address: on WeshCraft's port + 1000 (between 5600 and 5919), read-only, and behind a token the link carries. The WeshCraft server and its API stay on this machine's loopback. If only OpenChamber's own port is reachable (an HTTPS reverse proxy or a tunnel), forward that port too.

Each page is one self-contained HTML file (script and styles inline), so it works however an OpenChamber version serves package files. Extension pages cannot reach the network themselves, so the page talks to WeshCraft through the extension's service: API calls, live updates (long-polled), the prototype (loaded as HTML), uploads (sent in 45 KB chunks). Downloads and links to other sites open through OpenChamber (in the desktop app, in its browser panel).

## Sync

From the panel's **⋯** menu: **Publish & sync…** sets where the specs go (a GitHub or GitLab repository and branch, with a pull / merge request, or this repository's git) and **Sync now** runs it. With auto-sync on, every regeneration that matches the design is synced; a failed sync puts a dot on the rail icon and says why in the panel's log line.

## GitHub / GitLab access is inherited

No token to paste. WeshCraft uses, in this order:

1. a token typed in the publish dialog, if any;
2. `GITHUB_TOKEN` / `GH_TOKEN`, `GITLAB_TOKEN` / `GL_TOKEN` from OpenCode's environment;
3. **the account you signed in to in OpenChamber** (Settings › Integrations; read from `~/.config/openchamber`, or `$OPENCHAMBER_DATA_DIR`), including GitHub Enterprise and self-managed GitLab instances, and following OpenChamber's own choice when it is set to use your CLI login;
4. your `gh` / `glab` CLI login;
5. git's credential helper for the host (what `git push` uses).

The panel and the publish dialog say which one is used ("Access: your OpenChamber account (login)"); the token itself never leaves the WeshCraft server. Local git sync commits with your git setup and never switches branches.

## The plugin

- WeshCraft starts with the project: one `weshcraft serve` per project on a stable port, shared by every session, by the OpenChamber panels and by your browser; stopped when the plugin unloads.
- With no design yet, the plugin watches for one: when the user starts it in the panel (or another session does), the agent gets the design tools without a restart.
- Tools: `design_*` (tree, find, get, edit — batched, one undo step —, text, bind, api, link, screen, tokens, functions, undo/redo, new), `weshcraft_*` (status, generate, check, links, trace, manifest, read_spec, write_notes, sync, publish, open) and `figcraft_*` with a live FigCraft. Every design change regenerates the specs; the user sees it live.
- A project with nothing to spec gets one tool, `weshcraft_start`; after it, `design_new` creates the design and the editing tools appear.
- `/weshcraft` gives the link, parity, front ⇄ back links and open questions.
- Settings: `.opencode/weshcraft.json` or the plugin's options in `opencode.json` (`file`, `surface`, `mcpServer`, `attach`, `figcraftCli`, `sync`, `port`, `token`). `--no-plugin` registers WeshCraft as an MCP server in `opencode.json` instead.

## Tests

`npm test` (unit). `npm run test:openchamber` runs the extension end to end in a browser against a stand-in for OpenChamber built from its source (sandboxed frames, its CSP and message schema, HTML-only serving), including the session flow above with the real plugin as the agent.

## Rebuild the extension pages

After editing `openchamber/src/` or the browser app (`src/web/public/`):

```bash
npm install
```

```bash
npm run build:openchamber
```

## When something is wrong

The panels and the page say it in place: "OpenChamber has not connected this panel yet" (enable WeshCraft in Settings → Extensions, OpenChamber 2.0.1+), "Allow the WeshCraft service…" (approve the service), "No GitHub access found" (sign in in OpenChamber or run `gh auth login`).
