# Domain model

Entities and fields the prototype displays or edits. Types come from explicit bindings; inferred fields default to `string` until confirmed.

<a id="entity-job"></a>
## Job

Source layers: `#156`, `#157`, `#158`, `#161`, `#162`, `#164`, `#165`, `#166`, `#169`, `#170`, `#172`, `#173`, `#174`, `#177`, `#178`, `#180`, `#181`, `#182`, `#185`, `#186` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| file | string | specs/front/screens/scr-home-light.md | `#156`, `#164`, `#172`, `#180` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /jobs`](api.md#op-get-jobs-2) | explicit |
| group | string | front | `#157`, `#165`, `#173`, `#181` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /jobs`](api.md#op-get-jobs-2) | explicit |
| updated | string | 2 min ago | `#158`, `#166`, `#174`, `#182` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /jobs`](api.md#op-get-jobs-2) | explicit |
| status | string | done | `#161`, `#169`, `#177`, `#185` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /jobs`](api.md#op-get-jobs-2) | explicit |
| checks | string | 153 | `#162`, `#170`, `#178`, `#186` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /jobs`](api.md#op-get-jobs-2) | explicit |

<a id="entity-link"></a>
## Link

Source layers: `#113`, `#114`, `#117`, `#118`, `#121`, `#122` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| rel | string | front | `#113`, `#117`, `#121` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /links`](api.md#op-get-links-101) | explicit |
| share | string | 62% | `#114`, `#118`, `#122` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /links`](api.md#op-get-links-101) | explicit |

<a id="entity-parity"></a>
## Parity

Source layers: `#59`, `#65`, `#71`, `#77` · explicit

| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |
|---|---|---|---|---|---|---|
| id | id | — | — | — | — | required |
| score | string | 100% | `#59` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /parity/history`](api.md#op-get-parity-history-123) | explicit |
| checks | string | 576 | `#65` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /parity/history`](api.md#op-get-parity-history-123) | explicit |
| errors | string | 0 | `#71` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /parity/history`](api.md#op-get-parity-history-123) | explicit |
| screens | string | 3 | `#77` | [Console — Light](../front/screens/scr-console-light.md) | [`GET /parity/history`](api.md#op-get-parity-history-123) | explicit |

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "entities": [
  {
   "fields": [
    "file",
    "group",
    "updated",
    "status",
    "checks"
   ],
   "name": "Job"
  },
  {
   "fields": [
    "rel",
    "share"
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
  }
 ],
 "kind": "back-domain",
 "sourceHash": "60e569c9b2fe7a39"
}
-->
