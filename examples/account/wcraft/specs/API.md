# API & MCP

3 operations, by function. Request and response details are in [the API spec](back/api.md) and [`openapi.json`](back/openapi.json); conventions (auth, errors, pagination) in [conventions](back/conventions.md).

## Sign up

| Method | Path | What | Called from | Returns |
|---|---|---|---|---|
| [`POST`](back/api.md#op-create-account-10) | `/users` | Create account | [Sign up](front/screens/scr-sign-up.md) | [User](DATA.md#data-user) |
| [`GET`](back/api.md#op-get-users-me-3) | `/users/me` | GET /users/me → User | [Profile](front/screens/scr-profile.md) | [User](DATA.md#data-user) |
| [`PATCH`](back/api.md#op-patch-users-me-15) | `/users/me` | PATCH /users/me | [Profile](front/screens/scr-profile.md) | [User](DATA.md#data-user) |

## Notes

<!-- weshcraft:notes:start -->
_Versioning, rate limits, idempotency, webhooks, open questions._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "endpoints": [],
 "kind": "api-overview",
 "operations": [
  {
   "fn": "fn-sign-up",
   "key": "op-create-account-10",
   "method": "POST",
   "path": "/users"
  },
  {
   "fn": "fn-sign-up",
   "key": "op-get-users-me-3",
   "method": "GET",
   "path": "/users/me"
  },
  {
   "fn": "fn-sign-up",
   "key": "op-patch-users-me-15",
   "method": "PATCH",
   "path": "/users/me"
  }
 ],
 "sourceHash": "e868cb3c8b18019b",
 "tools": []
}
-->
