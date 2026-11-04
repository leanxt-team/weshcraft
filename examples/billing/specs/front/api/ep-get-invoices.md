# Endpoint: `GET /invoices`

| | |
|---|---|
| Summary | List invoices |
| operationId | `listInvoices` |
| Tags | Invoices |
| Auth | `bearer` |
| Used by | [MCP `list_invoices`](../mcp/tool-list-invoices.md) |
| Fingerprint | `13e6328bfc0c` |

## Parameters

| Name | In | Type | Required | Constraints | Description |
|---|---|---|---|---|---|
| `status` | query | string | no | one of `draft`, `open`, `paid`, `void` | Only invoices in this state. |
| `limit` | query | integer | no | min 1 · max 100 · default `20` | — |

## Request body

None.

## Responses

| Status | Body | Description |
|---|---|---|
| 200 | `Invoice[]` | A page of invoices. |

## Example

```bash
curl -X GET 'https://api.example.com/v1/invoices?limit=20' \
  -H 'Authorization: Bearer <token>'
```

## Acceptance criteria

1. `status` accepts only `draft`, `open`, `paid`, `void`.
2. Responds `200` with `Invoice[]` when: A page of invoices..
3. Without valid credentials (bearer) responds `401`; without permission `403`.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "fingerprint": "13e6328bfc0c",
 "key": "ep-get-invoices",
 "kind": "front-endpoint",
 "method": "GET",
 "op": "op-ep-get-invoices",
 "path": "/invoices",
 "sourceHash": "53efee9c860fc944"
}
-->
