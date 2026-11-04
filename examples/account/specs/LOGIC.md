# Logic

What the screens and the API cannot show: 1 rule and 0 lifecycles. Nothing is declared yet: what follows is inferred from the design and the API (required fields, status values, operations). Declare rules and lifecycles with `design_logic` or in the Logic view.

## Rules

### Validation

| Rule | Details | Applies to |
|---|---|---|
| <a id="rule-post-users-inputs"></a>POST /users submits Email field, Password field _(inferred)_ | Validate each input before the call (format, required, length); the design does not say which constraints apply yet. | [`POST /users`](back/api.md#op-create-account-10) · [Sign up](front/screens/scr-sign-up.md) |

## Notes

<!-- weshcraft:notes:start -->
_Edge cases, invariants, open questions about the logic._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "declared": false,
 "kind": "logic",
 "machines": [],
 "rules": [
  {
   "applies": [
    "op-create-account-10",
    "scr-sign-up"
   ],
   "key": "rule-post-users-inputs",
   "kind": "validation",
   "name": "POST /users submits Email field, Password field",
   "source": "inferred",
   "text": "Validate each input before the call (format, required, length); the design does not say which constraints apply yet."
  }
 ],
 "sourceHash": "67b6d208abc608b7"
}
-->
