# Spec ↔ prototype parity

✅ **In sync.** 101 checks, 0 errors, 2 warnings, score 100%. Prototype `06ae1ccbb7dfb23a` (0 screens, 0 components, 0 tokens, 5 operations).

| Level | Check | File | Detail |
|---|---|---|---|
| warning | functions-suggested | `wcraft/specs/FUNCTIONS.md` | the 3 functions are suggested from the prototype: name them and give each a purpose (the Functions view, or weshcraft_edit) |
| warning | logic-open-transition | `wcraft/specs/LOGIC.md` | POST /invoices/{id}/send changes Invoice but no status says to what: declare the transition (Logic view, or weshcraft_edit {op:"lifecycle"}) |
