# Domain model

Entities and fields the prototype displays or edits. Types come from explicit bindings; inferred fields default to `string` until confirmed.

<a id="entity-customer"></a>
## Customer

Code tag: `@weshcraft Customer` ([trace](../TRACE.md))

Source: API schema `Customer` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| id | id | — |  | — | — | explicit |
| name | string | — |  | — | — | explicit |
| email | email | — |  | — | — | explicit |

<a id="entity-invoice"></a>
## Invoice

Code tag: `@weshcraft Invoice` ([trace](../TRACE.md))

Source: API schema `Invoice` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| customerId | id | — |  | — | — | explicit |
| amount | integer | — |  | — | — | explicit |
| currency | string | — |  | — | — | explicit |
| dueDate | date | — |  | — | — | explicit |
| id | id | — |  | — | — | explicit |
| status | string | — |  | — | — | explicit |
| sentAt | datetime | — |  | — | — | explicit |

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "entities": [
  {
   "fields": [
    "id",
    "name",
    "email"
   ],
   "name": "Customer"
  },
  {
   "fields": [
    "customerId",
    "amount",
    "currency",
    "dueDate",
    "id",
    "status",
    "sentAt"
   ],
   "name": "Invoice"
  }
 ],
 "kind": "back-domain",
 "sourceHash": "53efee9c860fc944"
}
-->
