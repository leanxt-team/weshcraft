# Domain model

Entities and fields the prototype displays or edits. Types come from explicit bindings; inferred fields default to `string` until confirmed.

<a id="entity-subscription"></a>
## Subscription

Source layers: `#14` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| plan | string | {{subscription.plan}} | `#14` | [Profile](../front/screens/scr-profile.md) | ⚠️ nothing | explicit |

<a id="entity-user"></a>
## User

Source layers: `#12`, `#13` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| name | string | {{user.name}} | `#12` | [Profile](../front/screens/scr-profile.md) | [`GET /users/me`](api.md#op-get-users-me-3) | explicit |
| email | email | {{user.email:email}} | `#13` | [Profile](../front/screens/scr-profile.md) | [`GET /users/me`](api.md#op-get-users-me-3) | explicit |

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "entities": [
  {
   "fields": [
    "plan"
   ],
   "name": "Subscription"
  },
  {
   "fields": [
    "name",
    "email"
   ],
   "name": "User"
  }
 ],
 "kind": "back-domain",
 "sourceHash": "071d12bcdc75e2a0"
}
-->
