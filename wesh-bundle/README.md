# wesh update: WeshCraft view mode

Adds to [wesh](https://github.com/leanxt-team/wesh):

| | Name | Purpose |
|---|---|---|
| `/` only | `/wesh-plan-view-mode` | `/wesh-plan` on a FigCraft prototype, producing an **advanced spec** (how the product works as functions + design + prototype + contract-checked front/back specs + links + changelog, in git; format in `FORMAT.md`). Works for services with little or no UI too: the front can be an MCP server and/or a public API. Modes: `new`, `update` (what changed in the design since the committed spec), `sync` / `push` to `git`, `github:owner/repo` or `gitlab:group/project`. |
| auto | `wesh-spec-front` | enrich generated front specs (states, interaction details, a11y, responsive, analytics, questions) |
| auto | `wesh-spec-back` | enrich generated back specs (validation, authz, errors, data, consistency, mapping to code, questions) |

It also registers `/wesh-plan-view-mode` as slash-only in `install.mjs` (and in its tests), adds one routing clause to `core/CORE.md`, teaches `wesh-plan` to suggest view mode for UI work and `wesh-review` to review code against an advanced spec (running `weshcraft check` first), and documents view mode in `README.md`. No new agents, hooks or dependencies.

## Apply

Either the script (idempotent, works on any recent wesh):

```bash
node wesh-bundle/apply.mjs /path/to/wesh
```

or the patch (made against wesh `d07619a`):

```bash
cd /path/to/wesh && git apply /path/to/weshcraft/wesh-bundle/wesh-plan-view-mode.patch
```

Then reinstall wesh:

```bash
cd /path/to/wesh && node install.mjs
```

Checked: wesh's own suite passes with the update (124/124, `cd bench && npm test`), and `node install.mjs --target claude` installs the three skills.

## Use

1. Claude Code, in the project: `node /path/to/weshcraft/bin/weshcraft.mjs init --client claude` (or `--surface openapi.yaml` for an API/MCP service). OpenCode / OpenChamber: `--client opencode --global` installs the plugin (in OpenChamber, also add the WeshCraft folder in Settings → Extensions). Add `--sync git` (or `--sync github:owner/repo`) to keep a repo in step automatically.
2. The agent designs in the project's `design/*.figcraft` with the `design_*` tools (or starts one); you can edit the same design in the browser's Design tab. To use the FigCraft app instead: `figcraft --control 7979` and `init … --attach 7979 --figcraft-cli /path/to/figcraft-cli`.
3. Restart Claude Code, OpenCode or OpenChamber, run `/wesh-plan-view-mode`. Open the URL it gives you.
