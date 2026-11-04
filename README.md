# WeshCraft

**A spec-oriented FigCraft in the browser.** Design screens yourself or let your agent build them over MCP; WeshCraft writes front-end and back-end specs that match the prototype exactly, live, checked in CI, synced to GitHub, GitLab or your local git.

WeshCraft edits [FigCraft](https://github.com/storytold/figcraft) documents directly (`.figcraft`, the same files FigCraft opens), so it needs no FigCraft install, and it can still attach to a running FigCraft:

```
 Agent (Claude Code, OpenCode, /wesh-plan-view-mode)       You, in the browser (weshcraft serve)
        │  design_* · weshcraft_* tools                          │  design editor · prototype · spec builder · parity · publish
        ▼                                                        ▼
 ┌──────────────────────────── WeshCraft ─────────────────────────────────────┐
 │ design store: the .figcraft in memory, one undo stack for people and agents │
 │   (or a live FigCraft over MCP: figcraft-cli mcp | --attach <port>)         │
 │ every edit ─► manifest (every screen, text, interaction, component, token,  │
 │               entity, operation, with node ids and fingerprints)            │
 │ prototype/index.html  (clickable, rendered from the same model)             │
 │ specs/front/**  specs/back/**  ◄── regenerated in parallel, + optional agent │
 │ parity check: specs ⇄ manifest ⇄ prototype                                  │
 └──────────────┬──────────────────────────────────────────────────────────────┘
                ▼
     GitHub PR / GitLab MR / local git commit  +  CI job that re-checks parity
```

- **Design in the browser.** The **Design** tab is a FigCraft-style editor on the real document: screens and layers panels, select (click a top-level layer, double-click to go deeper, ⌘-click the deepest), move and resize with handles, drag into and reorder inside auto layout, draw frames, rectangles, ellipses and text, edit text in place, insert components, undo/redo, zoom, keyboard shortcuts. The inspector edits layout (position, size, hug/fill, auto layout direction, gap, padding, alignment), fill and tokens, stroke, radius, shadow, opacity and typography.
- **Spec-oriented by construction.** The inspector's first section is what the specs read: the **link** a layer opens (another screen, a URL, back), the **API call** it triggers or a screen loads (`POST /trails → Trail`), the **data** it shows (`trail.name`), its dev status and notes. Its **Spec** tab shows the screen's spec as it is rewritten, with the selected layer's `#id` highlighted. The spec builder on the left fills in parallel after every edit.
- **Agents design too, cheaply.** `design_tree` and `design_find` give one line per layer; `design_edit` applies a whole batch of operations in one undoable step (refs let later ops use what earlier ops created) and, with `wait: true`, returns the parity result and what changed in the specs. Agents and people share one document and one undo stack: what the agent does appears on your canvas, and ⌘Z undoes it.
- **Still FigCraft.** The file is saved as a FigCraft document (other archive entries kept). Edit it in FigCraft and WeshCraft reloads it; attach to a running FigCraft (`--attach`) and agents use FigCraft's own tools (`figcraft_*`) instead.
- **A clean, native-feeling workspace.** Liquid Glass styling: floating translucent panes, capsule controls, system type and colours, dense macOS-style lists, light and dark. It switches to solid materials when the system asks for reduced transparency or more contrast, and turns off motion for reduced motion. On phones it becomes an iOS-style app: one full-height view at a time, a floating tab bar (Specs · Design · Prototype · Links · Spec), 44 pt rows, an action sheet and bottom-sheet dialogs, safe areas respected, screens scaled to fit.
- **Specs built in parallel, shown live.** One job per screen, per component, plus tokens, flows, domain model, API (with OpenAPI 3.1) and conventions. The browser's **Spec builder** section shows each job queue, write, get enriched by an agent (streamed) and finish.
- **Specs match the visual prototype.** Each spec embeds a machine-readable contract (an HTML comment). `weshcraft check` compares it with a fresh extraction of the design: copy verbatim on its row, interactions and destinations, component instances and variants, inputs, frame sizes, tokens and values, navigation edges, entities and operations, and that the pushed prototype was built from the same design. Every spec line cites its layer as `#id`; click it in the browser and the prototype highlights that layer.
- **Services with little or no UI.** The "front" can be an **MCP server** (agents are the users) and/or a **public HTTP API** (developers are the users): give an OpenAPI file (JSON or YAML), an MCP `tools/list` dump, a live server (`--mcp-server "node server.js"`, introspected over stdio), or a `weshcraft.surface.json` combining them — with or without a FigCraft design. Each MCP tool and endpoint gets a spec (arguments, rules, safety hints, example call, acceptance criteria), API schemas become the domain model, tools are linked to the endpoints they call, and the prototype becomes a clean **catalog** of tools and endpoints. A changed schema makes its spec stale, like a changed screen.
- **How the product works, at a glance.** The **Functions** view and `specs/FUNCTIONS.md` show the product as a handful of functions (Sign up, Find a trail, Pay…): who uses each one (people in the app, AI agents through MCP, integrations through the API), its purpose, the screens, operations and tools that make it, the data it reads and writes, and where it leads. Until they are declared, WeshCraft suggests them from the prototype (flows, sections, wizard steps, shared data, API tags); keep them, rename them and give each a purpose in the view, with the **Function** field of a screen in the editor, or ask the agent (`design_functions`). They are saved in the design. Everything else follows them: each screen spec says which function it belongs to, the API spec gives each operation's function, the navigation and front ⇄ back maps group screens by function, the editor lists screens by function, and the parity check flags a screen, operation or tool that belongs to none.
- **Linked to the code, explorable with codegraph.** Code says what it implements with a comment tag next to the symbol (`// @weshcraft scr-sign-up`, `# @weshcraft POST /users`; each spec header gives its tag). WeshCraft finds the tags in every language and writes `specs/TRACE.md` (element → code, what has no code yet, tags that name nothing) and `weshcraft.graph.mjs` next to the design (`design/weshcraft.graph.mjs`): the product as never-run JavaScript, functions → screens, components → operations → entities, each calling the tagged code. Code graphs index it with the rest: with [wesh](https://github.com/leanxt-team/wesh)'s codegraph, `codegraph explore "how does Sign up work"` returns the function, its screens, operations and the code behind them, and `codegraph impact <symbol> --depth 4` names the screens and functions a code change touches. The Functions view shows each function's code; `weshcraft trace` / `weshcraft_trace` refresh it after code changes.
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

`npm run test:codegraph` checks the product graph with a real codegraph (skipped when the CLI is not installed).

```bash
npm run demo     # serves the Ridgeline example at http://127.0.0.1:4600/
```

In your project (it picks up `design/*.figcraft`; with none, the **Design** tab offers to start one):

```bash
node /path/to/weshcraft/bin/weshcraft.mjs serve
```

```bash
node /path/to/weshcraft/bin/weshcraft.mjs new App
```

A specific file, another output folder:

```bash
node bin/weshcraft.mjs serve --file path/to/app.figcraft --out path/to/your/repo
```

Edits are saved back to the file (atomically, a moment after each change). The file is also watched: save it in FigCraft, or check out another version with git, and WeshCraft reloads it. `--read-only` keeps WeshCraft from writing the design. Or drop a `.figcraft` file on **Open .figcraft** in the browser.

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

### In OpenCode and OpenChamber (plugin + extension)

```bash
node bin/weshcraft.mjs init --client opencode --global
```

Installs the OpenCode plugin (OpenCode 2.2+, also used by OpenChamber): the agent gets the `design_*` and `weshcraft_*` tools and `/weshcraft`, and the project's WeshCraft starts with it. In OpenChamber, also add this folder in **Settings → Extensions**: the **rail panel** is the whole WeshCraft interface for the open project (it opens the project's existing design, or starts one; edits by hand or by the agent update the specs live) and its **⋯** menu sets up and runs the sync with GitHub, GitLab or the local repository (**Publish & sync**, **Sync now**). GitHub/GitLab access is inherited from the account signed in to OpenChamber, the `gh`/`glab` login or git credentials. See [`opencode/README.md`](opencode/README.md).

### Live FigCraft over MCP (optional)

To design in the FigCraft app itself while WeshCraft writes the specs, build FigCraft's CLI (`cargo build --release -p figcraft-cli`, see FigCraft's `docs/mcp.md`), then either:

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
node bin/weshcraft.mjs init --client both --sync git
```

That writes `.mcp.json` for Claude Code and `opencode.json` for OpenCode: a `weshcraft` stdio MCP server that also serves the browser view; both commit the specs in this repository after every in-sync run. Drop `--sync git` to commit yourself, or use `--sync github:owner/repo` to sync a branch on GitHub instead. The server edits the project's design (`design/*.figcraft`, or starts one); add `--attach 7979 --figcraft-cli …` to drive a running FigCraft instead. Install the wesh update (below), restart Claude Code, run `/wesh-plan-view-mode`. The agent plans with you in rounds, puts each decision into the prototype with `design_edit`, generates the specs, fans out sub-agents to enrich them with `wesh-spec-front` / `wesh-spec-back`, gates on parity and publishes when you say so.

## Commands

| Command | What it does |
|---|---|
| `serve [source] [--read-only]` | Browser workspace: design editor, prototype, live spec builder, parity, publish; SSE live updates, MCP over HTTP at `/mcp`, zip download. Edits the design in place. Binds to 127.0.0.1; any other host requires `--token`. |
| `mcp [source] [--web] [--read-only]` | MCP server on stdio (`design_*` + `weshcraft_*` tools, `figcraft_*` with a live FigCraft). `--web` also serves the browser view. |
| `new NAME` | Create `design/NAME.figcraft`, an empty FigCraft document. |
| `generate [source] [--force] [--agent [CMD]]` | One run: prototype + all specs + parity. Exit 1 when out of sync. |
| `check --file F [--format text\|markdown\|json]` | Parity only, for CI. Exit 1 when out of sync. |
| `diff --file F [--against GIT_REF]` | What changed in the design since the specs on disk (or committed at a ref). |
| `publish [source] --provider github\|gitlab --repo R` | Commit and open/update a PR/MR. Token from `GITHUB_TOKEN` / `GITLAB_TOKEN`; `--api-url` for GitHub Enterprise or self-managed GitLab. |
| `zip [source] --zip F` | Everything a repo needs, as a zip. |
| `init [--client claude\|opencode\|both] [--global] [--no-plugin]` | Claude Code: MCP server in `.mcp.json`. OpenCode 2 / OpenChamber: the native plugin (`.opencode/plugins/`, or `~/.config/opencode/plugins/` with `--global`); `--no-plugin`: MCP server in `opencode.json`. |

Source: `--file F` (default for `serve`/`mcp`: the first `design/*.figcraft`), `--mcp` (spawns `figcraft-cli mcp`), or `--attach PORT` (running app); and/or non-visual fronts: `--surface FILE` (OpenAPI JSON/YAML, MCP tool list, `weshcraft.surface.json`; repeatable) and `--mcp-server "CMD"` (repeatable).

### MCP tools

| Tool | |
|---|---|
| `design_tree {root?, depth?}` | One line per layer: `#id · type · "name" · "text" · w×h @x,y · fill · layout · ▶ links · API …`. Start here. |
| `design_find {query, type?, root?}` | Layers whose name or text matches, same format. |
| `design_get {id}` | One layer's properties in the vocabulary `design_edit` accepts. |
| `design_edit {ops, wait?}` | The workhorse: `screen`, `create`, `set`, `text`, `delete`, `move`, `duplicate`, `instance`, `link`, `bind`, `api`, `note`, `token`, `useToken`, `rename`, applied in order as one undo step; `ref` names a created layer for later ops. `wait: true` returns parity, design changes and gaps. |
| `design_create` · `design_set` · `design_text` · `design_delete` · `design_move` · `design_duplicate` · `design_screen` | Single-purpose shortcuts for the same operations. |
| `design_link {id, to \| url \| back}` · `design_bind {id, entity, field, type?}` · `design_api {id, method, path, returns?}` | Prototype link, data binding, API call: what the specs and the front ⇄ back map read. |
| `design_tokens {name?, value?, apply?}` · `design_undo` · `design_redo` · `design_screenshot {id}` · `design_new {name}` | Tokens, shared undo, a PNG of a screen (needs Playwright), a new design. |
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
specs/FUNCTIONS.md          how the product works: functions, who uses them, their screens, operations and data, the journey (Mermaid)
specs/LINKS.md              front ⇄ back map: operations → layers, entity fields → layers, gaps
specs/TRACE.md, trace.json  spec ⇄ code: element → code tagged `@weshcraft <ref>`, untraced elements, unknown tags
design/weshcraft.graph.mjs  product graph for codegraph (never run): functions → screens → operations → entities → code
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

Front-end facts come straight from the design. Back-end facts are **explicit** when the designer states them, **inferred** otherwise (and listed as open questions). In WeshCraft, state them in the inspector's **Spec** section (Calls / Loads, Shows) or with `design_api` / `design_bind`; they are stored in the FigCraft conventions below, so FigCraft and older WeshCraft versions read them the same way:

| In the design | Becomes |
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
- GitHub/GitLab access is inherited, in this order: a token typed in the publish dialog, `GITHUB_TOKEN`/`GH_TOKEN`/`GITLAB_TOKEN`/`GL_TOKEN`, the account signed in to OpenChamber (`~/.config/openchamber`), the `gh`/`glab` login, git's credential helper. Tokens stay in the local server process: never written to disk, never sent to the browser or the OpenChamber pages (they only see which source is used).
- File paths from MCP and HTTP are confined to the output folder; uploads and new designs are written under `design/`.
- Design edits are written atomically (temporary file + rename); WeshCraft's own saves are recognised by content hash, so only outside changes trigger a reload. Undo history lives in memory (200 steps) and is shared by everyone editing through the same server.
- FigCraft's own `--automation-read-root` / `--automation-write-root` flags still apply to the FigCraft process; pass them through `--figcraft-cli` wrappers when you want an agent confined.

## Limits

- The browser editor covers FigCraft's everyday tools (frames, shapes, text, auto layout, components as instances, prototype links, tokens, annotations). Vector path editing, boolean operations, images, variants and multi-page management stay in FigCraft; such layers are kept intact and shown as rendered.
- Fidelity of the HTML prototype is high for frames, auto layout (flex and grid), text, solid/gradient fills, strokes, shadows, blurs, vectors, stars and polygons; images, boolean groups, masks and rich text runs fall back to boxes. With a live FigCraft, its own PNG renders are stored next to the prototype as the reference.
- The live MCP path normalises FigCraft's `inspect_document` output; it is tested against a protocol double built from FigCraft's documented shapes and real `.figcraft` files, not against a compiled `figcraft-cli`. If a FigCraft version reports a property differently, `check` against the saved file may report the specs as stale until you regenerate from the file.
- Back-end inference is heuristic unless the design binds data or annotates operations (above).

## Format

The output is a versioned, tool-independent spec format — see [docs/SPEC-FORMAT.md](docs/SPEC-FORMAT.md) (also shipped inside the `/wesh-plan-view-mode` skill as `FORMAT.md`).

## Layout

```
bin/weshcraft.mjs          CLI
src/design/                design store (edit .figcraft, undo/redo, save), props vocabulary, agent tools
src/figcraft/              MCP client + sources (file, headless, attached)
src/model/                 normalised model + manifest extraction
src/proto/html.mjs         prototype renderer
src/proto/catalog.mjs      MCP/API catalog page
src/surface/               OpenAPI (JSON/YAML), MCP tool lists and live MCP servers
src/spec/                  front/back generators, contracts, workspace (parallel jobs), agent pass
src/parity/check.mjs       parity
src/spec/diff.mjs          design changelog
src/mcp/server.mjs         WeshCraft MCP server (stdio + HTTP handler)
src/web/                   browser app: server, design API, public/ (app + editor.js)
src/publish/credentials.mjs  inherited GitHub/GitLab access
opencode/                  OpenCode 2 plugin (also used by OpenChamber)
openchamber/               OpenChamber extension: sync panel, full-interface page, service (manifest in package.json)
src/publish/               GitHub/GitLab REST + CI templates
wesh-bundle/               /wesh-plan-view-mode + wesh-spec-* skills, apply script and patch
test/                      node:test suite, FigCraft protocol double, fixtures
```

## Licence

MIT. Test fixtures in `test/fixtures/` and `examples/` are FigCraft example files (MIT OR Apache-2.0, © FigCraft contributors), see [NOTICE](NOTICE).
