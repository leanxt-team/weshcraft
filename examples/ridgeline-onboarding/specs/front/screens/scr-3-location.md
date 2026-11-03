# Screen: 3 Location

| | |
|---|---|
| Node | `#89` |
| Page | Onboarding |
| Frame | 393 × 852 px |
| Dev status | not marked |
| Fingerprint | `3a661accb522` |
| Prototype | [prototype/index.html#scr-3-location](../../prototype/index.html#scr-3-location) |

## Purpose

3 Location is reached from “Continue” on 2 Interests. It shows 5 text layers, 0 component instances and 3 interactions.

## Layout

Hierarchy, sizes and auto layout exactly as designed (px). Instances are specified in their component spec.

- `#89` **3 Location** — frame · 393×852 · clips
  - `#90` **Status bar** — frame · 393×48 · auto layout horizontal, gap 0 · padding 6/30/0/30 · align spaceBetween/center
    - `#91` **9:41** — text · 32×21 · size hug×hug — “9:41”
    - `#92` **Battery** — frame · 25×12 · radius 3.5 · clips
      - `#93` **Level** — rectangle · 17×8 · radius 1.5
  - `#94` **Top** — frame · 393×40 · auto layout horizontal, gap 0 · padding 0/24/0/24 · align spaceBetween/center · size fixed×hug
    - `#95` **Back** — frame · 40×40 · auto layout horizontal, gap 0 · align center/center · radius 20
      - `#96` **Icon/back** — frame · 20×20 · clips
        - `#97` **back** — vector · 5×10
    - `#98` **Progress** — frame · 50×8 · auto layout horizontal, gap 6 · align min/center · size hug×hug
      - `#99` **Step 1** — rectangle · 8×8 · radius 4
      - `#100` **Step 2** — rectangle · 8×8 · radius 4
      - `#101` **Step 3** — rectangle · 22×8 · radius 4
  - `#102` **Radar** — frame · 300×300 · clips
    - `#103` **Ring 1** — ellipse · 300×300
    - `#104` **Ring 2** — ellipse · 220×220
    - `#105` **Ring 3** — ellipse · 140×140
    - `#106` **Pin** — frame · 80×80 · auto layout horizontal, gap 0 · align center/center · radius 40
      - `#107` **Icon/pin** — frame · 36×36 · clips
        - `#108` **pin** — vector · 21×27.3
    - `#109` **Trail A** — frame · 30×30 · auto layout horizontal, gap 0 · align center/center · radius 15
      - `#110` **Icon/mountain** — frame · 16×16 · clips
        - `#111` **mountain** — vector · 12.67×6.67
    - `#112` **Trail B** — frame · 30×30 · auto layout horizontal, gap 0 · align center/center · radius 15
      - `#113` **Icon/mountain** — frame · 16×16 · clips
        - `#114` **mountain** — vector · 12.67×6.67
    - `#115` **Trail C** — frame · 30×30 · auto layout horizontal, gap 0 · align center/center · radius 15
      - `#116` **Icon/mountain** — frame · 16×16 · clips
        - `#117` **mountain** — vector · 12.67×6.67
    - `#118` **Trail D** — frame · 30×30 · auto layout horizontal, gap 0 · align center/center · radius 15
      - `#119` **Icon/mountain** — frame · 16×16 · clips
        - `#120` **mountain** — vector · 12.67×6.67
  - `#121` **Copy** — frame · 393×113.1 · auto layout vertical, gap 12 · padding 0/28/0/28 · align min/center · size fixed×hug
    - `#122` **Trails near you** — text · 193×33.6 · size hug×hug — “Trails near you”
    - `#123` **Allow location to see conditions, closures and the closest trail** — text · 337×67.5 · size fixed×hug — “Allow location to see conditions, closures and the closest t”…
  - `#124` **Footer** — frame · 393×116 · auto layout vertical, gap 8 · padding 0/24/0/24 · align min/min · size fixed×hug
    - `#125` **Allow** — frame · 345×54 · auto layout horizontal, gap 8 · align center/center · size fill×fixed · radius 16
      - `#126` **Allow location** — text · 103×21 · size hug×hug — “Allow location”
    - `#127` **Not now** — frame · 345×54 · auto layout horizontal, gap 8 · align center/center · size fill×fixed · radius 16
      - `#128` **Not now** — text · 61×21 · size hug×hug — “Not now”

Root frame CSS (generated from the prototype):

```css
.scr-3-location {
  width: 393px;
  height: 852px;
  background: #ffffff;
  overflow: hidden;
  position: relative;
}
```

## Copy

Shown verbatim. Typography and colour per layer; contrast is WCAG 2.1 against the nearest filled ancestor.

| Node | Layer | Text | Typography | Colour | Contrast |
|---|---|---|---|---|---|
| `#91` | 9:41 | 9:41 | Inter SemiBold 15px / 140% | #0f172a on #ffffff | 17.85:1 ✅ |
| `#122` | Trails near you | Trails near you | Inter Bold 28px / 120% | #0f172a on #ffffff | 17.85:1 ✅ |
| `#123` | Allow location to see conditions, closures and the closest trail | Allow location to see conditions, closures and the closest trailheads. You can change this any time. | Inter Regular 15px / 150% | #64748b on #ffffff | 4.76:1 ✅ |
| `#126` | Allow location | Allow location | Inter SemiBold 15px / 140% | #ffffff on #0e7c66 | 5.13:1 ✅ |
| `#128` | Not now | Not now | Inter SemiBold 15px / 140% | #0e7c66 on #ffffff | 5.13:1 ✅ |

## Components

No component instances.

## Interactions

| Node | Element | Trigger | Action | Destination | Transition |
|---|---|---|---|---|---|
| `#95` | Back | onClick | back | — | instant |
| `#125` | Allow location | onClick | navigate | [4 All set](scr-4-all-set.md) | dissolve 300 ms |
| `#127` | Not now | onClick | navigate | [4 All set](scr-4-all-set.md) | moveIn 350 ms |

## Inputs

No input fields detected.

## Front ⇄ back links

Where this screen meets the back end (full map: [LINKS.md](../../LINKS.md)). ▶ triggers · ⇢ submits · ☰ filled by · ◉ shows.

| Layer | Element | Link | Back end | |
|---|---|---|---|---|
| `#125` | Allow location | ▶ triggers | [`POST /location/allow`](../../back/api.md#op-allow-location-125) |  |

## Design tokens used

None bound; raw colours: #0e7c66, #0f172a, #64748b, #cbd5e1, #ffffff

## Acceptance criteria

1. Renders at 393 × 852 px with the hierarchy, spacing and sizes in §Layout; a pixel comparison with the prototype render shows no difference above the project tolerance.
2. Every text in §Copy is shown verbatim with its typography and colour.
3. Activating “Back” (`#95`) goes back to the previous screen; it is reachable by keyboard and announced as a button.
4. Activating “Allow location” (`#125`) navigates to 4 All set with a dissolve transition of 300 ms; it is reachable by keyboard and announced as a button.
5. Activating “Not now” (`#127`) navigates to 4 All set with a moveIn transition of 350 ms; it is reachable by keyboard and announced as a button.
6. Activating `#125` calls `POST /location/allow`; while pending the control is disabled; on error the screen stays and shows the error.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "actions": [
  {
   "dest": null,
   "node": 95,
   "type": "back"
  },
  {
   "dest": "scr-4-all-set",
   "node": 125,
   "type": "navigate"
  },
  {
   "dest": "scr-4-all-set",
   "node": 127,
   "type": "navigate"
  }
 ],
 "components": [],
 "copy": [
  {
   "node": 91,
   "text": "9:41"
  },
  {
   "node": 122,
   "text": "Trails near you"
  },
  {
   "node": 123,
   "text": "Allow location to see conditions, closures and the closest trailheads. You can change this any time."
  },
  {
   "node": 126,
   "text": "Allow location"
  },
  {
   "node": 128,
   "text": "Not now"
  }
 ],
 "fingerprint": "3a661accb522",
 "inputs": [],
 "instances": [],
 "key": "scr-3-location",
 "kind": "front-screen",
 "links": [
  {
   "node": 125,
   "op": "op-allow-location-125",
   "rel": "triggers"
  }
 ],
 "node": 89,
 "operations": [
  "op-allow-location-125"
 ],
 "size": [
  393,
  852
 ],
 "sourceHash": "046006b98ea38890"
}
-->
