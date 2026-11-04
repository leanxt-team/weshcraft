# MCP tool: `void_invoice`

| | |
|---|---|
| Title | Void invoice |
| Server | billing-mcp |
| Behaviour | writes · **destructive** · idempotent · closed world |
| Back end | none (declared: implemented in the server) |
| Fingerprint | `3b4e6c4cc1d1` |

## Purpose

Void an invoice. Cannot be undone.

## Input

| Name | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | string | yes | format `uuid` | — |
| `reason` | string | yes | min 3 | — |

## Example call

```json
{
  "method": "tools/call",
  "params": {
    "name": "void_invoice",
    "arguments": {
      "id": "3f6e…",
      "reason": "<reason>"
    }
  }
}
```

## Acceptance criteria

1. Calling without `id` returns a tool error (`isError: true`) naming the missing argument; nothing is changed.
2. Calling without `reason` returns a tool error (`isError: true`) naming the missing argument; nothing is changed.
3. `reason` is checked against min 3.
4. Destructive: clients must confirm with the user before calling; the description says what is lost.
5. Calling twice with the same arguments has the same effect as once.
6. Errors are returned as tool results with `isError: true` and a message an agent can act on, never as protocol errors.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "fingerprint": "3b4e6c4cc1d1",
 "input": [
  "id",
  "reason"
 ],
 "kind": "front-mcp-tool",
 "name": "void_invoice",
 "op": null,
 "sourceHash": "53efee9c860fc944"
}
-->
