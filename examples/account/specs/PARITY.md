# Spec ↔ prototype parity

✅ **In sync.** 118 checks, 0 errors, 2 warnings, score 100%. Prototype `0086e994860a8aee` (2 screens, 0 components, 0 tokens, 3 operations).

| Level | Check | File | Detail |
|---|---|---|---|
| warning | functions-suggested | `specs/FUNCTIONS.md` | the function is suggested from the prototype: name them and give each a purpose (design_functions or the Functions view) |
| warning | gap-unloaded-data | `specs/LINKS.md` | Subscription.plan is shown on scr-profile but no operation on that screen loads Subscription (`#14`) |
