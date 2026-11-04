# Public API: Billing API (1.0.0)

Invoices for customers. Amounts are in minor units (cents).

| | |
|---|---|
| Servers | `https://api.example.com/v1` |
| Auth | bearer (http bearer) |
| Endpoints | 5 |
| Schemas | 3 |

## Invoices

| Endpoint | Summary | Returns | MCP |
|---|---|---|---|
| [`GET /invoices`](ep-get-invoices.md) | List invoices | 200 `Invoice[]` | `list_invoices` |
| [`POST /invoices`](ep-post-invoices.md) | Create a draft invoice | 201 `Invoice` | `create_invoice` |
| [`GET /invoices/{id}`](ep-get-invoices-id.md) | Get one invoice | 200 `Invoice` | — |
| [`POST /invoices/{id}/send`](ep-post-invoices-id-send.md) | Email the invoice to the customer | 202 | `send_invoice` |

## Customers

| Endpoint | Summary | Returns | MCP |
|---|---|---|---|
| [`GET /customers`](ep-get-customers.md) | List customers | 200 `Customer[]` | — |

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "endpoints": [
  "ep-get-invoices",
  "ep-post-invoices",
  "ep-get-invoices-id",
  "ep-post-invoices-id-send",
  "ep-get-customers"
 ],
 "kind": "front-api",
 "sourceHash": "06ae1ccbb7dfb23a"
}
-->
