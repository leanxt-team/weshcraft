// @ts-nocheck
/* eslint-disable */
// WeshCraft product graph for Billing service. Generated: do not edit; regenerated with the specs.
// Never imported, never run. It lets code graphs (codegraph) see the product: functions → screens,
// components → operations → entities, and the code tagged `@weshcraft <ref>` that implements each one.
//   codegraph explore "how does <function> work" · codegraph impact <symbol> · codegraph callers <symbol>

/**
 * How «Billing service» works: its functions, in journey order.
 * Spec: specs/FUNCTIONS.md
 */
export function weshcraftProduct() {
  fnInvoices();
  fnCustomers();
  fnAgentTools();
}

/**
 * Function «Invoices»
 * Who: AI agents (MCP), integrations (API)
 * Data: Invoice (reads, writes)
 * Spec: specs/FUNCTIONS.md#fn-invoices
 * Tag the code that implements it: @weshcraft fn-invoices
 */
export function fnInvoices() {
  opGetInvoices();
  opPostInvoices();
  opGetInvoicesId();
  opPostInvoicesIdSend();
  toolCreateInvoice();
  toolListInvoices();
  toolSendInvoice();
}

/**
 * Function «Customers»
 * Who: integrations (API)
 * Data: Customer (reads)
 * Spec: specs/FUNCTIONS.md#fn-customers
 * Tag the code that implements it: @weshcraft fn-customers
 */
export function fnCustomers() {
  opGetCustomers();
}

/**
 * Function «Agent tools»
 * Who: AI agents (MCP)
 * Spec: specs/FUNCTIONS.md#fn-agent-tools
 * Tag the code that implements it: @weshcraft fn-agent-tools
 */
export function fnAgentTools() {
  toolVoidInvoice();
}

/**
 * Operation «GET /invoices»
 * Spec: specs/back/api.md#op-ep-get-invoices
 * Tag the code that implements it: @weshcraft GET /invoices
 */
export function opGetInvoices() {
  entityInvoice();
}

/**
 * Operation «POST /invoices»
 * Spec: specs/back/api.md#op-ep-post-invoices
 * Tag the code that implements it: @weshcraft POST /invoices
 */
export function opPostInvoices() {
  entityInvoice();
}

/**
 * Operation «GET /invoices/{id}»
 * Spec: specs/back/api.md#op-ep-get-invoices-id
 * Tag the code that implements it: @weshcraft GET /invoices/{id}
 */
export function opGetInvoicesId() {
  entityInvoice();
}

/**
 * Operation «POST /invoices/{id}/send»
 * Spec: specs/back/api.md#op-ep-post-invoices-id-send
 * Tag the code that implements it: @weshcraft POST /invoices/{id}/send
 */
export function opPostInvoicesIdSend() {}

/**
 * Operation «GET /customers»
 * Spec: specs/back/api.md#op-ep-get-customers
 * Tag the code that implements it: @weshcraft GET /customers
 */
export function opGetCustomers() {
  entityCustomer();
}

/**
 * Entity «Customer»
 * Spec: specs/back/domain.md#entity-customer
 * Tag the code that implements it: @weshcraft Customer
 */
export function entityCustomer() {}

/**
 * Entity «Invoice»
 * Spec: specs/back/domain.md#entity-invoice
 * Tag the code that implements it: @weshcraft Invoice
 */
export function entityInvoice() {}

/**
 * MCP tool «create_invoice»
 * Spec: specs/front/mcp/tool-create-invoice.md
 * Tag the code that implements it: @weshcraft create_invoice
 */
export function toolCreateInvoice() {
  opPostInvoices();
}

/**
 * MCP tool «list_invoices»
 * Spec: specs/front/mcp/tool-list-invoices.md
 * Tag the code that implements it: @weshcraft list_invoices
 */
export function toolListInvoices() {
  opGetInvoices();
}

/**
 * MCP tool «send_invoice»
 * Spec: specs/front/mcp/tool-send-invoice.md
 * Tag the code that implements it: @weshcraft send_invoice
 */
export function toolSendInvoice() {
  opPostInvoicesIdSend();
}

/**
 * MCP tool «void_invoice»
 * Spec: specs/front/mcp/tool-void-invoice.md
 * Tag the code that implements it: @weshcraft void_invoice
 */
export function toolVoidInvoice() {}
