# API & MCP

5 operations, 5 public endpoints, 4 MCP tools, by function. Request and response details are in [the API spec](back/api.md) and [`openapi.json`](back/openapi.json); conventions (auth, errors, pagination) in [conventions](back/conventions.md).

Authentication: bearer (http bearer).

## Invoices

| Method | Path | What | Called from | Returns |
|---|---|---|---|---|
| [`GET`](back/api.md#op-ep-get-invoices) | `/invoices` | List invoices | [`list_invoices`](front/mcp/tool-list-invoices.md) · public `GET /invoices` | [Invoice](DATA.md#data-invoice)[] |
| [`POST`](back/api.md#op-ep-post-invoices) | `/invoices` | Create a draft invoice | [`create_invoice`](front/mcp/tool-create-invoice.md) · public `POST /invoices` | [Invoice](DATA.md#data-invoice) |
| [`GET`](back/api.md#op-ep-get-invoices-id) | `/invoices/{id}` | Get one invoice | public `GET /invoices/{id}` | [Invoice](DATA.md#data-invoice) |
| [`POST`](back/api.md#op-ep-post-invoices-id-send) | `/invoices/{id}/send` | Email the invoice to the customer | [`send_invoice`](front/mcp/tool-send-invoice.md) · public `POST /invoices/{id}/send` | [Invoice](DATA.md#data-invoice) |

## Customers

| Method | Path | What | Called from | Returns |
|---|---|---|---|---|
| [`GET`](back/api.md#op-ep-get-customers) | `/customers` | List customers | public `GET /customers` | [Customer](DATA.md#data-customer)[] |

## MCP tools

| Tool | Behaviour | Operation |
|---|---|---|
| [`create_invoice`](front/mcp/tool-create-invoice.md) | — | [`POST /invoices`](back/api.md#op-ep-post-invoices) |
| [`list_invoices`](front/mcp/tool-list-invoices.md) | — | [`GET /invoices`](back/api.md#op-ep-get-invoices) |
| [`send_invoice`](front/mcp/tool-send-invoice.md) | — | [`POST /invoices/{id}/send`](back/api.md#op-ep-post-invoices-id-send) |
| [`void_invoice`](front/mcp/tool-void-invoice.md) | — | ⚠️ none |

## Notes

<!-- weshcraft:notes:start -->
_Versioning, rate limits, idempotency, webhooks, open questions._
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
 "kind": "api-overview",
 "operations": [
  {
   "fn": "fn-invoices",
   "key": "op-ep-get-invoices",
   "method": "GET",
   "path": "/invoices"
  },
  {
   "fn": "fn-invoices",
   "key": "op-ep-post-invoices",
   "method": "POST",
   "path": "/invoices"
  },
  {
   "fn": "fn-invoices",
   "key": "op-ep-get-invoices-id",
   "method": "GET",
   "path": "/invoices/{id}"
  },
  {
   "fn": "fn-invoices",
   "key": "op-ep-post-invoices-id-send",
   "method": "POST",
   "path": "/invoices/{id}/send"
  },
  {
   "fn": "fn-customers",
   "key": "op-ep-get-customers",
   "method": "GET",
   "path": "/customers"
  }
 ],
 "sourceHash": "06ae1ccbb7dfb23a",
 "tools": [
  {
   "name": "create_invoice",
   "op": "op-ep-post-invoices"
  },
  {
   "name": "list_invoices",
   "op": "op-ep-get-invoices"
  },
  {
   "name": "send_invoice",
   "op": "op-ep-post-invoices-id-send"
  },
  {
   "name": "void_invoice",
   "op": null
  }
 ]
}
-->
