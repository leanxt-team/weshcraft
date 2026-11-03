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
- **Specs built in parallel, shown live.** One job per screen, per component, plus tokens, flows, domain model, API (with OpenAPI 3.1) and conventions. The browser's **Spec builder** section shows each job queue, write, get enriched by an agent (streamed) and finish.
- **Specs match the visual prototype.** Each spec embeds a machine-readable contract (an HTML comment). `weshcraft check` compares it with a fresh extraction of the design: copy verbatim on its row, interactions and destinations, component instances and variants, inputs, frame sizes, tokens and values, navigation edges, entities and operations, and that the pushed prototype was built from the same design. Every spec line cites its layer as `#id`; click it in the browser and the prototype highlights that layer.
- **GitHub and GitLab.** One click (or `weshcraft publish`) commits `prototype/`, `specs/`, the `.figcraft` source and a CI parity job to a branch and opens or updates a PR/MR with the parity summary.
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

### In Claude Code (`/wesh-plan-view-mode`)

```bash
node bin/weshcraft.mjs init --attach 7979 --figcraft-cli /path/to/figcraft-cli
```

That writes `.mcp.json` with a `weshcraft` server (stdio) that also serves the browser view. Install the wesh update (below), restart Claude Code, run `/wesh-plan-view-mode`. The agent plans with you in rounds, puts each decision into the prototype, generates the specs, fans out sub-agents to enrich them with `wesh-spec-front` / `wesh-spec-back`, gates on parity and publishes when you say so.

## Commands

| Command | What it does |
|---|---|
| `serve [source]` | Browser workspace, SSE live updates, MCP over HTTP at `/mcp`, zip download. Binds to 127.0.0.1; any other host requires `--token`. |
| `mcp [source] [--web]` | MCP server on stdio (`figcraft_*` + `weshcraft_*` tools). `--web` also serves the browser view. |
| `generate [source] [--force] [--agent [CMD]]` | One run: prototype + all specs + parity. Exit 1 when out of sync. |
| `check --file F [--format text\|markdown\|json]` | Parity only, for CI. Exit 1 when out of sync. |
| `publish [source] --provider github\|gitlab --repo R` | Commit and open/update a PR/MR. Token from `GITHUB_TOKEN` / `GITLAB_TOKEN`; `--api-url` for GitHub Enterprise or self-managed GitLab. |
| `zip [source] --zip F` | Everything a repo needs, as a zip. |
| `init` | Write `.mcp.json` for Claude Code. |

Source: `--file F` (offline), `--mcp` (spawns `figcraft-cli mcp`), or `--attach PORT` (running app).

### MCP tools

| Tool | |
|---|---|
| `figcraft_*` | FigCraft's own tools, unchanged (only with `--mcp` / `--attach`). Mutating calls schedule a regeneration. |
| `weshcraft_status` | Summary, jobs, parity, live URL. |
| `weshcraft_generate {force?}` | Snapshot + prototype + parallel spec jobs + parity. |
| `weshcraft_check` | Parity issues with file, check and node id. |
| `weshcraft_manifest {screen?}` | The extracted inventory. |
| `weshcraft_read_spec {path}` / `weshcraft_write_notes {path, notes}` | Read a spec; replace only its Notes block. |
| `weshcraft_publish {provider, repo, branch?, base?, apiUrl?}` | PR / MR. |

## What gets generated

```
prototype/index.html        clickable prototype (FigCraft prototype links wired, data-node ids)
prototype/screens/*.png     FigCraft renders (live MCP only), the visual reference
prototype/figcraft/*.html   FigCraft Dev Mode HTML per screen (live MCP only)
specs/README.md             index + traceability (screen → operations)
specs/PARITY.md             parity report; specs/parity.json
specs/manifest.json         the extracted inventory
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

See [`examples/ridgeline-onboarding/`](examples/ridgeline-onboarding/) for a full output.

### Making the back end explicit

Front-end facts come straight from the design. Back-end facts are **explicit** when the designer states them, **inferred** otherwise (and listed as open questions):

| In FigCraft | Becomes |
|---|---|
| Text `{{trail.name}}` or `{{trail.distance:number}}` | field `Trail.name` / `Trail.distance: number` |
| Layer named `@trail.rating:number` | field `Trail.rating` |
| Layer data `pluginData.weshcraft = {"entity":"Trail","field":"name","type":"string"}` | field |
| Dev Mode annotation `POST /trails` on a button | operation `POST /trails` triggered by that button |
| Layer data `pluginData.weshcraft = {"action":"POST /trails"}` | operation |
| *Inferred:* ≥ 2 instances of one component in one auto layout | `GET /<entity>s` list + entity fields from the component's text properties |
| *Inferred:* a clickable layer labelled Save, Create, Continue, Sign in… | a `POST`/`PATCH`/`DELETE` operation |

### The agent pass

`--agent` runs a coding agent once per spec, in parallel, and puts its answer in the spec's Notes block (states, edge cases, accessibility, analytics, security, open questions). Default: `claude -p` with the `wesh-spec-*` skills; any CLI that reads a prompt on stdin works (`--agent "my-cli --flags"` or `WESHCRAFT_AGENT_CMD`). Agents cannot change the contract-checked sections, and `#id` citations they invent are neutralised, so enrichment cannot make a spec drift from the design. Human edits to Notes (browser **Edit notes**, or `weshcraft_write_notes`) survive regeneration.

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

## Layout

```
bin/weshcraft.mjs          CLI
src/figcraft/              MCP client + sources (file, headless, attached)
src/model/                 normalised model + manifest extraction
src/proto/html.mjs         prototype renderer
src/spec/                  front/back generators, contracts, workspace (parallel jobs), agent pass
src/parity/check.mjs       parity
src/mcp/server.mjs         WeshCraft MCP server (stdio + HTTP handler)
src/web/                   browser app (server + public/)
src/publish/               GitHub/GitLab REST + CI templates
wesh-bundle/               /wesh-plan-view-mode + wesh-spec-* skills, apply script and patch
test/                      node:test suite, FigCraft protocol double, fixtures
```

## Licence

MIT. Test fixtures in `test/fixtures/` and `examples/` are FigCraft example files (MIT OR Apache-2.0, © FigCraft contributors), see [NOTICE](NOTICE).
