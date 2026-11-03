# Endpoint: `POST /invoices`

| | |
|---|---|
| Summary | Create a draft invoice |
| operationId | `createInvoice` |
| Tags | Invoices |
| Auth | `bearer` |
| Used by | [MCP `create_invoice`](../mcp/tool-create-invoice.md) |
| Fingerprint | `a16ef171e6fe` |

## Parameters

None.

## Request body

Required, schema `InvoiceInput`.

| Name | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `customerId` | string | yes | format `uuid` | Customer to bill. |
| `amount` | integer | yes | min 1 | Total in minor units. |
| `currency` | string | yes | one of `EUR`, `USD`, `GBP` | — |
| `dueDate` | string | no | format `date` | — |

## Responses

| Status | Body | Description |
|---|---|---|
| 201 | `Invoice` | Created. |
| 400 | — | Validation error. |

## Example

```bash
curl -X POST 'https://api.example.com/v1/invoices' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"3f6e…","amount":1,"currency":"EUR"}'
```

## Acceptance criteria

1. Body without `customerId` returns `400` with `fields.customerId`.
2. Body without `amount` returns `400` with `fields.amount`.
3. Body without `currency` returns `400` with `fields.currency`.
4. `currency` accepts only `EUR`, `USD`, `GBP`.
5. Responds `201` with `Invoice` when: Created..
6. Responds `400` when: Validation error..
7. Without valid credentials (bearer) responds `401`; without permission `403`.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "fingerprint": "a16ef171e6fe",
 "key": "ep-post-invoices",
 "kind": "front-endpoint",
 "method": "POST",
 "op": "op-ep-post-invoices",
 "path": "/invoices",
 "sourceHash": "4adc5ece25fbe421"
}
-->
