# Screen: Dashboard — Dark

| | |
|---|---|
| Node | `#71` |
| Page | App |
| Frame | 1440 × 900 px |
| Dev status | not marked |
| Fingerprint | `9b171528c819` |
| Prototype | [prototype/index.html#scr-dashboard-dark](../../prototype/index.html#scr-dashboard-dark) |

## Purpose

Dashboard — Dark is reached from outside the prototyped flows. It shows 40 text layers, 3 component instances and 0 interactions.

## Layout

Hierarchy, sizes and auto layout exactly as designed (px). Instances are specified in their component spec.

- `#71` **Dashboard — Dark** — frame · 1440×900
  - `#72` **Sidebar** — frame · 248×900
    - `#73` **Brand** — text · 200×27 · size fixed×hug — “WeshCraft”
    - `#74` **Brand sub** — text · 200×15 · size fixed×hug — “console”
    - `#75` **Nav Overview** — text · 200×18 · size fixed×hug — “Overview”
    - `#76` **Nav marker** — rectangle · 3×22 · radius 2
    - `#77` **Nav Specs** — text · 200×18 · size fixed×hug — “Specs”
    - `#78` **Nav Links** — text · 200×18 · size fixed×hug — “Links”
    - `#79` **Nav Prototype** — text · 200×18 · size fixed×hug — “Prototype”
    - `#80` **Nav Publish** — text · 200×18 · size fixed×hug — “Publish”
    - `#81` **Instance** — text · 200×15 · size fixed×hug — “live · 192.168.3.159”
  - `#82` **Main** — frame · 1192×900
    - `#83` **Top bar** — frame · 1192×76
      - `#84` **Title** — text · 420×29 · size fixed×hug — “WeshCraft console”
      - `#85` **Subtitle** — text · 420×17 · size fixed×hug — “design → prototype → contract-checked specs”
      - `#86` **Search jobs** — frame · 300×36 · radius 10
        - `#87` **Placeholder** — text · 260×17 · size fixed×hug — “Search specs…”
      - `#88` **Publish specs** — frame · 140×36 · radius 10
        - `#89` **Label** — text · 108×18 · size fixed×hug — “Publish”
    - `#90` **KPI Parity** — frame · 252×108 · radius 14
      - `#91` **Label Parity** — text · 200×15 · size fixed×hug — “Parity”
      - `#92` **Value Parity** — text · 210×39 · size fixed×hug — “{{parity.score}}”
    - `#93` **KPI Checks** — frame · 252×108 · radius 14
      - `#94` **Label Checks** — text · 200×15 · size fixed×hug — “Checks”
      - `#95` **Value Checks** — text · 210×39 · size fixed×hug — “{{parity.checks}}”
    - `#96` **KPI Errors** — frame · 252×108 · radius 14
      - `#97` **Label Errors** — text · 200×15 · size fixed×hug — “Errors”
      - `#98` **Value Errors** — text · 210×39 · size fixed×hug — “{{parity.errors}}”
    - `#99` **KPI Screens** — frame · 252×108 · radius 14
      - `#100` **Label Screens** — text · 200×15 · size fixed×hug — “Screens”
      - `#101` **Value Screens** — text · 210×39 · size fixed×hug — “{{parity.screens}}”
    - `#102` **Spec jobs** — frame · 720×400 · radius 14
      - `#103` **Heading** — text · 300×20 · size fixed×hug — “Spec jobs”
      - `#104` **Job row 1** — instance · 680×52 · size fixed×hug → instance of Job row
      - `#108` **Job row 2** — instance · 680×52 · size fixed×hug → instance of Job row
      - `#112` **Job row 3** — instance · 680×52 · size fixed×hug → instance of Job row
    - `#116` **Front ⇄ back** — frame · 384×240 · radius 14
      - `#117` **Heading** — text · 300×20 · size fixed×hug — “Front ⇄ back”
      - `#118` **Chip** — rectangle · 74×24 · radius 8
      - `#119` **Relation 0** — text · 70×15 · size fixed×hug — “lists”
      - `#120` **@link.rel** — text · 260×17 · size fixed×hug — “{{link.rel}} · {{link.target}}”
      - `#121` **Chip** — rectangle · 74×24 · radius 8
      - `#122` **Relation 1** — text · 70×15 · size fixed×hug — “displays”
      - `#123` **@link.rel** — text · 260×17 · size fixed×hug — “{{link.rel}} · {{link.target}}”
      - `#124` **Chip** — rectangle · 74×24 · radius 8
      - `#125` **Relation 2** — text · 70×15 · size fixed×hug — “triggers”
      - `#126` **@link.rel** — text · 260×17 · size fixed×hug — “{{link.rel}} · {{link.target}}”
    - `#127` **Live feed** — frame · 384×336 · radius 14
      - `#128` **Heading** — text · 300×20 · size fixed×hug — “Live feed”
      - `#129` **Event 0** — text · 340×17 · size fixed×hug — “{{event.message}}”
      - `#130` **Event 1** — text · 340×17 · size fixed×hug — “{{event.message}}”

Root frame CSS (generated from the prototype):

```css
.scr-dashboard-dark {
  width: 1440px;
  height: 900px;
  background: #0b0d14;
  position: relative;
}
```

## Copy

Shown verbatim. Typography and colour per layer; contrast is WCAG 2.1 against the nearest filled ancestor.

| Node | Layer | Text | Typography | Colour | Contrast |
|---|---|---|---|---|---|
| `#73` | Brand | WeshCraft | Inter Bold 19px / 140% | #e8ecf8 on #141824 | 15:1 ✅ |
| `#74` | Brand sub | console | Inter Regular 11px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#75` | Nav Overview | Overview | Inter SemiBold 13px / 140% | #8b5cf6 on #141824 | 4.18:1 ⚠️ below 4.5:1 |
| `#77` | Nav Specs | Specs | Inter Regular 13px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#78` | Nav Links | Links | Inter Regular 13px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#79` | Nav Prototype | Prototype | Inter Regular 13px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#80` | Nav Publish | Publish | Inter Regular 13px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#81` | Instance | live · 192.168.3.159 | Inter Regular 11px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#84` | Title | WeshCraft console | Inter Bold 21px / 140% | #e8ecf8 on #0b0d14 | 16.44:1 ✅ |
| `#85` | Subtitle | design → prototype → contract-checked specs | Inter Regular 12px / 140% | #8a93ad on #0b0d14 | 6.34:1 ✅ |
| `#87` | Placeholder | Search specs… | Inter Regular 12px / 140% | #8a93ad on #1b2030 | 5.29:1 ✅ |
| `#89` | Label | Publish | Inter SemiBold 13px / 140% | #ffffff on #8b5cf6 | 4.23:1 ⚠️ below 4.5:1 |
| `#91` | Label Parity | Parity | Inter Medium 11px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#92` | Value Parity | {{parity.score}} | Inter Bold 28px / 140% | #34d399 on #141824 | 9.21:1 ✅ |
| `#94` | Label Checks | Checks | Inter Medium 11px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#95` | Value Checks | {{parity.checks}} | Inter Bold 28px / 140% | #e8ecf8 on #141824 | 15:1 ✅ |
| `#97` | Label Errors | Errors | Inter Medium 11px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#98` | Value Errors | {{parity.errors}} | Inter Bold 28px / 140% | #fb7185 on #141824 | 6.58:1 ✅ |
| `#100` | Label Screens | Screens | Inter Medium 11px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#101` | Value Screens | {{parity.screens}} | Inter Bold 28px / 140% | #e8ecf8 on #141824 | 15:1 ✅ |
| `#103` | Heading | Spec jobs | Inter SemiBold 14px / 140% | #e8ecf8 on #141824 | 15:1 ✅ |
| `#105` | File | specs/front/screens/scr-home-light.md | Inter Medium 13px / 140% | #e8ecf8 on #141824 | 15:1 ✅ |
| `#106` | Status | done | Inter SemiBold 12px / 140% | #34d399 on #141824 | 9.21:1 ✅ |
| `#107` | Updated | 2 min ago | Inter Regular 11px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#109` | File | specs/front/screens/scr-trail-light.md | Inter Medium 13px / 140% | #e8ecf8 on #141824 | 15:1 ✅ |
| `#110` | Status | done | Inter SemiBold 12px / 140% | #34d399 on #141824 | 9.21:1 ✅ |
| `#111` | Updated | 3 min ago | Inter Regular 11px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#113` | File | specs/back/api.md | Inter Medium 13px / 140% | #e8ecf8 on #141824 | 15:1 ✅ |
| `#114` | Status | changed | Inter SemiBold 12px / 140% | #fbbf24 on #141824 | 10.61:1 ✅ |
| `#115` | Updated | 5 min ago | Inter Regular 11px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#117` | Heading | Front ⇄ back | Inter SemiBold 14px / 140% | #e8ecf8 on #141824 | 15:1 ✅ |
| `#119` | Relation 0 | lists | Inter SemiBold 11px / 140% | #8b5cf6 on #141824 | 4.18:1 ⚠️ below 4.5:1 |
| `#120` | @link.rel | {{link.rel}} · {{link.target}} | Inter Regular 12px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#122` | Relation 1 | displays | Inter SemiBold 11px / 140% | #8b5cf6 on #141824 | 4.18:1 ⚠️ below 4.5:1 |
| `#123` | @link.rel | {{link.rel}} · {{link.target}} | Inter Regular 12px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#125` | Relation 2 | triggers | Inter SemiBold 11px / 140% | #8b5cf6 on #141824 | 4.18:1 ⚠️ below 4.5:1 |
| `#126` | @link.rel | {{link.rel}} · {{link.target}} | Inter Regular 12px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#128` | Heading | Live feed | Inter SemiBold 14px / 140% | #e8ecf8 on #141824 | 15:1 ✅ |
| `#129` | Event 0 | {{event.message}} | Inter Regular 12px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |
| `#130` | Event 1 | {{event.message}} | Inter Regular 12px / 140% | #8a93ad on #141824 | 5.78:1 ✅ |

## Components

| Node | Instance | Component | Props |
|---|---|---|---|
| `#104` | Job row 1 | [Job row](../components/cmp-job-row.md) | {"File":"specs/front/screens/scr-home-light.md","Status":"done","Updated":"2 min ago"} |
| `#108` | Job row 2 | [Job row](../components/cmp-job-row.md) | {"File":"specs/front/screens/scr-trail-light.md","Status":"done","Updated":"3 min ago"} |
| `#112` | Job row 3 | [Job row](../components/cmp-job-row.md) | {"File":"specs/back/api.md","Status":"changed","Updated":"5 min ago"} |

## Interactions

No prototype interactions on this screen.

## Inputs

| Node | Field | Kind | Placeholder / default | Validation |
|---|---|---|---|---|
| `#86` | Search jobs | search | Search specs… | confirm with product |

## Front ⇄ back links

Where this screen meets the back end (full map: [LINKS.md](../../LINKS.md)). ▶ triggers · ⇢ submits · ☰ filled by · ◉ shows.

| Layer | Element | Link | Back end | |
|---|---|---|---|---|
| `#104` | Job row 1 | ☰ filled by | [`GET /jobs`](../../back/api.md#op-list-job-scr-dashboard-dark) | returns `Job[]` |
| `#108` | Job row 2 | ☰ filled by | [`GET /jobs`](../../back/api.md#op-list-job-scr-dashboard-dark) | returns `Job[]` |
| `#112` | Job row 3 | ☰ filled by | [`GET /jobs`](../../back/api.md#op-list-job-scr-dashboard-dark) | returns `Job[]` |
| `#88` | Publish | ▶ triggers | [`POST /specs/publish`](../../back/api.md#op-post-specs-publish-88) | returns `Spec` |
| `#86` | Search jobs | ⇢ submits to | [`POST /specs/publish`](../../back/api.md#op-post-specs-publish-88) | returns `Spec` |
| `#90` | Parity | ▶ triggers | [`GET /parity`](../../back/api.md#op-get-parity-90) | returns `Parity` |
| `#116` | Front ⇄ back | ▶ triggers | [`GET /links`](../../back/api.md#op-get-links-116) | returns `Link` |
| `#127` | Live feed | ▶ triggers | [`GET /events`](../../back/api.md#op-get-events-127) | returns `Event` |
| `#129` | {{event.message}} | ◉ shows | [`Event.message`](../../back/domain.md#entity-event) | loaded by [`GET /events`](../../back/api.md#op-get-events-127) |
| `#130` | {{event.message}} | ◉ shows | [`Event.message`](../../back/domain.md#entity-event) | loaded by [`GET /events`](../../back/api.md#op-get-events-127) |
| `#105` | specs/front/screens/scr-home-light.md | ◉ shows | [`Job.file`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-71) |
| `#109` | specs/front/screens/scr-trail-light.md | ◉ shows | [`Job.file`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-71) |
| `#113` | specs/back/api.md | ◉ shows | [`Job.file`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-71) |
| `#106` | done | ◉ shows | [`Job.status`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-71) |
| `#110` | done | ◉ shows | [`Job.status`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-71) |
| `#114` | changed | ◉ shows | [`Job.status`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-71) |
| `#107` | 2 min ago | ◉ shows | [`Job.updated`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-71) |
| `#111` | 3 min ago | ◉ shows | [`Job.updated`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-71) |
| `#115` | 5 min ago | ◉ shows | [`Job.updated`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-71) |
| `#120` | {{link.rel}} · {{link.target}} | ◉ shows | [`Link.rel`](../../back/domain.md#entity-link) | loaded by [`GET /links`](../../back/api.md#op-get-links-116) |
| `#123` | {{link.rel}} · {{link.target}} | ◉ shows | [`Link.rel`](../../back/domain.md#entity-link) | loaded by [`GET /links`](../../back/api.md#op-get-links-116) |
| `#126` | {{link.rel}} · {{link.target}} | ◉ shows | [`Link.rel`](../../back/domain.md#entity-link) | loaded by [`GET /links`](../../back/api.md#op-get-links-116) |
| `#92` | {{parity.score}} | ◉ shows | [`Parity.score`](../../back/domain.md#entity-parity) | loaded by [`GET /parity`](../../back/api.md#op-get-parity-90) |
| `#95` | {{parity.checks}} | ◉ shows | [`Parity.checks`](../../back/domain.md#entity-parity) | loaded by [`GET /parity`](../../back/api.md#op-get-parity-90) |
| `#98` | {{parity.errors}} | ◉ shows | [`Parity.errors`](../../back/domain.md#entity-parity) | loaded by [`GET /parity`](../../back/api.md#op-get-parity-90) |
| `#101` | {{parity.screens}} | ◉ shows | [`Parity.screens`](../../back/domain.md#entity-parity) | loaded by [`GET /parity`](../../back/api.md#op-get-parity-90) |

## Design tokens used

None bound; raw colours: #0b0d14, #141824, #1b2030, #241e3c, #34d399, #8a93ad, #8b5cf6, #e8ecf8, #fb7185, #fbbf24, #ffffff

## Designer annotations

- `#71` Dashboard — Dark (development): GET /jobs → Job
- `#88` Publish specs (development): POST /specs/publish → Spec
- `#90` KPI Parity (development): GET /parity → Parity
- `#116` Front ⇄ back (development): GET /links → Link
- `#127` Live feed (development): GET /events → Event

## Acceptance criteria

1. Renders at 1440 × 900 px with the hierarchy, spacing and sizes in §Layout; a pixel comparison with the prototype render shows no difference above the project tolerance.
2. Every text in §Copy is shown verbatim with its typography and colour.
3. Activating `#88` calls `POST /specs/publish`; while pending the control is disabled; on error the screen stays and shows the error.
4. Activating `#90` calls `GET /parity`; while pending the control is disabled; on error the screen stays and shows the error.
5. Activating `#116` calls `GET /links`; while pending the control is disabled; on error the screen stays and shows the error.
6. Activating `#127` calls `GET /events`; while pending the control is disabled; on error the screen stays and shows the error.
7. The list built from `#104`, `#108`, `#112` is filled from `GET /jobs`, with loading and empty states.
8. Contrast: `#75`, `#89`, `#119`, `#122`, `#125` are below WCAG AA in the design; keep as designed or fix in FigCraft first (the spec follows the prototype).

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "actions": [],
 "components": [
  "cmp-job-row"
 ],
 "copy": [
  {
   "node": 73,
   "text": "WeshCraft"
  },
  {
   "node": 74,
   "text": "console"
  },
  {
   "node": 75,
   "text": "Overview"
  },
  {
   "node": 77,
   "text": "Specs"
  },
  {
   "node": 78,
   "text": "Links"
  },
  {
   "node": 79,
   "text": "Prototype"
  },
  {
   "node": 80,
   "text": "Publish"
  },
  {
   "node": 81,
   "text": "live · 192.168.3.159"
  },
  {
   "node": 84,
   "text": "WeshCraft console"
  },
  {
   "node": 85,
   "text": "design → prototype → contract-checked specs"
  },
  {
   "node": 87,
   "text": "Search specs…"
  },
  {
   "node": 89,
   "text": "Publish"
  },
  {
   "node": 91,
   "text": "Parity"
  },
  {
   "node": 92,
   "text": "{{parity.score}}"
  },
  {
   "node": 94,
   "text": "Checks"
  },
  {
   "node": 95,
   "text": "{{parity.checks}}"
  },
  {
   "node": 97,
   "text": "Errors"
  },
  {
   "node": 98,
   "text": "{{parity.errors}}"
  },
  {
   "node": 100,
   "text": "Screens"
  },
  {
   "node": 101,
   "text": "{{parity.screens}}"
  },
  {
   "node": 103,
   "text": "Spec jobs"
  },
  {
   "node": 105,
   "text": "specs/front/screens/scr-home-light.md"
  },
  {
   "node": 106,
   "text": "done"
  },
  {
   "node": 107,
   "text": "2 min ago"
  },
  {
   "node": 109,
   "text": "specs/front/screens/scr-trail-light.md"
  },
  {
   "node": 110,
   "text": "done"
  },
  {
   "node": 111,
   "text": "3 min ago"
  },
  {
   "node": 113,
   "text": "specs/back/api.md"
  },
  {
   "node": 114,
   "text": "changed"
  },
  {
   "node": 115,
   "text": "5 min ago"
  },
  {
   "node": 117,
   "text": "Front ⇄ back"
  },
  {
   "node": 119,
   "text": "lists"
  },
  {
   "node": 120,
   "text": "{{link.rel}} · {{link.target}}"
  },
  {
   "node": 122,
   "text": "displays"
  },
  {
   "node": 123,
   "text": "{{link.rel}} · {{link.target}}"
  },
  {
   "node": 125,
   "text": "triggers"
  },
  {
   "node": 126,
   "text": "{{link.rel}} · {{link.target}}"
  },
  {
   "node": 128,
   "text": "Live feed"
  },
  {
   "node": 129,
   "text": "{{event.message}}"
  },
  {
   "node": 130,
   "text": "{{event.message}}"
  }
 ],
 "fingerprint": "9b171528c819",
 "inputs": [
  86
 ],
 "instances": [
  {
   "component": 2,
   "node": 104
  },
  {
   "component": 2,
   "node": 108
  },
  {
   "component": 2,
   "node": 112
  }
 ],
 "key": "scr-dashboard-dark",
 "kind": "front-screen",
 "links": [
  {
   "node": 104,
   "op": "op-list-job-scr-dashboard-dark",
   "rel": "lists"
  },
  {
   "node": 108,
   "op": "op-list-job-scr-dashboard-dark",
   "rel": "lists"
  },
  {
   "node": 112,
   "op": "op-list-job-scr-dashboard-dark",
   "rel": "lists"
  },
  {
   "node": 88,
   "op": "op-post-specs-publish-88",
   "rel": "triggers"
  },
  {
   "node": 86,
   "op": "op-post-specs-publish-88",
   "rel": "submits"
  },
  {
   "node": 90,
   "op": "op-get-parity-90",
   "rel": "triggers"
  },
  {
   "node": 116,
   "op": "op-get-links-116",
   "rel": "triggers"
  },
  {
   "node": 127,
   "op": "op-get-events-127",
   "rel": "triggers"
  },
  {
   "field": "Event.message",
   "node": 129,
   "rel": "displays"
  },
  {
   "field": "Event.message",
   "node": 130,
   "rel": "displays"
  },
  {
   "field": "Job.file",
   "node": 105,
   "rel": "displays"
  },
  {
   "field": "Job.file",
   "node": 109,
   "rel": "displays"
  },
  {
   "field": "Job.file",
   "node": 113,
   "rel": "displays"
  },
  {
   "field": "Job.status",
   "node": 106,
   "rel": "displays"
  },
  {
   "field": "Job.status",
   "node": 110,
   "rel": "displays"
  },
  {
   "field": "Job.status",
   "node": 114,
   "rel": "displays"
  },
  {
   "field": "Job.updated",
   "node": 107,
   "rel": "displays"
  },
  {
   "field": "Job.updated",
   "node": 111,
   "rel": "displays"
  },
  {
   "field": "Job.updated",
   "node": 115,
   "rel": "displays"
  },
  {
   "field": "Link.rel",
   "node": 120,
   "rel": "displays"
  },
  {
   "field": "Link.rel",
   "node": 123,
   "rel": "displays"
  },
  {
   "field": "Link.rel",
   "node": 126,
   "rel": "displays"
  },
  {
   "field": "Parity.score",
   "node": 92,
   "rel": "displays"
  },
  {
   "field": "Parity.checks",
   "node": 95,
   "rel": "displays"
  },
  {
   "field": "Parity.errors",
   "node": 98,
   "rel": "displays"
  },
  {
   "field": "Parity.screens",
   "node": 101,
   "rel": "displays"
  }
 ],
 "node": 71,
 "operations": [
  "op-list-job-scr-dashboard-dark",
  "op-get-jobs-71",
  "op-post-specs-publish-88",
  "op-get-parity-90",
  "op-get-links-116",
  "op-get-events-127"
 ],
 "size": [
  1440,
  900
 ],
 "sourceHash": "d5a504f901758656"
}
-->
