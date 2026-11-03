# Screen: Dashboard — Light

| | |
|---|---|
| Node | `#6` |
| Page | App |
| Frame | 1440 × 900 px |
| Dev status | not marked |
| Fingerprint | `a44925671d07` |
| Prototype | [prototype/index.html#scr-dashboard-light](../../prototype/index.html#scr-dashboard-light) |

## Purpose

Dashboard — Light is reached from “← Specs” on Spec detail. It shows 44 text layers, 4 component instances and 0 interactions.

## Layout

Hierarchy, sizes and auto layout exactly as designed (px). Instances are specified in their component spec.

- `#6` **Dashboard — Light** — frame · 1440×900
  - `#7` **Sidebar** — frame · 248×900
    - `#8` **Brand** — text · 200×27 · size fixed×hug — “WeshCraft”
    - `#9` **Brand sub** — text · 200×15 · size fixed×hug — “console”
    - `#10` **Nav Overview** — text · 200×18 · size fixed×hug — “Overview”
    - `#11` **Nav marker** — rectangle · 3×22 · radius 2
    - `#12` **Nav Specs** — text · 200×18 · size fixed×hug — “Specs”
    - `#13` **Nav Links** — text · 200×18 · size fixed×hug — “Links”
    - `#14` **Nav Prototype** — text · 200×18 · size fixed×hug — “Prototype”
    - `#15` **Nav Publish** — text · 200×18 · size fixed×hug — “Publish”
    - `#16` **Instance** — text · 200×15 · size fixed×hug — “live · 192.168.3.159”
  - `#17` **Main** — frame · 1192×900
    - `#18` **Top bar** — frame · 1192×76
      - `#19` **Title** — text · 420×29 · size fixed×hug — “WeshCraft console”
      - `#20` **Subtitle** — text · 420×17 · size fixed×hug — “design → prototype → contract-checked specs”
      - `#21` **Search jobs** — frame · 300×36 · radius 10
        - `#22` **Placeholder** — text · 260×17 · size fixed×hug — “Search specs…”
      - `#23` **Publish specs** — frame · 140×36 · radius 10
        - `#24` **Label** — text · 108×18 · size fixed×hug — “Publish”
    - `#25` **KPI Parity** — frame · 252×108 · radius 14
      - `#26` **Label Parity** — text · 200×15 · size fixed×hug — “Parity”
      - `#27` **Value Parity** — text · 210×39 · size fixed×hug — “{{parity.score}}”
    - `#28` **KPI Checks** — frame · 252×108 · radius 14
      - `#29` **Label Checks** — text · 200×15 · size fixed×hug — “Checks”
      - `#30` **Value Checks** — text · 210×39 · size fixed×hug — “{{parity.checks}}”
    - `#31` **KPI Errors** — frame · 252×108 · radius 14
      - `#32` **Label Errors** — text · 200×15 · size fixed×hug — “Errors”
      - `#33` **Value Errors** — text · 210×39 · size fixed×hug — “{{parity.errors}}”
    - `#34` **KPI Screens** — frame · 252×108 · radius 14
      - `#35` **Label Screens** — text · 200×15 · size fixed×hug — “Screens”
      - `#36` **Value Screens** — text · 210×39 · size fixed×hug — “{{parity.screens}}”
    - `#37` **Spec jobs** — frame · 720×400 · radius 14
      - `#38` **Heading** — text · 300×20 · size fixed×hug — “Spec jobs”
      - `#39` **Job row 1** — instance · 680×52 · size fixed×hug → instance of Job row
      - `#43` **Job row 2** — instance · 680×52 · size fixed×hug → instance of Job row
      - `#47` **Job row 3** — instance · 680×52 · size fixed×hug → instance of Job row
      - `#51` **Job row 4** — instance · 680×52 · size fixed×hug → instance of Job row
    - `#55` **Front ⇄ back** — frame · 384×240 · radius 14
      - `#56` **Heading** — text · 300×20 · size fixed×hug — “Front ⇄ back”
      - `#57` **Chip** — rectangle · 74×24 · radius 8
      - `#58` **Relation 0** — text · 70×15 · size fixed×hug — “lists”
      - `#59` **@link.rel** — text · 260×17 · size fixed×hug — “{{link.rel}} · {{link.target}}”
      - `#60` **Chip** — rectangle · 74×24 · radius 8
      - `#61` **Relation 1** — text · 70×15 · size fixed×hug — “displays”
      - `#62` **@link.rel** — text · 260×17 · size fixed×hug — “{{link.rel}} · {{link.target}}”
      - `#63` **Chip** — rectangle · 74×24 · radius 8
      - `#64` **Relation 2** — text · 70×15 · size fixed×hug — “triggers”
      - `#65` **@link.rel** — text · 260×17 · size fixed×hug — “{{link.rel}} · {{link.target}}”
    - `#66` **Live feed** — frame · 384×336 · radius 14
      - `#67` **Heading** — text · 300×20 · size fixed×hug — “Live feed”
      - `#68` **Event 0** — text · 340×17 · size fixed×hug — “{{event.message}}”
      - `#69` **Event 1** — text · 340×17 · size fixed×hug — “{{event.message}}”
      - `#70` **Event 2** — text · 340×17 · size fixed×hug — “{{event.message}}”

Root frame CSS (generated from the prototype):

```css
.scr-dashboard-light {
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
| `#8` | Brand | WeshCraft | Inter Bold 19px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#9` | Brand sub | console | Inter Regular 11px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#10` | Nav Overview | Overview | Inter SemiBold 13px / 140% | #6d5ef8 on #f7f8fc | 4.3:1 ⚠️ below 4.5:1 |
| `#12` | Nav Specs | Specs | Inter Regular 13px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#13` | Nav Links | Links | Inter Regular 13px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#14` | Nav Prototype | Prototype | Inter Regular 13px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#15` | Nav Publish | Publish | Inter Regular 13px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#16` | Instance | live · 192.168.3.159 | Inter Regular 11px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#19` | Title | WeshCraft console | Inter Bold 21px / 140% | #0f172a on #ffffff | 17.85:1 ✅ |
| `#20` | Subtitle | design → prototype → contract-checked specs | Inter Regular 12px / 140% | #64748b on #ffffff | 4.76:1 ✅ |
| `#22` | Placeholder | Search specs… | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#24` | Label | Publish | Inter SemiBold 13px / 140% | #ffffff on #6d5ef8 | 4.56:1 ✅ |
| `#26` | Label Parity | Parity | Inter Medium 11px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#27` | Value Parity | {{parity.score}} | Inter Bold 28px / 140% | #10b981 on #f7f8fc | 2.39:1 ⚠️ below 3:1 |
| `#29` | Label Checks | Checks | Inter Medium 11px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#30` | Value Checks | {{parity.checks}} | Inter Bold 28px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#32` | Label Errors | Errors | Inter Medium 11px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#33` | Value Errors | {{parity.errors}} | Inter Bold 28px / 140% | #ef4444 on #f7f8fc | 3.55:1 ✅ |
| `#35` | Label Screens | Screens | Inter Medium 11px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#36` | Value Screens | {{parity.screens}} | Inter Bold 28px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#38` | Heading | Spec jobs | Inter SemiBold 14px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#40` | File | specs/front/screens/scr-home-light.md | Inter Medium 13px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#41` | Status | done | Inter SemiBold 12px / 140% | #10b981 on #f7f8fc | 2.39:1 ⚠️ below 4.5:1 |
| `#42` | Updated | 2 min ago | Inter Regular 11px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#44` | File | specs/front/screens/scr-trail-light.md | Inter Medium 13px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#45` | Status | done | Inter SemiBold 12px / 140% | #10b981 on #f7f8fc | 2.39:1 ⚠️ below 4.5:1 |
| `#46` | Updated | 3 min ago | Inter Regular 11px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#48` | File | specs/back/api.md | Inter Medium 13px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#49` | Status | changed | Inter SemiBold 12px / 140% | #f59e0b on #f7f8fc | 2.02:1 ⚠️ below 4.5:1 |
| `#50` | Updated | 5 min ago | Inter Regular 11px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#52` | File | specs/LINKS.md | Inter Medium 13px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#53` | Status | done | Inter SemiBold 12px / 140% | #10b981 on #f7f8fc | 2.39:1 ⚠️ below 4.5:1 |
| `#54` | Updated | 5 min ago | Inter Regular 11px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#56` | Heading | Front ⇄ back | Inter SemiBold 14px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#58` | Relation 0 | lists | Inter SemiBold 11px / 140% | #6d5ef8 on #f7f8fc | 4.3:1 ⚠️ below 4.5:1 |
| `#59` | @link.rel | {{link.rel}} · {{link.target}} | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#61` | Relation 1 | displays | Inter SemiBold 11px / 140% | #6d5ef8 on #f7f8fc | 4.3:1 ⚠️ below 4.5:1 |
| `#62` | @link.rel | {{link.rel}} · {{link.target}} | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#64` | Relation 2 | triggers | Inter SemiBold 11px / 140% | #6d5ef8 on #f7f8fc | 4.3:1 ⚠️ below 4.5:1 |
| `#65` | @link.rel | {{link.rel}} · {{link.target}} | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#67` | Heading | Live feed | Inter SemiBold 14px / 140% | #0f172a on #f7f8fc | 16.82:1 ✅ |
| `#68` | Event 0 | {{event.message}} | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#69` | Event 1 | {{event.message}} | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |
| `#70` | Event 2 | {{event.message}} | Inter Regular 12px / 140% | #64748b on #f7f8fc | 4.48:1 ⚠️ below 4.5:1 |

## Components

| Node | Instance | Component | Props |
|---|---|---|---|
| `#39` | Job row 1 | [Job row](../components/cmp-job-row.md) | {"File":"specs/front/screens/scr-home-light.md","Status":"done","Updated":"2 min ago"} |
| `#43` | Job row 2 | [Job row](../components/cmp-job-row.md) | {"File":"specs/front/screens/scr-trail-light.md","Status":"done","Updated":"3 min ago"} |
| `#47` | Job row 3 | [Job row](../components/cmp-job-row.md) | {"File":"specs/back/api.md","Status":"changed","Updated":"5 min ago"} |
| `#51` | Job row 4 | [Job row](../components/cmp-job-row.md) | {"File":"specs/LINKS.md","Status":"done","Updated":"5 min ago"} |

## Interactions

No prototype interactions on this screen.

## Inputs

| Node | Field | Kind | Placeholder / default | Validation |
|---|---|---|---|---|
| `#21` | Search jobs | search | Search specs… | confirm with product |

## Front ⇄ back links

Where this screen meets the back end (full map: [LINKS.md](../../LINKS.md)). ▶ triggers · ⇢ submits · ☰ filled by · ◉ shows.

| Layer | Element | Link | Back end | |
|---|---|---|---|---|
| `#39` | Job row 1 | ☰ filled by | [`GET /jobs`](../../back/api.md#op-list-job-scr-dashboard-light) | returns `Job[]` |
| `#43` | Job row 2 | ☰ filled by | [`GET /jobs`](../../back/api.md#op-list-job-scr-dashboard-light) | returns `Job[]` |
| `#47` | Job row 3 | ☰ filled by | [`GET /jobs`](../../back/api.md#op-list-job-scr-dashboard-light) | returns `Job[]` |
| `#51` | Job row 4 | ☰ filled by | [`GET /jobs`](../../back/api.md#op-list-job-scr-dashboard-light) | returns `Job[]` |
| `#23` | Publish | ▶ triggers | [`POST /specs/publish`](../../back/api.md#op-post-specs-publish-23) | returns `Spec` |
| `#21` | Search jobs | ⇢ submits to | [`POST /specs/publish`](../../back/api.md#op-post-specs-publish-23) | returns `Spec` |
| `#25` | Parity | ▶ triggers | [`GET /parity`](../../back/api.md#op-get-parity-25) | returns `Parity` |
| `#55` | Front ⇄ back | ▶ triggers | [`GET /links`](../../back/api.md#op-get-links-55) | returns `Link` |
| `#66` | Live feed | ▶ triggers | [`GET /events`](../../back/api.md#op-get-events-66) | returns `Event` |
| `#68` | {{event.message}} | ◉ shows | [`Event.message`](../../back/domain.md#entity-event) | loaded by [`GET /events`](../../back/api.md#op-get-events-66) |
| `#69` | {{event.message}} | ◉ shows | [`Event.message`](../../back/domain.md#entity-event) | loaded by [`GET /events`](../../back/api.md#op-get-events-66) |
| `#70` | {{event.message}} | ◉ shows | [`Event.message`](../../back/domain.md#entity-event) | loaded by [`GET /events`](../../back/api.md#op-get-events-66) |
| `#40` | specs/front/screens/scr-home-light.md | ◉ shows | [`Job.file`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#44` | specs/front/screens/scr-trail-light.md | ◉ shows | [`Job.file`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#48` | specs/back/api.md | ◉ shows | [`Job.file`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#52` | specs/LINKS.md | ◉ shows | [`Job.file`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#41` | done | ◉ shows | [`Job.status`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#45` | done | ◉ shows | [`Job.status`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#49` | changed | ◉ shows | [`Job.status`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#53` | done | ◉ shows | [`Job.status`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#42` | 2 min ago | ◉ shows | [`Job.updated`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#46` | 3 min ago | ◉ shows | [`Job.updated`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#50` | 5 min ago | ◉ shows | [`Job.updated`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#54` | 5 min ago | ◉ shows | [`Job.updated`](../../back/domain.md#entity-job) | loaded by [`GET /jobs`](../../back/api.md#op-get-jobs-6) |
| `#59` | {{link.rel}} · {{link.target}} | ◉ shows | [`Link.rel`](../../back/domain.md#entity-link) | loaded by [`GET /links`](../../back/api.md#op-get-links-55) |
| `#62` | {{link.rel}} · {{link.target}} | ◉ shows | [`Link.rel`](../../back/domain.md#entity-link) | loaded by [`GET /links`](../../back/api.md#op-get-links-55) |
| `#65` | {{link.rel}} · {{link.target}} | ◉ shows | [`Link.rel`](../../back/domain.md#entity-link) | loaded by [`GET /links`](../../back/api.md#op-get-links-55) |
| `#27` | {{parity.score}} | ◉ shows | [`Parity.score`](../../back/domain.md#entity-parity) | loaded by [`GET /parity`](../../back/api.md#op-get-parity-25) |
| `#30` | {{parity.checks}} | ◉ shows | [`Parity.checks`](../../back/domain.md#entity-parity) | loaded by [`GET /parity`](../../back/api.md#op-get-parity-25) |
| `#33` | {{parity.errors}} | ◉ shows | [`Parity.errors`](../../back/domain.md#entity-parity) | loaded by [`GET /parity`](../../back/api.md#op-get-parity-25) |
| `#36` | {{parity.screens}} | ◉ shows | [`Parity.screens`](../../back/domain.md#entity-parity) | loaded by [`GET /parity`](../../back/api.md#op-get-parity-25) |

## Design tokens used

None bound; raw colours: #0f172a, #10b981, #64748b, #6d5ef8, #ede9fe, #ef4444, #f59e0b, #f7f8fc, #ffffff

## Designer annotations

- `#6` Dashboard — Light (development): GET /jobs → Job
- `#23` Publish specs (development): POST /specs/publish → Spec
- `#25` KPI Parity (development): GET /parity → Parity
- `#55` Front ⇄ back (development): GET /links → Link
- `#66` Live feed (development): GET /events → Event

## Acceptance criteria

1. Renders at 1440 × 900 px with the hierarchy, spacing and sizes in §Layout; a pixel comparison with the prototype render shows no difference above the project tolerance.
2. Every text in §Copy is shown verbatim with its typography and colour.
3. Activating `#23` calls `POST /specs/publish`; while pending the control is disabled; on error the screen stays and shows the error.
4. Activating `#25` calls `GET /parity`; while pending the control is disabled; on error the screen stays and shows the error.
5. Activating `#55` calls `GET /links`; while pending the control is disabled; on error the screen stays and shows the error.
6. Activating `#66` calls `GET /events`; while pending the control is disabled; on error the screen stays and shows the error.
7. The list built from `#39`, `#43`, `#47`, `#51` is filled from `GET /jobs`, with loading and empty states.
8. Contrast: `#9`, `#10`, `#12`, `#13`, `#14`, `#15`, `#16`, `#22`, `#26`, `#27`, `#29`, `#32`, `#35`, `#41`, `#42`, `#45`, `#46`, `#49`, `#50`, `#53`, `#54`, `#58`, `#59`, `#61`, `#62`, `#64`, `#65`, `#68`, `#69`, `#70` are below WCAG AA in the design; keep as designed or fix in FigCraft first (the spec follows the prototype).

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
   "node": 8,
   "text": "WeshCraft"
  },
  {
   "node": 9,
   "text": "console"
  },
  {
   "node": 10,
   "text": "Overview"
  },
  {
   "node": 12,
   "text": "Specs"
  },
  {
   "node": 13,
   "text": "Links"
  },
  {
   "node": 14,
   "text": "Prototype"
  },
  {
   "node": 15,
   "text": "Publish"
  },
  {
   "node": 16,
   "text": "live · 192.168.3.159"
  },
  {
   "node": 19,
   "text": "WeshCraft console"
  },
  {
   "node": 20,
   "text": "design → prototype → contract-checked specs"
  },
  {
   "node": 22,
   "text": "Search specs…"
  },
  {
   "node": 24,
   "text": "Publish"
  },
  {
   "node": 26,
   "text": "Parity"
  },
  {
   "node": 27,
   "text": "{{parity.score}}"
  },
  {
   "node": 29,
   "text": "Checks"
  },
  {
   "node": 30,
   "text": "{{parity.checks}}"
  },
  {
   "node": 32,
   "text": "Errors"
  },
  {
   "node": 33,
   "text": "{{parity.errors}}"
  },
  {
   "node": 35,
   "text": "Screens"
  },
  {
   "node": 36,
   "text": "{{parity.screens}}"
  },
  {
   "node": 38,
   "text": "Spec jobs"
  },
  {
   "node": 40,
   "text": "specs/front/screens/scr-home-light.md"
  },
  {
   "node": 41,
   "text": "done"
  },
  {
   "node": 42,
   "text": "2 min ago"
  },
  {
   "node": 44,
   "text": "specs/front/screens/scr-trail-light.md"
  },
  {
   "node": 45,
   "text": "done"
  },
  {
   "node": 46,
   "text": "3 min ago"
  },
  {
   "node": 48,
   "text": "specs/back/api.md"
  },
  {
   "node": 49,
   "text": "changed"
  },
  {
   "node": 50,
   "text": "5 min ago"
  },
  {
   "node": 52,
   "text": "specs/LINKS.md"
  },
  {
   "node": 53,
   "text": "done"
  },
  {
   "node": 54,
   "text": "5 min ago"
  },
  {
   "node": 56,
   "text": "Front ⇄ back"
  },
  {
   "node": 58,
   "text": "lists"
  },
  {
   "node": 59,
   "text": "{{link.rel}} · {{link.target}}"
  },
  {
   "node": 61,
   "text": "displays"
  },
  {
   "node": 62,
   "text": "{{link.rel}} · {{link.target}}"
  },
  {
   "node": 64,
   "text": "triggers"
  },
  {
   "node": 65,
   "text": "{{link.rel}} · {{link.target}}"
  },
  {
   "node": 67,
   "text": "Live feed"
  },
  {
   "node": 68,
   "text": "{{event.message}}"
  },
  {
   "node": 69,
   "text": "{{event.message}}"
  },
  {
   "node": 70,
   "text": "{{event.message}}"
  }
 ],
 "fingerprint": "a44925671d07",
 "inputs": [
  21
 ],
 "instances": [
  {
   "component": 2,
   "node": 39
  },
  {
   "component": 2,
   "node": 43
  },
  {
   "component": 2,
   "node": 47
  },
  {
   "component": 2,
   "node": 51
  }
 ],
 "key": "scr-dashboard-light",
 "kind": "front-screen",
 "links": [
  {
   "node": 39,
   "op": "op-list-job-scr-dashboard-light",
   "rel": "lists"
  },
  {
   "node": 43,
   "op": "op-list-job-scr-dashboard-light",
   "rel": "lists"
  },
  {
   "node": 47,
   "op": "op-list-job-scr-dashboard-light",
   "rel": "lists"
  },
  {
   "node": 51,
   "op": "op-list-job-scr-dashboard-light",
   "rel": "lists"
  },
  {
   "node": 23,
   "op": "op-post-specs-publish-23",
   "rel": "triggers"
  },
  {
   "node": 21,
   "op": "op-post-specs-publish-23",
   "rel": "submits"
  },
  {
   "node": 25,
   "op": "op-get-parity-25",
   "rel": "triggers"
  },
  {
   "node": 55,
   "op": "op-get-links-55",
   "rel": "triggers"
  },
  {
   "node": 66,
   "op": "op-get-events-66",
   "rel": "triggers"
  },
  {
   "field": "Event.message",
   "node": 68,
   "rel": "displays"
  },
  {
   "field": "Event.message",
   "node": 69,
   "rel": "displays"
  },
  {
   "field": "Event.message",
   "node": 70,
   "rel": "displays"
  },
  {
   "field": "Job.file",
   "node": 40,
   "rel": "displays"
  },
  {
   "field": "Job.file",
   "node": 44,
   "rel": "displays"
  },
  {
   "field": "Job.file",
   "node": 48,
   "rel": "displays"
  },
  {
   "field": "Job.file",
   "node": 52,
   "rel": "displays"
  },
  {
   "field": "Job.status",
   "node": 41,
   "rel": "displays"
  },
  {
   "field": "Job.status",
   "node": 45,
   "rel": "displays"
  },
  {
   "field": "Job.status",
   "node": 49,
   "rel": "displays"
  },
  {
   "field": "Job.status",
   "node": 53,
   "rel": "displays"
  },
  {
   "field": "Job.updated",
   "node": 42,
   "rel": "displays"
  },
  {
   "field": "Job.updated",
   "node": 46,
   "rel": "displays"
  },
  {
   "field": "Job.updated",
   "node": 50,
   "rel": "displays"
  },
  {
   "field": "Job.updated",
   "node": 54,
   "rel": "displays"
  },
  {
   "field": "Link.rel",
   "node": 59,
   "rel": "displays"
  },
  {
   "field": "Link.rel",
   "node": 62,
   "rel": "displays"
  },
  {
   "field": "Link.rel",
   "node": 65,
   "rel": "displays"
  },
  {
   "field": "Parity.score",
   "node": 27,
   "rel": "displays"
  },
  {
   "field": "Parity.checks",
   "node": 30,
   "rel": "displays"
  },
  {
   "field": "Parity.errors",
   "node": 33,
   "rel": "displays"
  },
  {
   "field": "Parity.screens",
   "node": 36,
   "rel": "displays"
  }
 ],
 "node": 6,
 "operations": [
  "op-list-job-scr-dashboard-light",
  "op-get-jobs-6",
  "op-post-specs-publish-23",
  "op-get-parity-25",
  "op-get-links-55",
  "op-get-events-66"
 ],
 "size": [
  1440,
  900
 ],
 "sourceHash": "d5a504f901758656"
}
-->
