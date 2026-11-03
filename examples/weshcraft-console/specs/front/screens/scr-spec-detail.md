# Screen: Spec detail

| | |
|---|---|
| Node | `#131` |
| Page | App |
| Frame | 1440 × 900 px |
| Dev status | not marked |
| Fingerprint | `1110a0b804bd` |
| Prototype | [prototype/index.html#scr-spec-detail](../../prototype/index.html#scr-spec-detail) |

## Purpose

Spec detail is reached from outside the prototyped flows. It shows 21 text layers, 0 component instances and 1 interactions.

## Layout

Hierarchy, sizes and auto layout exactly as designed (px). Instances are specified in their component spec.

- `#131` **Spec detail** — frame · 1440×900
  - `#132` **Top bar** — frame · 1440×76
    - `#133` **Back to specs** — text · 160×18 · size fixed×hug — “← Specs”
    - `#134` **Title** — text · 520×29 · size fixed×hug — “{{spec.title}}”
    - `#135` **File** — text · 520×17 · size fixed×hug — “{{spec.file}}”
    - `#136` **Status badge** — frame · 140×36 · radius 10
      - `#137` **Label** — text · 108×18 · size fixed×hug — “{{spec.status}}”
  - `#138` **Spec body** — frame · 856×700 · radius 14
    - `#139` **Heading** — text · 700×24 · size fixed×hug — “{{spec.heading}}”
    - `#140` **Paragraph 0** — text · 780×18 · size fixed×hug — “Purpose”
    - `#141` **Paragraph 1** — text · 780×17 · size fixed×hug — “The screen shows every text layer, component instance and in”…
    - `#142` **Paragraph 2** — text · 780×17 · size fixed×hug — “The screen shows every text layer, component instance and in”…
    - `#143` **Paragraph 3** — text · 780×17 · size fixed×hug — “The screen shows every text layer, component instance and in”…
    - `#144` **Paragraph 4** — text · 780×18 · size fixed×hug — “Acceptance criteria”
  - `#145` **Contract** — frame · 492×700 · radius 14
    - `#146` **Heading** — text · 300×20 · size fixed×hug — “Contract”
    - `#147` **Key 0** — text · 140×17 · size fixed×hug — “Fingerprint”
    - `#148` **Value 0** — text · 280×17 · size fixed×hug — “{{spec.fingerprint}}”
    - `#149` **Key 1** — text · 140×17 · size fixed×hug — “Checks”
    - `#150` **Value 1** — text · 280×17 · size fixed×hug — “{{spec.checks}}”
    - `#151` **Key 2** — text · 140×17 · size fixed×hug — “Errors”
    - `#152` **Value 2** — text · 280×17 · size fixed×hug — “{{spec.errors}}”
    - `#153` **Key 3** — text · 140×17 · size fixed×hug — “Layer”
    - `#154` **Value 3** — text · 280×17 · size fixed×hug — “{{spec.layer}}”
    - `#155` **Key 4** — text · 140×17 · size fixed×hug — “Owner”
    - `#156` **Value 4** — text · 280×17 · size fixed×hug — “{{spec.owner}}”

Root frame CSS (generated from the prototype):

```css
.scr-spec-detail {
  width: 1440px;
  height: 900px;
  background: #ffffff;
  position: relative;
}
```

## Copy

Shown verbatim. Typography and colour per layer; contrast is WCAG 2.1 against the nearest filled ancestor.

| Node | Layer | Text | Typography | Colour | Contrast |
|---|---|---|---|---|---|
| `#133` | Back to specs | ← Specs | Inter Medium 13px / 140% | #6d5ef8 on #ffffff | 4.56:1 ✅ |
| `#134` | Title | {{spec.title}} | Inter Bold 21px / 140% | #0f172a on #ffffff | 17.85:1 ✅ |
| `#135` | File | {{spec.file}} | Inter Regular 12px / 140% | #64748b on #ffffff | 4.76:1 ✅ |
| `#137` | Label | {{spec.status}} | Inter SemiBold 13px / 140% | #6d5ef8 on #ede9fe | 3.84:1 ⚠️ below 4.5:1 |
| `#139` | Heading | {{spec.heading}} | Inter SemiBold 17px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#140` | Paragraph 0 | Purpose | Inter SemiBold 13px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#141` | Paragraph 1 | The screen shows every text layer, component instance and interaction exactly as designed. | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#142` | Paragraph 2 | The screen shows every text layer, component instance and interaction exactly as designed. | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#143` | Paragraph 3 | The screen shows every text layer, component instance and interaction exactly as designed. | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#144` | Paragraph 4 | Acceptance criteria | Inter SemiBold 13px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#146` | Heading | Contract | Inter SemiBold 14px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#147` | Key 0 | Fingerprint | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#148` | Value 0 | {{spec.fingerprint}} | Inter Medium 12px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#149` | Key 1 | Checks | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#150` | Value 1 | {{spec.checks}} | Inter Medium 12px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#151` | Key 2 | Errors | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#152` | Value 2 | {{spec.errors}} | Inter Medium 12px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#153` | Key 3 | Layer | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#154` | Value 3 | {{spec.layer}} | Inter Medium 12px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#155` | Key 4 | Owner | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#156` | Value 4 | {{spec.owner}} | Inter Medium 12px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |

## Components

No component instances.

## Interactions

| Node | Element | Trigger | Action | Destination | Transition |
|---|---|---|---|---|---|
| `#133` | ← Specs | onClick | navigate | [Dashboard — Light](scr-dashboard-light.md) | instant |

## Inputs

No input fields detected.

## Front ⇄ back links

Where this screen meets the back end (full map: [LINKS.md](../../LINKS.md)). ▶ triggers · ⇢ submits · ☰ filled by · ◉ shows.

| Layer | Element | Link | Back end | |
|---|---|---|---|---|
| `#134` | {{spec.title}} | ◉ shows | [`Spec.title`](../../back/domain.md#entity-spec) | loaded by [`GET /specs/{id}`](../../back/api.md#op-get-specs-id-131) |
| `#135` | {{spec.file}} | ◉ shows | [`Spec.file`](../../back/domain.md#entity-spec) | loaded by [`GET /specs/{id}`](../../back/api.md#op-get-specs-id-131) |
| `#137` | {{spec.status}} | ◉ shows | [`Spec.status`](../../back/domain.md#entity-spec) | loaded by [`GET /specs/{id}`](../../back/api.md#op-get-specs-id-131) |
| `#139` | {{spec.heading}} | ◉ shows | [`Spec.heading`](../../back/domain.md#entity-spec) | loaded by [`GET /specs/{id}`](../../back/api.md#op-get-specs-id-131) |
| `#148` | {{spec.fingerprint}} | ◉ shows | [`Spec.fingerprint`](../../back/domain.md#entity-spec) | loaded by [`GET /specs/{id}`](../../back/api.md#op-get-specs-id-131) |
| `#150` | {{spec.checks}} | ◉ shows | [`Spec.checks`](../../back/domain.md#entity-spec) | loaded by [`GET /specs/{id}`](../../back/api.md#op-get-specs-id-131) |
| `#152` | {{spec.errors}} | ◉ shows | [`Spec.errors`](../../back/domain.md#entity-spec) | loaded by [`GET /specs/{id}`](../../back/api.md#op-get-specs-id-131) |
| `#154` | {{spec.layer}} | ◉ shows | [`Spec.layer`](../../back/domain.md#entity-spec) | loaded by [`GET /specs/{id}`](../../back/api.md#op-get-specs-id-131) |
| `#156` | {{spec.owner}} | ◉ shows | [`Spec.owner`](../../back/domain.md#entity-spec) | loaded by [`GET /specs/{id}`](../../back/api.md#op-get-specs-id-131) |

## Design tokens used

None bound; raw colours: #0f172a, #64748b, #6d5ef8, #ede9fe, #f7f8fc, #ffffff

## Designer annotations

- `#131` Spec detail (development): GET /specs/{id} → Spec

## Acceptance criteria

1. Renders at 1440 × 900 px with the hierarchy, spacing and sizes in §Layout; a pixel comparison with the prototype render shows no difference above the project tolerance.
2. Every text in §Copy is shown verbatim with its typography and colour.
3. Activating “← Specs” (`#133`) navigates to Dashboard — Light; it is reachable by keyboard and announced as a button.
4. Contrast: `#137`, `#141`, `#142`, `#143`, `#147`, `#149`, `#151`, `#153`, `#155` are below WCAG AA in the design; keep as designed or fix in FigCraft first (the spec follows the prototype).

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "actions": [
  {
   "dest": "scr-dashboard-light",
   "node": 133,
   "type": "navigate"
  }
 ],
 "components": [],
 "copy": [
  {
   "node": 133,
   "text": "← Specs"
  },
  {
   "node": 134,
   "text": "{{spec.title}}"
  },
  {
   "node": 135,
   "text": "{{spec.file}}"
  },
  {
   "node": 137,
   "text": "{{spec.status}}"
  },
  {
   "node": 139,
   "text": "{{spec.heading}}"
  },
  {
   "node": 140,
   "text": "Purpose"
  },
  {
   "node": 141,
   "text": "The screen shows every text layer, component instance and interaction exactly as designed."
  },
  {
   "node": 142,
   "text": "The screen shows every text layer, component instance and interaction exactly as designed."
  },
  {
   "node": 143,
   "text": "The screen shows every text layer, component instance and interaction exactly as designed."
  },
  {
   "node": 144,
   "text": "Acceptance criteria"
  },
  {
   "node": 146,
   "text": "Contract"
  },
  {
   "node": 147,
   "text": "Fingerprint"
  },
  {
   "node": 148,
   "text": "{{spec.fingerprint}}"
  },
  {
   "node": 149,
   "text": "Checks"
  },
  {
   "node": 150,
   "text": "{{spec.checks}}"
  },
  {
   "node": 151,
   "text": "Errors"
  },
  {
   "node": 152,
   "text": "{{spec.errors}}"
  },
  {
   "node": 153,
   "text": "Layer"
  },
  {
   "node": 154,
   "text": "{{spec.layer}}"
  },
  {
   "node": 155,
   "text": "Owner"
  },
  {
   "node": 156,
   "text": "{{spec.owner}}"
  }
 ],
 "fingerprint": "1110a0b804bd",
 "inputs": [],
 "instances": [],
 "key": "scr-spec-detail",
 "kind": "front-screen",
 "links": [
  {
   "field": "Spec.title",
   "node": 134,
   "rel": "displays"
  },
  {
   "field": "Spec.file",
   "node": 135,
   "rel": "displays"
  },
  {
   "field": "Spec.status",
   "node": 137,
   "rel": "displays"
  },
  {
   "field": "Spec.heading",
   "node": 139,
   "rel": "displays"
  },
  {
   "field": "Spec.fingerprint",
   "node": 148,
   "rel": "displays"
  },
  {
   "field": "Spec.checks",
   "node": 150,
   "rel": "displays"
  },
  {
   "field": "Spec.errors",
   "node": 152,
   "rel": "displays"
  },
  {
   "field": "Spec.layer",
   "node": 154,
   "rel": "displays"
  },
  {
   "field": "Spec.owner",
   "node": 156,
   "rel": "displays"
  }
 ],
 "node": 131,
 "operations": [
  "op-get-specs-id-131"
 ],
 "size": [
  1440,
  900
 ],
 "sourceHash": "d5a504f901758656"
}
-->
