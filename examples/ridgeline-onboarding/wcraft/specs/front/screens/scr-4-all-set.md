# Screen: 4 All set

| | |
|---|---|
| Function | [Onboarding](../../FUNCTIONS.md#fn-onboarding) |
| Code tag | `@weshcraft scr-4-all-set` ([trace](../../TRACE.md)) |
| Node | `#129` |
| Page | Onboarding |
| Frame | 393 × 852 px |
| Dev status | not marked |
| Fingerprint | `4d281d06ec6c` |
| Prototype | [wcraft/prototype/index.html#scr-4-all-set](../../../prototype/index.html#scr-4-all-set) |

## Purpose

4 All set is reached from “Allow location” on 3 Location, “Not now” on 3 Location. It shows 4 text layers, 0 component instances and 0 interactions.

<a id="layout"></a>
## Layout

Hierarchy, sizes and auto layout exactly as designed (px). Instances are specified in their component spec.

- `#129` **4 All set** — frame · 393×852 · clips
  - `#130` **Status bar** — frame · 393×48 · auto layout horizontal, gap 0 · padding 6/30/0/30 · align spaceBetween/center
    - `#131` **9:41** — text · 32×21 · size hug×hug — “9:41”
    - `#132` **Battery** — frame · 25×12 · radius 3.5 · clips
      - `#133` **Level** — rectangle · 17×8 · radius 1.5
  - `#134` **Glow** — ellipse · 420×420
  - `#135` **Badge** — frame · 112×112 · auto layout horizontal, gap 0 · align center/center · radius 56
    - `#136` **Icon/check** — frame · 52×52 · clips
      - `#137` **check** — vector · 30.33×21.67
  - `#138` **Copy** — frame · 393×90.6 · auto layout vertical, gap 12 · padding 0/32/0/32 · align min/center · size fixed×hug
    - `#139` **You're all set, Maya** — text · 250×33.6 · size hug×hug — “You're all set, Maya”
    - `#140` **We found 42 trails within an hour of you. Three of them have gol** — text · 329×45 · size fixed×hug — “We found 42 trails within an hour of you. Three of them have”…
  - `#141` **Footer** — frame · 393×54 · auto layout vertical, gap 0 · padding 0/24/0/24 · align min/min · size fixed×hug
    - `#142` **Explore** — frame · 345×54 · auto layout horizontal, gap 8 · align center/center · size fill×fixed · radius 16
      - `#143` **Explore trails** — text · 95×21 · size hug×hug — “Explore trails”

Root frame CSS (generated from the prototype):

```css
.scr-4-all-set {
  width: 393px;
  height: 852px;
  background: linear-gradient(164.53deg, #14a085 0%, #0a4f42 100%);
  overflow: hidden;
  position: relative;
}
```

<a id="copy"></a>
## Copy

Shown verbatim. Typography and colour per layer; contrast is WCAG 2.1 against the nearest filled ancestor.

| Node | Layer | Text | Typography | Colour | Contrast |
|---|---|---|---|---|---|
| `#131` | 9:41 | 9:41 | Inter SemiBold 15px / 140% | #ffffff on #0a4f42 | 9.5:1 ✅ |
| `#139` | You're all set, Maya | You're all set, Maya | Inter Bold 28px / 120% | #ffffff on #0a4f42 | 9.5:1 ✅ |
| `#140` | We found 42 trails within an hour of you. Three of them have gol | We found 42 trails within an hour of you. Three of them have golden larches this week. | Inter Regular 15px / 150% | #d7f5ec on #0a4f42 | 8.22:1 ✅ |
| `#143` | Explore trails | Explore trails | Inter SemiBold 15px / 140% | #0e7c66 on #ffffff | 5.13:1 ✅ |

<a id="components"></a>
## Components

No component instances.

<a id="interactions"></a>
## Interactions

No prototype interactions on this screen.

<a id="inputs"></a>
## Inputs

No input fields detected.

<a id="links"></a>
## Front ⇄ back links

This screen has no back-end link (static content or navigation only).

## Design tokens used

None bound; raw colours: #0e7c66, #d7f5ec, #ffffff

## Acceptance criteria

1. Renders at 393 × 852 px with the hierarchy, spacing and sizes in §Layout; a pixel comparison with the prototype render shows no difference above the project tolerance.
2. Every text in §Copy is shown verbatim with its typography and colour.

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
   "node": 131,
   "text": "9:41"
  },
  {
   "node": 139,
   "text": "You're all set, Maya"
  },
  {
   "node": 140,
   "text": "We found 42 trails within an hour of you. Three of them have golden larches this week."
  },
  {
   "node": 143,
   "text": "Explore trails"
  }
 ],
 "fingerprint": "4d281d06ec6c",
 "function": "fn-onboarding",
 "inputs": [],
 "instances": [],
 "key": "scr-4-all-set",
 "kind": "front-screen",
 "links": [],
 "node": 129,
 "operations": [],
 "size": [
  393,
  852
 ],
 "sourceHash": "e249123dd8bfcc22"
}
-->
