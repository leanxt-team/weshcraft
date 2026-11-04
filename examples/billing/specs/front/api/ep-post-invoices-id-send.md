# Endpoint: `POST /invoices/{id}/send`

| | |
|---|---|
| Summary | Email the invoice to the customer |
| operationId | `sendInvoice` |
| Tags | Invoices |
| Auth | `bearer` |
| Used by | [MCP `send_invoice`](../mcp/tool-send-invoice.md) |
| Fingerprint | `2de66f647f66` |

## Parameters

| Name | In | Type | Required | Constraints | Description |
|---|---|---|---|---|---|
| `id` | path | string | yes | format `uuid` | — |

## Request body

None.

## Responses

| Status | Body | Description |
|---|---|---|
| 202 | — | Queued. |
| 409 | — | Invoice is not open. |

## Example

```bash
curl -X POST 'https://api.example.com/v1/invoices/<id>/send' \
  -H 'Authorization: Bearer <token>'
```

## Acceptance criteria

1. Missing or malformed path parameter `id` returns `400` (path: `404`) with the field named.
2. Responds `202` when: Queued..
3. Responds `409` when: Invoice is not open..
4. Without valid credentials (bearer) responds `401`; without permission `403`.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "fingerprint": "2de66f647f66",
 "key": "ep-post-invoices-id-send",
 "kind": "front-endpoint",
 "method": "POST",
 "op": "op-ep-post-invoices-id-send",
 "path": "/invoices/{id}/send",
 "sourceHash": "53efee9c860fc944"
}
-->
