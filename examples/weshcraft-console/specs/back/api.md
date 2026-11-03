# API

Every operation a screen needs, grouped by screen. Conventions (auth, errors, pagination) are in [conventions](conventions.md); the machine-readable contract is [`openapi.json`](openapi.json).

## Dashboard — Light

<a id="op-list-job-scr-dashboard-light"></a>
### `GET /jobs` — List Job

- Screen: [Dashboard — Light](../front/screens/scr-dashboard-light.md), on screen load
- Kind: list · confidence: inferred
- Front end: ☰ `#39` Job row 1 · ☰ `#43` Job row 2 · ☰ `#47` Job row 3 · ☰ `#51` Job row 4
- Returns: `Job[]` (paginated)
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-jobs-6"></a>
### `GET /jobs` — GET /jobs → Job

- Screen: [Dashboard — Light](../front/screens/scr-dashboard-light.md), on screen load
- Kind: annotated · confidence: explicit
- Response shown: `Job.file` (`#40` `#44` `#48` `#52`), `Job.status` (`#41` `#45` `#49` `#53`), `Job.updated` (`#42` `#46` `#50` `#54`)
- Returns: `Job`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-post-specs-publish-23"></a>
### `POST /specs/publish` — POST /specs/publish → Spec

- Screen: [Dashboard — Light](../front/screens/scr-dashboard-light.md), triggered by `#23`
- Kind: annotated · confidence: explicit
- Front end: ▶ `#23` Publish · ⇢ `#21` Search jobs
- Returns: `Spec`
- Request body: `search_jobs` from `#21`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-parity-25"></a>
### `GET /parity` — GET /parity → Parity

- Screen: [Dashboard — Light](../front/screens/scr-dashboard-light.md), triggered by `#25`
- Kind: annotated · confidence: explicit
- Front end: ▶ `#25` Parity
- Response shown: `Parity.score` (`#27`), `Parity.checks` (`#30`), `Parity.errors` (`#33`), `Parity.screens` (`#36`)
- Returns: `Parity`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-links-55"></a>
### `GET /links` — GET /links → Link

- Screen: [Dashboard — Light](../front/screens/scr-dashboard-light.md), triggered by `#55`
- Kind: annotated · confidence: explicit
- Front end: ▶ `#55` Front ⇄ back
- Response shown: `Link.rel` (`#59` `#62` `#65`)
- Returns: `Link`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-events-66"></a>
### `GET /events` — GET /events → Event

- Screen: [Dashboard — Light](../front/screens/scr-dashboard-light.md), triggered by `#66`
- Kind: annotated · confidence: explicit
- Front end: ▶ `#66` Live feed
- Response shown: `Event.message` (`#68` `#69` `#70`)
- Returns: `Event`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

## Dashboard — Dark

<a id="op-list-job-scr-dashboard-dark"></a>
### `GET /jobs` — List Job

- Screen: [Dashboard — Dark](../front/screens/scr-dashboard-dark.md), on screen load
- Kind: list · confidence: inferred
- Front end: ☰ `#104` Job row 1 · ☰ `#108` Job row 2 · ☰ `#112` Job row 3
- Returns: `Job[]` (paginated)
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-jobs-71"></a>
### `GET /jobs` — GET /jobs → Job

- Screen: [Dashboard — Dark](../front/screens/scr-dashboard-dark.md), on screen load
- Kind: annotated · confidence: explicit
- Response shown: `Job.file` (`#105` `#109` `#113`), `Job.status` (`#106` `#110` `#114`), `Job.updated` (`#107` `#111` `#115`)
- Returns: `Job`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-post-specs-publish-88"></a>
### `POST /specs/publish` — POST /specs/publish → Spec

- Screen: [Dashboard — Dark](../front/screens/scr-dashboard-dark.md), triggered by `#88`
- Kind: annotated · confidence: explicit
- Front end: ▶ `#88` Publish · ⇢ `#86` Search jobs
- Returns: `Spec`
- Request body: `search_jobs` from `#86`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-parity-90"></a>
### `GET /parity` — GET /parity → Parity

