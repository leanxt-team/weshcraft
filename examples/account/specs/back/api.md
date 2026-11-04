# API

Every operation a screen needs, grouped by screen. Conventions (auth, errors, pagination) are in [conventions](conventions.md); the machine-readable contract is [`openapi.json`](openapi.json).

## Sign up

<a id="op-create-account-10"></a>
### `POST /users` — Create account

- Screen: [Sign up](../front/screens/scr-sign-up.md), triggered by `#10`
- Function: [Sign up](../FUNCTIONS.md#fn-sign-up)
- Code tag: `@weshcraft POST /users` ([trace](../TRACE.md))
- Kind: annotated · confidence: explicit
- Front end: ▶ `#10` Create account · ⇢ `#6` Email field · ⇢ `#8` Password field
- Returns: `User`
- Request body: `email_field` from `#6`, `password_field` from `#8`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

## Profile

<a id="op-get-users-me-3"></a>
### `GET /users/me` — GET /users/me → User

- Screen: [Profile](../front/screens/scr-profile.md), on screen load
- Function: [Sign up](../FUNCTIONS.md#fn-sign-up)
- Code tag: `@weshcraft GET /users/me` ([trace](../TRACE.md))
- Kind: annotated · confidence: explicit
- Response shown: `User.name` (`#12`), `User.email` (`#13`)
- Returns: `User`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-patch-users-me-15"></a>
### `PATCH /users/me` — PATCH /users/me

- Screen: [Profile](../front/screens/scr-profile.md), triggered by `#15`
- Function: [Sign up](../FUNCTIONS.md#fn-sign-up)
- Code tag: `@weshcraft PATCH /users/me` ([trace](../TRACE.md))
- Kind: annotated · confidence: explicit
- Front end: ▶ `#15` Save
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
   "key": "op-create-account-10",
   "method": "POST",
   "path": "/users",
   "screen": "scr-sign-up",
   "trigger": 10
  },
  {
   "key": "op-get-users-me-3",
   "method": "GET",
   "path": "/users/me",
   "screen": "scr-profile",
   "trigger": null
  },
  {
   "key": "op-patch-users-me-15",
   "method": "PATCH",
   "path": "/users/me",
   "screen": "scr-profile",
   "trigger": 15
  }
 ],
 "sourceHash": "67b6d208abc608b7"
}
-->
