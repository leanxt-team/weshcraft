# API

Every operation a screen needs, grouped by screen. Conventions (auth, errors, pagination) are in [conventions](conventions.md); the machine-readable contract is [`openapi.json`](openapi.json).

## Console — Light

<a id="op-get-jobs-2"></a>
### `GET /jobs` — GET /jobs → Job

- Screen: [Console — Light](../front/screens/scr-console-light.md), on screen load
- Function: [Console](../FUNCTIONS.md#fn-console)
- Kind: annotated · confidence: explicit
- Response shown: `Job.file` (`#156` `#164` `#172` `#180`), `Job.group` (`#157` `#165` `#173` `#181`), `Job.updated` (`#158` `#166` `#174` `#182`), `Job.status` (`#161` `#169` `#177` `#185`), `Job.checks` (`#162` `#170` `#178` `#186`)
- Returns: `Job`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-post-specs-publish-54"></a>
### `POST /specs/publish` — POST /specs/publish → Spec

- Screen: [Console — Light](../front/screens/scr-console-light.md), triggered by `#54`
- Function: [Console](../FUNCTIONS.md#fn-console)
- Kind: annotated · confidence: explicit
- Front end: ▶ `#54` Publish · ⇢ `#46` Search · ⇢ `#47` Search
- Returns: `Spec`
- Request body: `search` from `#46`, `search` from `#47`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-parity-56"></a>
### `GET /parity` — GET /parity → Parity

- Screen: [Console — Light](../front/screens/scr-console-light.md), triggered by `#56`
- Function: [Console](../FUNCTIONS.md#fn-console)
- Kind: annotated · confidence: explicit
- Front end: ▶ `#56` Parity
- Returns: `Parity`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-parity-trend-80"></a>
### `GET /parity/trend` — GET /parity/trend → Parity

- Screen: [Console — Light](../front/screens/scr-console-light.md), triggered by `#80`
- Function: [Console](../FUNCTIONS.md#fn-console)
- Kind: annotated · confidence: explicit
- Front end: ▶ `#80` Parity over time
- Returns: `Parity`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-links-101"></a>
### `GET /links` — GET /links → Link

- Screen: [Console — Light](../front/screens/scr-console-light.md), triggered by `#101`
- Function: [Console](../FUNCTIONS.md#fn-console)
- Kind: annotated · confidence: explicit
- Front end: ▶ `#101` Spec jobs by group
- Response shown: `Link.rel` (`#113` `#117` `#121`), `Link.share` (`#114` `#118` `#122`)
- Returns: `Link`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-parity-history-123"></a>
### `GET /parity/history` — GET /parity/history → Parity

- Screen: [Console — Light](../front/screens/scr-console-light.md), triggered by `#123`
- Function: [Console](../FUNCTIONS.md#fn-console)
- Kind: annotated · confidence: explicit
- Front end: ▶ `#123` Checks per run
- Response shown: `Parity.score` (`#59`), `Parity.checks` (`#65`), `Parity.errors` (`#71`), `Parity.screens` (`#77`)
- Returns: `Parity`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

<a id="op-get-specs-144"></a>
### `GET /specs` — GET /specs → Spec

- Screen: [Console — Light](../front/screens/scr-console-light.md), triggered by `#144`
- Function: [Console](../FUNCTIONS.md#fn-console)
- Kind: annotated · confidence: explicit
- Front end: ▶ `#144` Spec jobs
- Returns: `Spec`
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "kind": "back-api",
 "operations": [
  {
   "key": "op-get-jobs-2",
   "method": "GET",
   "path": "/jobs",
   "screen": "scr-console-light",
   "trigger": null
  },
  {
   "key": "op-post-specs-publish-54",
   "method": "POST",
   "path": "/specs/publish",
   "screen": "scr-console-light",
   "trigger": 54
  },
  {
   "key": "op-get-parity-56",
   "method": "GET",
   "path": "/parity",
   "screen": "scr-console-light",
   "trigger": 56
  },
  {
   "key": "op-get-parity-trend-80",
   "method": "GET",
   "path": "/parity/trend",
   "screen": "scr-console-light",
   "trigger": 80
  },
  {
   "key": "op-get-links-101",
   "method": "GET",
   "path": "/links",
   "screen": "scr-console-light",
   "trigger": 101
  },
  {
   "key": "op-get-parity-history-123",
   "method": "GET",
   "path": "/parity/history",
   "screen": "scr-console-light",
   "trigger": 123
  },
  {
   "key": "op-get-specs-144",
   "method": "GET",
   "path": "/specs",
   "screen": "scr-console-light",
   "trigger": 144
  }
 ],
 "sourceHash": "d69943427aa24a1d"
}
-->
