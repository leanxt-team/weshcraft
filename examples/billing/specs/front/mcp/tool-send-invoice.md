# MCP tool: `send_invoice`

| | |
|---|---|
| Title | Send invoice |
| Server | billing-mcp |
| Behaviour | writes · idempotent · open world (reaches outside systems) |
| Back end | [`POST /invoices/{id}/send`](../../back/api.md#op-ep-post-invoices-id-send) (inferred) |
| Fingerprint | `dec5c565b001` |
| Code tag | `@weshcraft send_invoice` ([trace](../../TRACE.md)) |

## Purpose

Email an open invoice to its customer. Sends a real email.

## Input

| Name | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `id` | string | yes | format `uuid` | — |

## Example call

```json
{
  "method": "tools/call",
  "params": {
    "name": "send_invoice",
    "arguments": {
      "id": "3f6e…"
    }
  }
}
```

## Acceptance criteria

1. Calling without `id` returns a tool error (`isError: true`) naming the missing argument; nothing is changed.
2. Calling twice with the same arguments has the same effect as once.
3. Performs `POST /invoices/{id}/send` with the same validation and errors as the API.
4. Errors are returned as tool results with `isError: true` and a message an agent can act on, never as protocol errors.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "fingerprint": "dec5c565b001",
 "input": [
  "id"
 ],
 "kind": "front-mcp-tool",
 "name": "send_invoice",
 "op": "op-ep-post-invoices-id-send",
 "sourceHash": "53efee9c860fc944"
}
-->
