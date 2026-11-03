# Domain model

Entities and fields the prototype displays or edits. Types come from explicit bindings; inferred fields default to `string` until confirmed.

<a id="entity-event"></a>
## Event

Source layers: `#68`, `#69`, `#70`, `#129`, `#130` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| message | string | {{event.message}} | `#68`, `#69`, `#70`, `#129`, `#130` | [Dashboard — Light](../front/screens/scr-dashboard-light.md), [Dashboard — Dark](../front/screens/scr-dashboard-dark.md) | [`GET /events`](api.md#op-get-events-66), [`GET /events`](api.md#op-get-events-127) | explicit |

<a id="entity-job"></a>
## Job

Source layers: `#40`, `#41`, `#42`, `#44`, `#45`, `#46`, `#48`, `#49`, `#50`, `#52`, `#53`, `#54`, `#105`, `#106`, `#107`, `#109`, `#110`, `#111`, `#113`, `#114`, `#115` · inferred

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| file | string | specs/front/screens/scr-home-light.md | `#40`, `#44`, `#48`, `#52`, `#105`, `#109`, `#113` | [Dashboard — Light](../front/screens/scr-dashboard-light.md), [Dashboard — Dark](../front/screens/scr-dashboard-dark.md) | [`GET /jobs`](api.md#op-get-jobs-6), [`GET /jobs`](api.md#op-get-jobs-71) | inferred |
| status | string | done | `#41`, `#45`, `#49`, `#53`, `#106`, `#110`, `#114` | [Dashboard — Light](../front/screens/scr-dashboard-light.md), [Dashboard — Dark](../front/screens/scr-dashboard-dark.md) | [`GET /jobs`](api.md#op-get-jobs-6), [`GET /jobs`](api.md#op-get-jobs-71) | inferred |
| updated | string | 2 min ago | `#42`, `#46`, `#50`, `#54`, `#107`, `#111`, `#115` | [Dashboard — Light](../front/screens/scr-dashboard-light.md), [Dashboard — Dark](../front/screens/scr-dashboard-dark.md) | [`GET /jobs`](api.md#op-get-jobs-6), [`GET /jobs`](api.md#op-get-jobs-71) | inferred |

<a id="entity-link"></a>
## Link

Source layers: `#59`, `#62`, `#65`, `#120`, `#123`, `#126` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| rel | string | {{link.rel}} · {{link.target}} | `#59`, `#62`, `#65`, `#120`, `#123`, `#126` | [Dashboard — Light](../front/screens/scr-dashboard-light.md), [Dashboard — Dark](../front/screens/scr-dashboard-dark.md) | [`GET /links`](api.md#op-get-links-55), [`GET /links`](api.md#op-get-links-116) | explicit |

<a id="entity-parity"></a>
## Parity

Source layers: `#27`, `#30`, `#33`, `#36`, `#92`, `#95`, `#98`, `#101` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| score | string | {{parity.score}} | `#27`, `#92` | [Dashboard — Light](../front/screens/scr-dashboard-light.md), [Dashboard — Dark](../front/screens/scr-dashboard-dark.md) | [`GET /parity`](api.md#op-get-parity-25), [`GET /parity`](api.md#op-get-parity-90) | explicit |
| checks | string | {{parity.checks}} | `#30`, `#95` | [Dashboard — Light](../front/screens/scr-dashboard-light.md), [Dashboard — Dark](../front/screens/scr-dashboard-dark.md) | [`GET /parity`](api.md#op-get-parity-25), [`GET /parity`](api.md#op-get-parity-90) | explicit |
| errors | string | {{parity.errors}} | `#33`, `#98` | [Dashboard — Light](../front/screens/scr-dashboard-light.md), [Dashboard — Dark](../front/screens/scr-dashboard-dark.md) | [`GET /parity`](api.md#op-get-parity-25), [`GET /parity`](api.md#op-get-parity-90) | explicit |
| screens | string | {{parity.screens}} | `#36`, `#101` | [Dashboard — Light](../front/screens/scr-dashboard-light.md), [Dashboard — Dark](../front/screens/scr-dashboard-dark.md) | [`GET /parity`](api.md#op-get-parity-25), [`GET /parity`](api.md#op-get-parity-90) | explicit |

<a id="entity-spec"></a>
## Spec

Source layers: `#134`, `#135`, `#137`, `#139`, `#148`, `#150`, `#152`, `#154`, `#156` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| title | string | {{spec.title}} | `#134` | [Spec detail](../front/screens/scr-spec-detail.md) | [`GET /specs/{id}`](api.md#op-get-specs-id-131) | explicit |
| file | string | {{spec.file}} | `#135` | [Spec detail](../front/screens/scr-spec-detail.md) | [`GET /specs/{id}`](api.md#op-get-specs-id-131) | explicit |
| status | string | {{spec.status}} | `#137` | [Spec detail](../front/screens/scr-spec-detail.md) | [`GET /specs/{id}`](api.md#op-get-specs-id-131) | explicit |
| heading | string | {{spec.heading}} | `#139` | [Spec detail](../front/screens/scr-spec-detail.md) | [`GET /specs/{id}`](api.md#op-get-specs-id-131) | explicit |
| fingerprint | string | {{spec.fingerprint}} | `#148` | [Spec detail](../front/screens/scr-spec-detail.md) | [`GET /specs/{id}`](api.md#op-get-specs-id-131) | explicit |
| checks | string | {{spec.checks}} | `#150` | [Spec detail](../front/screens/scr-spec-detail.md) | [`GET /specs/{id}`](api.md#op-get-specs-id-131) | explicit |
| errors | string | {{spec.errors}} | `#152` | [Spec detail](../front/screens/scr-spec-detail.md) | [`GET /specs/{id}`](api.md#op-get-specs-id-131) | explicit |
| layer | string | {{spec.layer}} | `#154` | [Spec detail](../front/screens/scr-spec-detail.md) | [`GET /specs/{id}`](api.md#op-get-specs-id-131) | explicit |
| owner | string | {{spec.owner}} | `#156` | [Spec detail](../front/screens/scr-spec-detail.md) | [`GET /specs/{id}`](api.md#op-get-specs-id-131) | explicit |

## Open questions

- Confirm type and constraints of `Job.file` (inferred from a component property).
- Confirm type and constraints of `Job.status` (inferred from a component property).
- Confirm type and constraints of `Job.updated` (inferred from a component property).

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "entities": [
  {
   "fields": [
    "message"
   ],
   "name": "Event"
  },
  {
   "fields": [
    "file",
    "status",
    "updated"
   ],
   "name": "Job"
  },
  {
   "fields": [
    "rel"
   ],
   "name": "Link"
  },
  {
   "fields": [
    "score",
    "checks",
    "errors",
    "screens"
   ],
   "name": "Parity"
  },
  {
   "fields": [
    "title",
    "file",
    "status",
    "heading",
    "fingerprint",
    "checks",
    "errors",
    "layer",
    "owner"
   ],
   "name": "Spec"
  }
 ],
 "kind": "back-domain",
 "sourceHash": "d5a504f901758656"
}
-->
