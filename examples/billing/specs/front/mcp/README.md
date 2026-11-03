# MCP server: billing-mcp

4 tools, 1 resource, 1 prompt. Version 0.3.0.

## Tools

| Tool | Behaviour | Back end | Purpose |
|---|---|---|---|
| [`create_invoice`](tool-create-invoice.md) | writes | `POST /invoices` | Create a draft invoice for a customer. |
| [`list_invoices`](tool-list-invoices.md) | read-only | `GET /invoices` | List invoices, optionally by status. |
| [`send_invoice`](tool-send-invoice.md) | writes, idempotent, open world | `POST /invoices/{id}/send` | Email an open invoice to its customer. |
| [`void_invoice`](tool-void-invoice.md) | writes, **destructive**, idempotent | in server | Void an invoice. |

## Resources

| URI | Name | Type | Description |
|---|---|---|---|
| `billing://invoices/{id}.pdf` (template) | Invoice PDF | application/pdf | Rendered invoice. |

## Prompts

- `chase_overdue` — Draft polite reminders for overdue invoices. Arguments: `days`?.

## Conventions

- Tool names are stable identifiers: renaming one is a breaking change for every agent prompt that uses it.
- Descriptions are the interface: they say when to use the tool, what it changes and what it returns.
- Input schemas validate before any effect; errors come back as tool results (`isError: true`).
- Annotations are honest: `readOnlyHint` only when nothing changes, `destructiveHint` whenever data can be lost.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "kind": "front-mcp",
 "prompts": [
  "chase_overdue"
 ],
 "resources": [
  "billing://invoices/{id}.pdf"
 ],
 "sourceHash": "4adc5ece25fbe421",
 "tools": [
  "create_invoice",
  "list_invoices",
  "send_invoice",
  "void_invoice"
 ]
}
-->
