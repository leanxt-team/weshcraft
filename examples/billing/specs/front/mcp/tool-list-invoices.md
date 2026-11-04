# MCP tool: `list_invoices`

| | |
|---|---|
| Title | List invoices |
| Server | billing-mcp |
| Behaviour | read-only · closed world |
| Back end | [`GET /invoices`](../../back/api.md#op-ep-get-invoices) (inferred) |
| Fingerprint | `1b6a38534bc0` |
| Code tag | `@weshcraft list_invoices` ([trace](../../TRACE.md)) |

## Purpose

List invoices, optionally by status.

## Input

| Name | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `status` | string | no | one of `draft`, `open`, `paid`, `void` | — |
| `limit` | integer | no | min 1 · max 100 · default `20` | — |

## Example call

```json
{
  "method": "tools/call",
  "params": {
    "name": "list_invoices",
    "arguments": {
      "limit": 20
    }
  }
}
```

## Acceptance criteria

1. `status` outside `draft`, `open`, `paid`, `void` is rejected with the allowed values in the message.
2. `limit` is checked against min 1 and max 100.
3. Never changes state (read-only hint): safe for agents to call without confirmation.
4. Performs `GET /invoices` with the same validation and errors as the API, and returns the `Invoice` it gets back.
5. Errors are returned as tool results with `isError: true` and a message an agent can act on, never as protocol errors.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "fingerprint": "1b6a38534bc0",
 "input": [
  "status",
  "limit"
 ],
 "kind": "front-mcp-tool",
 "name": "list_invoices",
 "op": "op-ep-get-invoices",
 "sourceHash": "53efee9c860fc944"
}
-->
