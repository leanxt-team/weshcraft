# MCP tool: `create_invoice`

| | |
|---|---|
| Title | Create invoice |
| Server | billing-mcp |
| Behaviour | writes · closed world |
| Back end | [`POST /invoices`](../../back/api.md#op-ep-post-invoices) (explicit) |
| Fingerprint | `dc429baba1d6` |
| Code tag | `@weshcraft create_invoice` ([trace](../../TRACE.md)) |

## Purpose

Create a draft invoice for a customer. Returns the invoice.

## Input

| Name | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `customerId` | string | yes | format `uuid` | Customer to bill. |
| `amount` | integer | yes | min 1 | Total in minor units. |
| `currency` | string | yes | one of `EUR`, `USD`, `GBP` | — |
| `dueDate` | string | no | format `date` | — |

## Example call

```json
{
  "method": "tools/call",
  "params": {
    "name": "create_invoice",
    "arguments": {
      "customerId": "3f6e…",
      "amount": 1,
      "currency": "EUR"
    }
  }
}
```

## Acceptance criteria

1. Calling without `customerId` returns a tool error (`isError: true`) naming the missing argument; nothing is changed.
2. Calling without `amount` returns a tool error (`isError: true`) naming the missing argument; nothing is changed.
3. Calling without `currency` returns a tool error (`isError: true`) naming the missing argument; nothing is changed.
4. `currency` outside `EUR`, `USD`, `GBP` is rejected with the allowed values in the message.
5. `amount` is checked against min 1.
6. Performs `POST /invoices` with the same validation and errors as the API, and returns the `Invoice` it gets back.
7. Errors are returned as tool results with `isError: true` and a message an agent can act on, never as protocol errors.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "fingerprint": "dc429baba1d6",
 "input": [
  "customerId",
  "amount",
  "currency",
  "dueDate"
 ],
 "kind": "front-mcp-tool",
 "name": "create_invoice",
 "op": "op-ep-post-invoices",
 "sourceHash": "06ae1ccbb7dfb23a"
}
-->
