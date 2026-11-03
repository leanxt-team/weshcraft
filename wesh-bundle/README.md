# wesh update: WeshCraft view mode

Adds to [wesh](https://github.com/leanxt-team/wesh):

| | Name | Purpose |
|---|---|---|
| `/` only | `/wesh-plan-view-mode` | `/wesh-plan` on a FigCraft prototype: decisions become design edits over MCP, specs are generated in parallel and gated on parity, live in the browser, published as a PR/MR |
| auto | `wesh-spec-front` | enrich generated front specs (states, interaction details, a11y, responsive, analytics, questions) |
| auto | `wesh-spec-back` | enrich generated back specs (validation, authz, errors, data, consistency, mapping to code, questions) |

It also registers `/wesh-plan-view-mode` as slash-only in `install.mjs` (and in its tests), adds one routing clause to `core/CORE.md`, and documents view mode in `README.md`. No new agents, hooks or dependencies.

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

1. In the project: `node /path/to/weshcraft/bin/weshcraft.mjs init --attach 7979 --figcraft-cli /path/to/figcraft-cli` (or `--mcp` for headless FigCraft).
2. Start FigCraft with `figcraft --control 7979`, open your `.figcraft`.
3. Restart Claude Code, run `/wesh-plan-view-mode`. Open the URL it gives you.
