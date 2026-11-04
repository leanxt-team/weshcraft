# Back-end conventions

Applies to every operation in [API](api.md) unless the operation says otherwise.

- **Transport**: JSON over HTTPS, UTF-8, `application/json`. Times are RFC 3339 UTC.
- **Auth**: bearer token on every call; unauthenticated calls get `401`, forbidden ones `403`.
- **Validation**: done on the server for every write; errors are `400 {code, message, fields}` where `fields` maps each request field to a message the screen shows next to its input.
- **Lists**: cursor pagination (`?cursor=&limit=`, limit 1–100, default 20), stable order, `next: null` on the last page.
- **Idempotency**: `POST` accepts an `Idempotency-Key` header; a repeat within 24 h returns the first result.
- **Concurrency**: updates carry `If-Match` with the entity ETag; a stale write gets `409`.
- **Observability**: each request logs a request id (returned as `X-Request-Id`), route, status and latency; no personal data in logs.
- **Performance**: p95 under 300 ms for reads backing a screen's first paint.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "kind": "back-conventions",
 "sourceHash": "b85bb69c1a0acf67"
}
-->
