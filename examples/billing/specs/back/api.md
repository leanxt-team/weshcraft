# API

Every operation a screen needs, grouped by screen. Conventions (auth, errors, pagination) are in [conventions](conventions.md); the machine-readable contract is [`openapi.json`](openapi.json).

## Public API

<a id="op-ep-get-invoices"></a>
### `GET /invoices` — List invoices

- Public endpoint: [`GET /invoices`](../front/api/ep-get-invoices.md)
- MCP: [`list_invoices`](../front/mcp/tool-list-invoices.md)
- Kind: list · confidence: explicit
- Returns: `Invoice[]` (paginated)
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-ep-post-invoices"></a>
### `POST /invoices` — Create a draft invoice

- Public endpoint: [`POST /invoices`](../front/api/ep-post-invoices.md)
- MCP: [`create_invoice`](../front/mcp/tool-create-invoice.md)
- Kind: endpoint · confidence: explicit
- Returns: `Invoice`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-ep-get-invoices-id"></a>
### `GET /invoices/{id}` — Get one invoice

- Public endpoint: [`GET /invoices/{id}`](../front/api/ep-get-invoices-id.md)
- Kind: endpoint · confidence: explicit
- Returns: `Invoice`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-ep-post-invoices-id-send"></a>
### `POST /invoices/{id}/send` — Email the invoice to the customer

- Public endpoint: [`POST /invoices/{id}/send`](../front/api/ep-post-invoices-id-send.md)
- MCP: [`send_invoice`](../front/mcp/tool-send-invoice.md)
- Kind: endpoint · confidence: explicit
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-ep-get-customers"></a>
### `GET /customers` — List customers

- Public endpoint: [`GET /customers`](../front/api/ep-get-customers.md)
- Kind: list · confidence: explicit
- Returns: `Customer[]` (paginated)
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "kind": "back-api",
 "operations": [
  {
   "key": "op-ep-get-invoices",
   "method": "GET",
   "path": "/invoices",
   "screen": "api",
   "trigger": null
  },
  {
   "key": "op-ep-post-invoices",
   "method": "POST",
   "path": "/invoices",
   "screen": "api",
   "trigger": null
  },
  {
   "key": "op-ep-get-invoices-id",
   "method": "GET",
   "path": "/invoices/{id}",
   "screen": "api",
   "trigger": null
  },
  {
   "key": "op-ep-post-invoices-id-send",
   "method": "POST",
   "path": "/invoices/{id}/send",
   "screen": "api",
   "trigger": null
  },
  {
   "key": "op-ep-get-customers",
   "method": "GET",
   "path": "/customers",
   "screen": "api",
   "trigger": null
  }
 ],
 "sourceHash": "4adc5ece25fbe421"
}
-->
