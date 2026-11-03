# Screen: Profile

| | |
|---|---|
| Node | `#3` |
| Page | Account |
| Frame | 393 × 600 px |
| Dev status | not marked |
| Fingerprint | `388d8dc61cc8` |
| Prototype | [prototype/index.html#scr-profile](../../prototype/index.html#scr-profile) |

## Purpose

Profile is reached from “Create account” on Sign up. It shows 4 text layers, 0 component instances and 0 interactions.

## Layout

Hierarchy, sizes and auto layout exactly as designed (px). Instances are specified in their component spec.

- `#3` **Profile** — frame · 393×600 · auto layout vertical, gap 12 · padding 56/32/32/32 · align min/min · clips
  - `#12` **Name** — text · 300×33.6 · size hug×hug — “{{user.name}}”
  - `#13` **Email** — text · 300×21 · size hug×hug — “{{user.email:email}}”
  - `#14` **Plan** — text · 300×21 · size hug×hug — “{{subscription.plan}}”
  - `#15` **Button/Save** — frame · 329×50 · auto layout horizontal, gap 0 · align center/center · size fill×fixed · radius 12
    - `#16` **Label** — text · 300×22.4 · size hug×hug — “Save”

Root frame CSS (generated from the prototype):

```css
.scr-profile {
  width: 393px;
  height: 600px;
  background: #f8fafc;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 56px 32px 32px 32px;
  box-sizing: border-box;
  position: relative;
}
```

## Copy

Shown verbatim. Typography and colour per layer; contrast is WCAG 2.1 against the nearest filled ancestor.

| Node | Layer | Text | Typography | Colour | Contrast |
|---|---|---|---|---|---|
| `#12` | Name | {{user.name}} | Inter Bold 24px / 140% | #0f172a on #f8fafc | 17.06:1 ✅ |
| `#13` | Email | {{user.email:email}} | Inter Regular 15px / 140% | #475569 on #f8fafc | 7.24:1 ✅ |
| `#14` | Plan | {{subscription.plan}} | Inter SemiBold 15px / 140% | #0e7c66 on #f8fafc | 4.9:1 ✅ |
| `#16` | Label | Save | Inter SemiBold 16px / 140% | #ffffff on #0e7c66 | 5.13:1 ✅ |

## Components

No component instances.

## Interactions

No prototype interactions on this screen.

## Inputs

No input fields detected.

## Front ⇄ back links

Where this screen meets the back end (full map: [LINKS.md](../../LINKS.md)). ▶ triggers · ⇢ submits · ☰ filled by · ◉ shows.

| Layer | Element | Link | Back end | |
|---|---|---|---|---|
| `#15` | Save | ▶ triggers | [`PATCH /users/me`](../../back/api.md#op-patch-users-me-15) |  |
| `#14` | {{subscription.plan}} | ◉ shows | [`Subscription.plan`](../../back/domain.md#entity-subscription) | ⚠️ no operation loads it |
| `#12` | {{user.name}} | ◉ shows | [`User.name`](../../back/domain.md#entity-user) | loaded by [`GET /users/me`](../../back/api.md#op-get-users-me-3) |
| `#13` | {{user.email:email}} | ◉ shows | [`User.email`](../../back/domain.md#entity-user) | loaded by [`GET /users/me`](../../back/api.md#op-get-users-me-3) |

⚠️ Gap: Subscription.plan is shown on scr-profile but no operation on that screen loads Subscription.

## Design tokens used

None bound; raw colours: #0e7c66, #0f172a, #475569, #f8fafc, #ffffff

## Designer annotations

- `#3` Profile (development): GET /users/me → User
- `#15` Button/Save (development): PATCH /users/me

## Acceptance criteria

1. Renders at 393 × 600 px with the hierarchy, spacing and sizes in §Layout; a pixel comparison with the prototype render shows no difference above the project tolerance.
2. Every text in §Copy is shown verbatim with its typography and colour.
3. Activating `#15` calls `PATCH /users/me`; while pending the control is disabled; on error the screen stays and shows the error.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "actions": [],
 "components": [],
 "copy": [
  {
   "node": 12,
   "text": "{{user.name}}"
  },
  {
   "node": 13,
   "text": "{{user.email:email}}"
  },
  {
   "node": 14,
   "text": "{{subscription.plan}}"
  },
  {
   "node": 16,
   "text": "Save"
  }
 ],
 "fingerprint": "388d8dc61cc8",
 "inputs": [],
 "instances": [],
 "key": "scr-profile",
 "kind": "front-screen",
 "links": [
  {
   "node": 15,
   "op": "op-patch-users-me-15",
   "rel": "triggers"
  },
  {
   "field": "Subscription.plan",
   "node": 14,
   "rel": "displays"
  },
  {
   "field": "User.name",
   "node": 12,
   "rel": "displays"
  },
  {
   "field": "User.email",
   "node": 13,
   "rel": "displays"
  }
 ],
 "node": 3,
 "operations": [
  "op-get-users-me-3",
  "op-patch-users-me-15"
 ],
 "size": [
  393,
  600
 ],
 "sourceHash": "071d12bcdc75e2a0"
}
-->