- Screen: [Dashboard — Dark](../front/screens/scr-dashboard-dark.md), triggered by `#90`
- Kind: annotated · confidence: explicit
- Front end: ▶ `#90` Parity
- Response shown: `Parity.score` (`#92`), `Parity.checks` (`#95`), `Parity.errors` (`#98`), `Parity.screens` (`#101`)
- Returns: `Parity`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-links-116"></a>
### `GET /links` — GET /links → Link

- Screen: [Dashboard — Dark](../front/screens/scr-dashboard-dark.md), triggered by `#116`
- Kind: annotated · confidence: explicit
- Front end: ▶ `#116` Front ⇄ back
- Response shown: `Link.rel` (`#120` `#123` `#126`)
- Returns: `Link`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-events-127"></a>
### `GET /events` — GET /events → Event

- Screen: [Dashboard — Dark](../front/screens/scr-dashboard-dark.md), triggered by `#127`
- Kind: annotated · confidence: explicit
- Front end: ▶ `#127` Live feed
- Response shown: `Event.message` (`#129` `#130`)
- Returns: `Event`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

## Spec detail

<a id="op-get-specs-id-131"></a>
### `GET /specs/{id}` — GET /specs/{id} → Spec

- Screen: [Spec detail](../front/screens/scr-spec-detail.md), on screen load
- Kind: annotated · confidence: explicit
- Response shown: `Spec.title` (`#134`), `Spec.file` (`#135`), `Spec.status` (`#137`), `Spec.heading` (`#139`), `Spec.fingerprint` (`#148`), `Spec.checks` (`#150`), `Spec.errors` (`#152`), `Spec.layer` (`#154`), `Spec.owner` (`#156`)
- Returns: `Spec`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

## Open questions

- `GET /jobs` (List Job) is inferred from a repeated component: confirm path, payload and whether it is needed.
- `GET /jobs` (List Job) is inferred from a repeated component: confirm path, payload and whether it is needed.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "kind": "back-api",
 "operations": [
  {
   "key": "op-list-job-scr-dashboard-light",
   "method": "GET",
   "path": "/jobs",
   "screen": "scr-dashboard-light",
   "trigger": null
  },
  {
   "key": "op-get-jobs-6",
   "method": "GET",
   "path": "/jobs",
   "screen": "scr-dashboard-light",
   "trigger": null
  },
  {
   "key": "op-post-specs-publish-23",
   "method": "POST",
   "path": "/specs/publish",
   "screen": "scr-dashboard-light",
   "trigger": 23
  },
  {
   "key": "op-get-parity-25",
   "method": "GET",
   "path": "/parity",
   "screen": "scr-dashboard-light",
   "trigger": 25
  },
  {
   "key": "op-get-links-55",
   "method": "GET",
   "path": "/links",
   "screen": "scr-dashboard-light",
   "trigger": 55
  },
  {
   "key": "op-get-events-66",
   "method": "GET",
   "path": "/events",
   "screen": "scr-dashboard-light",
   "trigger": 66
  },
  {
   "key": "op-list-job-scr-dashboard-dark",
   "method": "GET",
   "path": "/jobs",
   "screen": "scr-dashboard-dark",
   "trigger": null
  },
  {
   "key": "op-get-jobs-71",
   "method": "GET",
   "path": "/jobs",
   "screen": "scr-dashboard-dark",
   "trigger": null
  },
  {
   "key": "op-post-specs-publish-88",
   "method": "POST",
   "path": "/specs/publish",
   "screen": "scr-dashboard-dark",
   "trigger": 88
  },
  {
   "key": "op-get-parity-90",
   "method": "GET",
   "path": "/parity",
   "screen": "scr-dashboard-dark",
   "trigger": 90
  },
  {
   "key": "op-get-links-116",
   "method": "GET",
   "path": "/links",
   "screen": "scr-dashboard-dark",
   "trigger": 116
  },
  {
   "key": "op-get-events-127",
   "method": "GET",
   "path": "/events",
   "screen": "scr-dashboard-dark",
   "trigger": 127
  },
  {
   "key": "op-get-specs-id-131",
   "method": "GET",
   "path": "/specs/{id}",
   "screen": "scr-spec-detail",
   "trigger": null
  }
 ],
 "sourceHash": "d5a504f901758656"
}
-->
