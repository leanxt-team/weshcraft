# Screen: Sign up

| | |
|---|---|
| Function | [Sign up](../../FUNCTIONS.md#fn-sign-up) |
| Code tag | `@weshcraft scr-sign-up` ([trace](../../TRACE.md)) |
| Node | `#2` |
| Page | Account |
| Frame | 393 × 600 px |
| Dev status | not marked |
| Fingerprint | `c2f2ec602cd9` |
| Prototype | [wcraft/prototype/index.html#scr-sign-up](../../../prototype/index.html#scr-sign-up) |

## Purpose

Sign up is reached from outside the prototyped flows. It shows 5 text layers, 0 component instances and 1 interactions.

<a id="layout"></a>
## Layout

Hierarchy, sizes and auto layout exactly as designed (px). Instances are specified in their component spec.

- `#2` **Sign up** — frame · 393×600 · auto layout vertical, gap 14 · padding 56/32/32/32 · align min/min · clips
  - `#4` **Title** — text · 300×36.4 · size hug×hug — “Create your account”
  - `#5` **Subtitle** — text · 300×21 · size hug×hug — “Plan trips and save trails across devices.”
  - `#6` **Email field** — frame · 329×48 · auto layout horizontal, gap 8 · padding 0/14/0/14 · align min/center · size fill×fixed · radius 10
    - `#7` **Placeholder** — text · 300×21 · size hug×hug — “you@example.com”
  - `#8` **Password field** — frame · 329×48 · auto layout horizontal, gap 8 · padding 0/14/0/14 · align min/center · size fill×fixed · radius 10
    - `#9` **Placeholder** — text · 300×21 · size hug×hug — “At least 8 characters”
  - `#10` **Button/Create account** — frame · 329×50 · auto layout horizontal, gap 0 · align center/center · size fill×fixed · radius 12
    - `#11` **Label** — text · 300×22.4 · size hug×hug — “Create account”

Root frame CSS (generated from the prototype):

```css
.scr-sign-up {
  width: 393px;
  height: 600px;
  background: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 56px 32px 32px 32px;
  box-sizing: border-box;
  position: relative;
}
```

<a id="copy"></a>
## Copy

Shown verbatim. Typography and colour per layer; contrast is WCAG 2.1 against the nearest filled ancestor.

| Node | Layer | Text | Typography | Colour | Contrast |
|---|---|---|---|---|---|
| `#4` | Title | Create your account | Inter Bold 26px / 140% | #0f172a on #ffffff | 17.85:1 ✅ |
| `#5` | Subtitle | Plan trips and save trails across devices. | Inter Regular 15px / 140% | #475569 on #ffffff | 7.58:1 ✅ |
| `#7` | Placeholder | you@example.com | Inter Regular 15px / 140% | #64748b on #f1f5f9 | 4.34:1 ⚠️ below 4.5:1 |
| `#9` | Placeholder | At least 8 characters | Inter Regular 15px / 140% | #64748b on #f1f5f9 | 4.34:1 ⚠️ below 4.5:1 |
| `#11` | Label | Create account | Inter SemiBold 16px / 140% | #ffffff on #0e7c66 | 5.13:1 ✅ |

<a id="components"></a>
## Components

No component instances.

<a id="interactions"></a>
## Interactions

| Node | Element | Trigger | Action | Destination | Transition |
|---|---|---|---|---|---|
| `#10` | Create account | onClick | navigate | [Profile](scr-profile.md) | dissolve 250 ms |

<a id="inputs"></a>
## Inputs

| Node | Field | Kind | Placeholder / default | Validation |
|---|---|---|---|---|
| `#6` | Email field | email | you@example.com | RFC 5322 address, required |
| `#8` | Password field | password | At least 8 characters | required, min 8 chars (confirm) |

<a id="links"></a>
## Front ⇄ back links

Where this screen meets the back end (full map: [LINKS.md](../../LINKS.md)). ▶ triggers · ⇢ submits · ☰ filled by · ◉ shows.

| Layer | Element | Link | Back end | |
|---|---|---|---|---|
| `#10` | Create account | ▶ triggers | [`POST /users`](../../back/api.md#op-create-account-10) | returns `User` |
| `#6` | Email field | ⇢ submits to | [`POST /users`](../../back/api.md#op-create-account-10) | returns `User` |
| `#8` | Password field | ⇢ submits to | [`POST /users`](../../back/api.md#op-create-account-10) | returns `User` |

## Design tokens used

None bound; raw colours: #0e7c66, #0f172a, #475569, #64748b, #f1f5f9, #ffffff

## Designer annotations

- `#10` Button/Create account (development): POST /users → User

## Acceptance criteria

1. Renders at 393 × 600 px with the hierarchy, spacing and sizes in §Layout; a pixel comparison with the prototype render shows no difference above the project tolerance.
2. Every text in §Copy is shown verbatim with its typography and colour.
3. Activating “Create account” (`#10`) navigates to Profile with a dissolve transition of 250 ms; it is reachable by keyboard and announced as a button.
4. Activating `#10` calls `POST /users`; while pending the control is disabled; on error the screen stays and shows the error.
5. Contrast: `#7`, `#9` are below WCAG AA in the design; keep as designed or fix in the design first (the spec follows the prototype).

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "actions": [
  {
   "dest": "scr-profile",
   "node": 10,
   "type": "navigate"
  }
 ],
 "components": [],
 "copy": [
  {
   "node": 4,
   "text": "Create your account"
  },
  {
   "node": 5,
   "text": "Plan trips and save trails across devices."
  },
  {
   "node": 7,
   "text": "you@example.com"
  },
  {
   "node": 9,
   "text": "At least 8 characters"
  },
  {
   "node": 11,
   "text": "Create account"
  }
 ],
 "fingerprint": "c2f2ec602cd9",
 "function": "fn-sign-up",
 "inputs": [
  6,
  8
 ],
 "instances": [],
 "key": "scr-sign-up",
 "kind": "front-screen",
 "links": [
  {
   "node": 10,
   "op": "op-create-account-10",
   "rel": "triggers"
  },
  {
   "node": 6,
   "op": "op-create-account-10",
   "rel": "submits"
  },
  {
   "node": 8,
   "op": "op-create-account-10",
   "rel": "submits"
  }
 ],
 "node": 2,
 "operations": [
  "op-create-account-10"
 ],
 "size": [
  393,
  600
 ],
 "sourceHash": "e868cb3c8b18019b"
}
-->
