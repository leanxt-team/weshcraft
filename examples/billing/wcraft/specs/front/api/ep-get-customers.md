# Endpoint: `GET /customers`

| | |
|---|---|
| Summary | List customers |
| operationId | `listCustomers` |
| Tags | Customers |
| Auth | `bearer` |
| Used by | — |
| Fingerprint | `cf87224ea2c5` |

## Parameters

None.

## Request body

None.

## Responses

| Status | Body | Description |
|---|---|---|
| 200 | `Customer[]` | Customers. |

## Example

```bash
curl -X GET 'https://api.example.com/v1/customers' \
  -H 'Authorization: Bearer <token>'
```

## Acceptance criteria

1. Responds `200` with `Customer[]` when: Customers..
2. Without valid credentials (bearer) responds `401`; without permission `403`.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "fingerprint": "cf87224ea2c5",
 "key": "ep-get-customers",
 "kind": "front-endpoint",
 "method": "GET",
 "op": "op-ep-get-customers",
 "path": "/customers",
 "sourceHash": "06ae1ccbb7dfb23a"
}
-->
