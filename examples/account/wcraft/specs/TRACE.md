# Spec ⇄ code

0 of 7 screens, components, operations, entities and tools have code tagged for them. Tag the code that implements an element with its ref in a comment (`// @weshcraft scr-sign-up`, `# @weshcraft POST /users`); WeshCraft finds the tags, lists them here and links them in [`wcraft/graph.mjs`](../graph.mjs), the product graph code graphs index (`codegraph explore "how does <function> work"`).

## Function: Sign up

| | Element | Tag | Code |
|---|---|---|---|
| function | [Sign up](FUNCTIONS.md#fn-sign-up) | `@weshcraft fn-sign-up` | — |
| screen | [Sign up](front/screens/scr-sign-up.md) | `@weshcraft scr-sign-up` | — |
| screen | [Profile](front/screens/scr-profile.md) | `@weshcraft scr-profile` | — |
| operation | [POST /users](back/api.md#op-create-account-10) | `@weshcraft POST /users` | — |
| operation | [GET /users/me](back/api.md#op-get-users-me-3) | `@weshcraft GET /users/me` | — |
| operation | [PATCH /users/me](back/api.md#op-patch-users-me-15) | `@weshcraft PATCH /users/me` | — |
| entity | [User](back/domain.md#entity-user) | `@weshcraft User` | — |

## Not in a function

| | Element | Tag | Code |
|---|---|---|---|
| entity | [Subscription](back/domain.md#entity-subscription) | `@weshcraft Subscription` | — |

