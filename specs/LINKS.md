# Front ⇄ back links

Every place where the prototype meets the back end: 0 operation links and 0 data links across 0 screens. No gaps.

Legend: ▶ triggers an operation · ⇢ submits a request field · ☰ list filled by an operation · ◉ shows an entity field · ⚙ MCP tool calls it · ↗ public endpoint.

## Operations → front end

No operations. Give a layer an API call (WeshCraft: Spec section › Calls, or `design_api`; FigCraft: a `METHOD /path` annotation) to add one.
## Domain → front end

No entity is shown. Bind a layer to data (WeshCraft: Spec section › Shows, or `design_bind`; FigCraft: `{{entity.field}}` in text) to add one.
## Gaps

None: every field shown is loaded by an operation on its screen, and every operation is reached from a layer.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "edges": [],
 "gaps": 0,
 "kind": "links",
 "sourceHash": "ff861a3bc508b058"
}
-->
