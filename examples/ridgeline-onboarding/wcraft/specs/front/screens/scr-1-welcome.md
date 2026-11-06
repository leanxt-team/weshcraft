# Screen: 1 Welcome

| | |
|---|---|
| Function | [Onboarding](../../FUNCTIONS.md#fn-onboarding) |
| Code tag | `@weshcraft scr-1-welcome` ([trace](../../TRACE.md)) |
| Node | `#2` |
| Page | Onboarding |
| Frame | 393 × 852 px |
| Dev status | not marked |
| Fingerprint | `38228a482aae` |
| Prototype | [wcraft/prototype/index.html#scr-1-welcome](../../../prototype/index.html#scr-1-welcome) |

## Purpose

1 Welcome is reached from the start of the flow. It shows 5 text layers, 0 component instances and 1 interactions.

<a id="layout"></a>
## Layout

Hierarchy, sizes and auto layout exactly as designed (px). Instances are specified in their component spec.

- `#2` **1 Welcome** — frame · 393×852 · clips
  - `#3` **Illustration** — frame · 940×522 · clips
    - `#4` **Sun** — ellipse · 120.11×120.11
    - `#5` **Far ridge** — vector · 940×365.62
    - `#6` **Mid ridge** — vector · 940×271.66
    - `#7` **Snow** — vector · 49.62×41.76
    - `#8` **Near hills** — vector · 940×116.53
  - `#9` **Status bar** — frame · 393×48 · auto layout horizontal, gap 0 · padding 6/30/0/30 · align spaceBetween/center
    - `#10` **9:41** — text · 32×21 · size hug×hug — “9:41”
    - `#11` **Battery** — frame · 25×12 · radius 3.5 · clips
      - `#12` **Level** — rectangle · 17×8 · radius 1.5
  - `#13` **Panel** — frame · 393×382 · auto layout vertical, gap 16 · padding 32/28/28/28 · align min/min · radius 32/32/0/0
    - `#14` **Progress** — frame · 50×8 · auto layout horizontal, gap 6 · align min/center · size hug×hug
      - `#15` **Step 1** — rectangle · 22×8 · radius 4
      - `#16` **Step 2** — rectangle · 8×8 · radius 4
      - `#17` **Step 3** — rectangle · 8×8 · radius 4
    - `#18` **Find your next summit** — text · 314×36 · size hug×hug — “Find your next summit”
    - `#19` **Hand-picked trails, live conditions and offline maps for every w** — text · 337×45 · size fixed×hug — “Hand-picked trails, live conditions and offline maps for eve”…
    - `#20` **Spacer** — frame · 10×4 · clips
    - `#21` **Get started** — frame · 337×54 · auto layout horizontal, gap 8 · align center/center · size fill×fixed · radius 16
      - `#22` **Get started** — text · 83×21 · size hug×hug — “Get started”
    - `#23` **I already have an account** — text · 337×18.2 · size fixed×hug — “I already have an account”

Root frame CSS (generated from the prototype):

```css
.scr-1-welcome {
  width: 393px;
  height: 852px;
  background: #1c2046;
  overflow: hidden;
  position: relative;
}
```

<a id="copy"></a>
## Copy

Shown verbatim. Typography and colour per layer; contrast is WCAG 2.1 against the nearest filled ancestor.

| Node | Layer | Text | Typography | Colour | Contrast |
|---|---|---|---|---|---|
| `#10` | 9:41 | 9:41 | Inter SemiBold 15px / 140% | #ffffff on #1c2046 | 15.62:1 ✅ |
| `#18` | Find your next summit | Find your next summit | Inter Bold 30px / 120% | #0f172a on #ffffff | 17.85:1 ✅ |
| `#19` | Hand-picked trails, live conditions and offline maps for every w | Hand-picked trails, live conditions and offline maps for every weekend in the mountains. | Inter Regular 15px / 150% | #64748b on #ffffff | 4.76:1 ✅ |
| `#22` | Get started | Get started | Inter SemiBold 15px / 140% | #ffffff on #0e7c66 | 5.13:1 ✅ |
| `#23` | I already have an account | I already have an account | Inter Medium 13px / 140% | #0e7c66 on #ffffff | 5.13:1 ✅ |

<a id="components"></a>
## Components

No component instances.

<a id="interactions"></a>
## Interactions

| Node | Element | Trigger | Action | Destination | Transition |
|---|---|---|---|---|---|
| `#21` | Get started | onClick | navigate | [2 Interests](scr-2-interests.md) | push 400 ms |

<a id="inputs"></a>
## Inputs

No input fields detected.

<a id="links"></a>
## Front ⇄ back links

This screen has no back-end link (static content or navigation only).

## Design tokens used

None bound; raw colours: #0e7c66, #0f172a, #1c2046, #64748b, #cbd5e1, #ffffff

## Acceptance criteria

1. Renders at 393 × 852 px with the hierarchy, spacing and sizes in §Layout; a pixel comparison with the prototype render shows no difference above the project tolerance.
2. Every text in §Copy is shown verbatim with its typography and colour.
3. Activating “Get started” (`#21`) navigates to 2 Interests with a push transition of 400 ms; it is reachable by keyboard and announced as a button.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "actions": [
  {
   "dest": "scr-2-interests",
   "node": 21,
   "type": "navigate"
  }
 ],
 "components": [],
 "copy": [
  {
   "node": 10,
   "text": "9:41"
  },
  {
   "node": 18,
   "text": "Find your next summit"
  },
  {
   "node": 19,
   "text": "Hand-picked trails, live conditions and offline maps for every weekend in the mountains."
  },
  {
   "node": 22,
   "text": "Get started"
  },
  {
   "node": 23,
   "text": "I already have an account"
  }
 ],
 "fingerprint": "38228a482aae",
 "function": "fn-onboarding",
 "inputs": [],
 "instances": [],
 "key": "scr-1-welcome",
 "kind": "front-screen",
 "links": [],
 "node": 2,
 "operations": [],
 "size": [
  393,
  852
 ],
 "sourceHash": "e249123dd8bfcc22"
}
-->
