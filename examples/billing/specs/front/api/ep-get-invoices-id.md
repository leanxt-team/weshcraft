# Endpoint: `GET /invoices/{id}`

| | |
|---|---|
| Summary | Get one invoice |
| operationId | `getInvoice` |
| Tags | Invoices |
| Auth | `bearer` |
| Used by | — |
| Fingerprint | `423c17621467` |

## Parameters

| Name | In | Type | Required | Constraints | Description |
|---|---|---|---|---|---|
| `id` | path | string | yes | format `uuid` | — |

## Request body

None.

## Responses

| Status | Body | Description |
|---|---|---|
| 200 | `Invoice` | The invoice. |
| 404 | — | Not found. |

## Example

```bash
curl -X GET 'https://api.example.com/v1/invoices/<id>' \
  -H 'Authorization: Bearer <token>'
```

## Acceptance criteria

1. Missing or malformed path parameter `id` returns `400` (path: `404`) with the field named.
2. Responds `200` with `Invoice` when: The invoice..
3. Responds `404` when: Not found..
4. Without valid credentials (bearer) responds `401`; without permission `403`.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "fingerprint": "423c17621467",
 "key": "ep-get-invoices-id",
 "kind": "front-endpoint",
 "method": "GET",
 "op": "op-ep-get-invoices-id",
 "path": "/invoices/{id}",
 "sourceHash": "4adc5ece25fbe421"
}
-->
