# WeshCraft

**Design in FigCraft, get front-end and back-end specs that match the prototype exactly — live in the browser, checked in CI, published to GitHub or GitLab.**

WeshCraft sits between [FigCraft](https://github.com/storytold/figcraft) (open-source interface design and prototyping, with an MCP server) and your repository:

```
 Agent (Claude Code, /wesh-plan-view-mode)            You, in the browser (weshcraft serve)
        │  figcraft_* tools  ·  weshcraft_* tools             │  prototype · spec builder · parity · publish
        ▼                                                     ▼
 ┌──────────────────────── WeshCraft ─────────────────────────────────────────┐
 │ MCP proxy ─► FigCraft MCP (figcraft-cli mcp | --attach <port>) or .figcraft │
 │ snapshot ─► manifest (every screen, text, interaction, component, token,    │
 │             entity, operation, with node ids and fingerprints)              │
 │ prototype/index.html  (clickable, rendered from the same model)             │
 │ specs/front/**  specs/back/**  ◄── generated in parallel, + optional agent  │
 │ parity check: specs ⇄ manifest ⇄ prototype                                  │
 └──────────────┬──────────────────────────────────────────────────────────────┘
                ▼
     GitHub PR / GitLab MR  +  CI job that re-checks parity on every push
```

- **Iterate in FigCraft over MCP.** WeshCraft proxies FigCraft's full MCP tool set (`figcraft_create_node`, `figcraft_batch`, `figcraft_run_command`, …). Every edit triggers a debounced regeneration, so specs follow the design while you work.
- **A clean, native-feeling workspace.** Liquid Glass styling: floating translucent panes, capsule controls, system type and colours, dense macOS-style lists, light and dark. It switches to solid materials when the system asks for reduced transparency or more contrast, and turns off motion for reduced motion. On phones it becomes an iOS-style app: one full-height view at a time, a floating tab bar (Specs · Prototype · Links · Spec), 44 pt rows, an action sheet and bottom-sheet dialogs, safe areas respected, screens scaled to fit.
- **Specs built in parallel, shown live.** One job per screen, per component, plus tokens, flows, domain model, API (with OpenAPI 3.1) and conventions. The browser's **Spec builder** section shows each job queue, write, get enriched by an agent (streamed) and finish.
- **Specs match the visual prototype.** Each spec embeds a machine-readable contract (an HTML comment). `weshcraft check` compares it with a fresh extraction of the design: copy verbatim on its row, interactions and destinations, component instances and variants, inputs, frame sizes, tokens and values, navigation edges, entities and operations, and that the pushed prototype was built from the same design. Every spec line cites its layer as `#id`; click it in the browser and the prototype highlights that layer.
- **Services with little or no UI.** The "front" can be an **MCP server** (agents are the users) and/or a **public HTTP API** (developers are the users): give an OpenAPI file (JSON or YAML), an MCP `tools/list` dump, a live server (`--mcp-server "node server.js"`, introspected over stdio), or a `weshcraft.surface.json` combining them — with or without a FigCraft design. Each MCP tool and endpoint gets a spec (arguments, rules, safety hints, example call, acceptance criteria), API schemas become the domain model, tools are linked to the endpoints they call, and the prototype becomes a clean **catalog** of tools and endpoints. A changed schema makes its spec stale, like a changed screen.
- **Front ⇄ back links, highlighted everywhere.** WeshCraft maps every place the prototype meets the back end: a layer ▶ triggers an operation, ⇢ submits a field to it, ☰ is a list it fills, ◉ shows an entity field (and which operation loads it). You see it in `specs/LINKS.md` (tables + Mermaid map), in each screen spec, in `api.md` (“Front end”, “Response shown”) and `domain.md` (“Shown by”, “Loaded by”), in the browser's **Front ⇄ back** tab (an interactive wire map: click an element, an operation or a field to trace it and highlight its layers in the prototype), and as a **Data links** overlay on the prototype itself (click a layer to open its back-end spec). Gaps — data shown that nothing loads, operations nothing reaches — are flagged; link drift fails the parity check.
- **GitHub and GitLab.** One click (or `weshcraft publish`) commits `prototype/`, `specs/`, the `.figcraft` source and a CI parity job to a branch and opens or updates a PR/MR with the parity summary.
- **An advanced spec format, kept in git.** Design, prototype, contract-checked specs, links and a design changelog (`specs/CHANGES.md`, `weshcraft diff`) form one versioned folder ([format](docs/SPEC-FORMAT.md)). Updates say what changed in the design; sync commits and PR/MR descriptions carry that changelog.
- **Keep a repo in sync.** `--sync github:owner/repo`, `--sync gitlab:group/project` or `--sync git` commits after every regeneration that matches the prototype: to a branch through the API (PR/MR opened once, then updated; unchanged files make no commit), or in the local repository around the output folder, so Claude Code, OpenCode and your teammates see it in `git log` (push optional). Also from the browser (**Publish & sync**, sync pill) and from agents (`weshcraft_sync`).
- **wesh integration.** `wesh-bundle/` adds `/wesh-plan-view-mode` and the `wesh-spec-front` / `wesh-spec-back` skills to [wesh](https://github.com/leanxt-team/wesh).

No runtime dependencies: Node.js 20+ only.

## Quick start

```bash
git clone <your-remote>/weshcraft.git && cd weshcraft
npm test
```

```bash
npm run demo     # serves the Ridgeline example at http://127.0.0.1:4600/
```

With your own design:

```bash
node bin/weshcraft.mjs serve --file path/to/app.figcraft --out path/to/your/repo
```

The file is watched: save in FigCraft and the specs regenerate. Or drop a `.figcraft` file on **Open .figcraft** in the browser.

### An API or MCP server (no screens)

```bash
node bin/weshcraft.mjs serve --surface api/openapi.yaml --out .
```

```bash
node bin/weshcraft.mjs serve --mcp-server "node dist/server.js" --surface api/openapi.yaml --out .
```

`weshcraft.surface.json` (see [`examples/billing/`](examples/billing/)) names the parts and pins tool ⇄ endpoint links that names alone cannot tell:

```json
{ "weshcraft": "surface@1", "name": "Billing service", "api": "openapi.yaml", "mcp": "mcp-tools.json",
  "links": [{ "tool": "create_invoice", "endpoint": "POST /invoices" }, { "tool": "void_invoice", "endpoint": null }] }
```

Without links, a tool is matched to the endpoint whose `operationId` has the same words (`list_invoices` ⇄ `listInvoices`). A live `--mcp-server` is snapshotted to `design/<name>.mcp.json`, so CI checks the same tool list.

### In OpenCode 2 and OpenChamber (native plugin)

```bash
node bin/weshcraft.mjs init --client opencode --global
```

Installs the WeshCraft plugin for OpenCode 2.2+ and OpenChamber: WeshCraft starts with the project, its tools appear under the `weshcraft` namespace, `/weshcraft` reports status, and specs regenerate when design, OpenAPI or MCP files are saved. In OpenChamber, also add this folder in **Settings → Extensions**: a WeshCraft rail panel (parity, specs, links and gaps, open the full view in the browser panel), a Work Status line and styled WeshCraft tool calls in the chat. See [`opencode/README.md`](opencode/README.md).

### Live FigCraft over MCP

Build FigCraft's CLI (`cargo build --release -p figcraft-cli`, see FigCraft's `docs/mcp.md`), then either:

```bash
node bin/weshcraft.mjs serve --mcp --file app.figcraft --figcraft-cli /path/to/figcraft-cli
```

```bash
figcraft --control 7979
```

```bash
node bin/weshcraft.mjs serve --attach 7979 --figcraft-cli /path/to/figcraft-cli
```

`--attach` drives the running FigCraft app: you see the agent's edits on the canvas while the specs rebuild in the browser.

### In Claude Code or OpenCode (`/wesh-plan-view-mode`)

```bash
node bin/weshcraft.mjs init --client both --attach 7979 --figcraft-cli /path/to/figcraft-cli --sync git
```

That writes `.mcp.json` for Claude Code (a `weshcraft` stdio server that also serves the browser view) and the OpenCode 2 plugin under `.opencode/plugins/` with its settings in `.opencode/weshcraft.json`; both commit the specs in this repository after every in-sync run. Drop `--sync git` to commit yourself, or use `--sync github:owner/repo` to sync a branch on GitHub instead. Install the wesh update (below), restart Claude Code, run `/wesh-plan-view-mode`. The agent plans with you in rounds, puts each decision into the prototype, generates the specs, fans out sub-agents to enrich them with `wesh-spec-front` / `wesh-spec-back`, gates on parity and publishes when you say so.

## Commands

| Command | What it does |
|---|---|
| `serve [source]` | Browser workspace, SSE live updates, MCP over HTTP at `/mcp`, zip download. Binds to 127.0.0.1; any other host requires `--token`. |
| `mcp [source] [--web]` | MCP server on stdio (`figcraft_*` + `weshcraft_*` tools). `--web` also serves the browser view. |
| `generate [source] [--force] [--agent [CMD]]` | One run: prototype + all specs + parity. Exit 1 when out of sync. |
| `check --file F [--format text\|markdown\|json]` | Parity only, for CI. Exit 1 when out of sync. |
| `diff --file F [--against GIT_REF]` | What changed in the design since the specs on disk (or committed at a ref). |
| `publish [source] --provider github\|gitlab --repo R` | Commit and open/update a PR/MR. Token from `GITHUB_TOKEN` / `GITLAB_TOKEN`; `--api-url` for GitHub Enterprise or self-managed GitLab. |
| `zip [source] --zip F` | Everything a repo needs, as a zip. |
| `init [--client claude\|opencode\|both] [--global] [--no-plugin]` | Claude Code: MCP server in `.mcp.json`. OpenCode 2 / OpenChamber: native plugin (`.opencode/plugins/`, or `~/.config/opencode/plugins/` with `--global`); `--no-plugin`: MCP server in `opencode.json`. |

Source: `--file F` (offline), `--mcp` (spawns `figcraft-cli mcp`), or `--attach PORT` (running app); and/or non-visual fronts: `--surface FILE` (OpenAPI JSON/YAML, MCP tool list, `weshcraft.surface.json`; repeatable) and `--mcp-server "CMD"` (repeatable).

### MCP tools

| Tool | |
|---|---|
| `figcraft_*` | FigCraft's own tools, unchanged (only with `--mcp` / `--attach`). Mutating calls schedule a regeneration. |
| `weshcraft_status` | Summary, jobs, parity, live URL. |
| `weshcraft_generate {force?}` | Snapshot + prototype + parallel spec jobs + parity. |
| `weshcraft_check` | Parity issues with file, check and node id. |
| `weshcraft_manifest {screen?}` | The extracted inventory. |
| `weshcraft_links {screen?, op?, field?}` | Front ⇄ back links and gaps, filtered. |
| `weshcraft_read_spec {path}` / `weshcraft_write_notes {path, notes}` | Read a spec; replace only its Notes block. |
| `weshcraft_publish {provider, repo, branch?, base?, apiUrl?}` | One-off PR / MR. |
| `weshcraft_sync {target?, auto?, pr?, push?}` | Sync now; with `target` (`github:o/r@b`, `gitlab:g/p@b`, `git@b`) also sets where, and `auto` keeps syncing after every in-sync run. |

## What gets generated

```
prototype/index.html        clickable prototype (FigCraft prototype links wired, data-node ids)
prototype/screens/*.png     FigCraft renders (live MCP only), the visual reference
prototype/figcraft/*.html   FigCraft Dev Mode HTML per screen (live MCP only)
specs/README.md             index + traceability (screen → operations)
specs/LINKS.md              front ⇄ back map: operations → layers, entity fields → layers, gaps
specs/CHANGES.md            design changelog, newest first (one entry per regeneration that changed the design)
specs/PARITY.md             parity report; specs/parity.json
specs/manifest.json         the extracted inventory
specs/front/mcp/*.md        MCP server index + one spec per tool (arguments, rules, safety hints, example, criteria)
specs/front/api/*.md        public API index + one spec per endpoint (parameters, body, responses, curl, criteria)
specs/front/screens/*.md    purpose, layout tree with auto layout, root CSS, copy table with typography,
                            colour and WCAG contrast, components, interactions, inputs, back-end calls,
                            tokens, designer annotations, acceptance criteria, notes
specs/front/components/*.md properties, variants, anatomy, CSS per variant, (React from FigCraft), criteria
specs/front/tokens.md|.css  variables per collection and mode, as CSS custom properties
specs/front/flows.md        navigation graph (Mermaid) and edges
specs/back/domain.md        entities and fields, with sample values from the design
specs/back/api.md           operations per screen, request fields, errors, open questions
specs/back/openapi.json     OpenAPI 3.1 with x-weshcraft node references
specs/back/conventions.md   auth, errors, pagination, idempotency, observability
```

See [`examples/ridgeline-onboarding/`](examples/ridgeline-onboarding/) for a full output, [`examples/account/`](examples/account/) for a small design that uses every front ⇄ back convention (bindings, annotations with results, inputs, and one deliberate gap), and [`examples/billing/`](examples/billing/) for a service with no screens: an MCP server and a public API.

### Making the back end explicit

Front-end facts come straight from the design. Back-end facts are **explicit** when the designer states them, **inferred** otherwise (and listed as open questions):

| In FigCraft | Becomes |
|---|---|
| Text `{{trail.name}}` or `{{trail.distance:number}}` | field `Trail.name` / `Trail.distance: number` |
| Layer named `@trail.rating:number` | field `Trail.rating` |
| Layer data `pluginData.weshcraft = {"entity":"Trail","field":"name","type":"string"}` | field |
| Dev Mode annotation `POST /trails` on a button | operation `POST /trails` triggered by that button; inputs on the screen are its request fields |
| Annotation with a result: `POST /trails → Trail` | the operation returns `Trail`; layers showing `Trail` fields are linked to it |
| Annotation on a screen frame: `GET /users/me → User` | operation the screen loads on entry |
| Layer data `pluginData.weshcraft = {"action":"POST /trails"}` | operation |
| *Inferred:* ≥ 2 instances of one component in one auto layout | `GET /<entity>s` list + entity fields from the component's text properties |
| *Inferred:* a clickable layer labelled Save, Create, Continue, Sign in… | a `POST`/`PATCH`/`DELETE` operation |

### The agent pass

`--agent` runs a coding agent once per spec, in parallel, and puts its answer in the spec's Notes block (states, edge cases, accessibility, analytics, security, open questions). Default: `claude -p` with the `wesh-spec-*` skills; any CLI that reads a prompt on stdin works (`--agent "my-cli --flags"` or `WESHCRAFT_AGENT_CMD`). Agents cannot change the contract-checked sections, and `#id` citations they invent are neutralised, so enrichment cannot make a spec drift from the design. Human edits to Notes (browser **Edit notes**, or `weshcraft_write_notes`) survive regeneration.

## Sync

| Target | What happens | Credentials |
|---|---|---|
| `github:owner/repo[@branch]` | commit to `branch` (default `weshcraft/specs`) via the API; PR opened once, then its description updated (`--no-sync-pr`: branch only). Files whose blob already matches are not re-sent; an unchanged tree makes no commit. | `GITHUB_TOKEN` (contents + pull requests write), or a token typed in the browser (memory only) |
| `gitlab:group/project[@branch]` | same on GitLab.com or self-managed (`--api-url https://host/api/v4`), MR instead of PR | `GITLAB_TOKEN` (`api` scope) |
| `git[@branch]` | `git add` + `git commit` of **only** `prototype/`, `specs/`, the design file and the CI file, in the repository around `--out`. Never switches branches (`@branch` must be checked out), never touches your other changes, refuses mid-merge/rebase, runs your hooks. `--sync-push` then pushes. | your git config |

Auto sync runs after a regeneration only when parity is OK, so a branch never receives specs that disagree with the prototype. `--sync-manual` syncs only when asked (sync pill, **Publish & sync**, `weshcraft_sync`).

## CI

`publish` adds `.github/workflows/weshcraft-parity.yml` (GitHub) or `ci/weshcraft.gitlab-ci.yml` (GitLab; `include:` it from your `.gitlab-ci.yml`). They run `npx weshcraft check` on the committed `.figcraft`. Until WeshCraft is on a registry, set the `WESHCRAFT_PACKAGE` variable to your copy, e.g. `github:your-org/weshcraft` or `git+https://gitlab.example.com/your-group/weshcraft.git`.

This repository's own tests run in `.github/workflows/ci.yml` and `.gitlab-ci.yml`.

## Security

- `serve` listens on 127.0.0.1 only unless you pass `--token` (then every request needs it; the browser gets an HttpOnly cookie).
- Git tokens are read from the environment or passed per publish from the browser to the local server; they are never written to disk.
- File paths from MCP and HTTP are confined to the output folder; uploads are written under `design/`.
- FigCraft's own `--automation-read-root` / `--automation-write-root` flags still apply to the FigCraft process; pass them through `--figcraft-cli` wrappers when you want an agent confined.

## Limits

- Fidelity of the HTML prototype is high for frames, auto layout (flex and grid), text, solid/gradient fills, strokes, shadows, blurs, vectors, stars and polygons; images, boolean groups, masks and rich text runs fall back to boxes. With a live FigCraft, its own PNG renders are stored next to the prototype as the reference.
- The live MCP path normalises FigCraft's `inspect_document` output; it is tested against a protocol double built from FigCraft's documented shapes and real `.figcraft` files, not against a compiled `figcraft-cli`. If a FigCraft version reports a property differently, `check` against the saved file may report the specs as stale until you regenerate from the file.
- Back-end inference is heuristic unless the design binds data or annotates operations (above).

## Format

The output is a versioned, tool-independent spec format — see [docs/SPEC-FORMAT.md](docs/SPEC-FORMAT.md) (also shipped inside the `/wesh-plan-view-mode` skill as `FORMAT.md`).

## Layout

```
bin/weshcraft.mjs          CLI
src/figcraft/              MCP client + sources (file, headless, attached)
src/model/                 normalised model + manifest extraction
src/proto/html.mjs         prototype renderer
src/proto/catalog.mjs      MCP/API catalog page
src/surface/               OpenAPI (JSON/YAML), MCP tool lists and live MCP servers
opencode/                  OpenCode 2 / OpenChamber plugin
openchamber/               OpenChamber extension: panel, Work Status section, service (manifest in package.json)
src/spec/                  front/back generators, contracts, workspace (parallel jobs), agent pass
src/parity/check.mjs       parity
src/spec/diff.mjs          design changelog
src/mcp/server.mjs         WeshCraft MCP server (stdio + HTTP handler)
src/web/                   browser app (server + public/)
src/publish/               GitHub/GitLab REST + CI templates
wesh-bundle/               /wesh-plan-view-mode + wesh-spec-* skills, apply script and patch
test/                      node:test suite, FigCraft protocol double, fixtures
```

## Licence

MIT. Test fixtures in `test/fixtures/` and `examples/` are FigCraft example files (MIT OR Apache-2.0, © FigCraft contributors), see [NOTICE](NOTICE).
