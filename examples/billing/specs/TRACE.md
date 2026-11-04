# Spec ⇄ code

0 of 11 screens, components, operations, entities and tools have code tagged for them. Tag the code that implements an element with its ref in a comment (`// @weshcraft scr-sign-up`, `# @weshcraft POST /users`); WeshCraft finds the tags, lists them here and links them in [`design/weshcraft.graph.mjs`](../design/weshcraft.graph.mjs), the product graph code graphs index (`codegraph explore "how does <function> work"`).

## Function: Invoices

| | Element | Tag | Code |
|---|---|---|---|
| function | [Invoices](FUNCTIONS.md#fn-invoices) | `@weshcraft fn-invoices` | — |
| operation | [GET /invoices](back/api.md#op-ep-get-invoices) | `@weshcraft GET /invoices` | — |
| operation | [POST /invoices](back/api.md#op-ep-post-invoices) | `@weshcraft POST /invoices` | — |
| operation | [GET /invoices/{id}](back/api.md#op-ep-get-invoices-id) | `@weshcraft GET /invoices/{id}` | — |
| operation | [POST /invoices/{id}/send](back/api.md#op-ep-post-invoices-id-send) | `@weshcraft POST /invoices/{id}/send` | — |
| entity | [Invoice](back/domain.md#entity-invoice) | `@weshcraft Invoice` | — |
| tool | [create_invoice](front/mcp/tool-create-invoice.md) | `@weshcraft create_invoice` | — |
| tool | [list_invoices](front/mcp/tool-list-invoices.md) | `@weshcraft list_invoices` | — |
| tool | [send_invoice](front/mcp/tool-send-invoice.md) | `@weshcraft send_invoice` | — |

## Function: Customers

| | Element | Tag | Code |
|---|---|---|---|
| function | [Customers](FUNCTIONS.md#fn-customers) | `@weshcraft fn-customers` | — |
| operation | [GET /customers](back/api.md#op-ep-get-customers) | `@weshcraft GET /customers` | — |
| entity | [Customer](back/domain.md#entity-customer) | `@weshcraft Customer` | — |

## Function: Agent tools

| | Element | Tag | Code |
|---|---|---|---|
| function | [Agent tools](FUNCTIONS.md#fn-agent-tools) | `@weshcraft fn-agent-tools` | — |
| tool | [void_invoice](front/mcp/tool-void-invoice.md) | `@weshcraft void_invoice` | — |

