# API

Every operation a screen needs, grouped by screen. Conventions (auth, errors, pagination) are in [conventions](conventions.md); the machine-readable contract is [`openapi.json`](openapi.json).

## 2 Interests

<a id="op-continue-87"></a>
### `POST /interests/continue` — Continue

- Screen: [2 Interests](../front/screens/scr-2-interests.md), triggered by `#87`
- Function: [Onboarding](../FUNCTIONS.md#fn-onboarding)
- Code tag: `@weshcraft POST /interests/continue` ([trace](../TRACE.md))
- Kind: action · confidence: inferred
- Front end: ▶ `#87` Continue
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

## 3 Location

<a id="op-allow-location-125"></a>
### `POST /location/allow` — Allow location

- Screen: [3 Location](../front/screens/scr-3-location.md), triggered by `#125`
- Function: [Onboarding](../FUNCTIONS.md#fn-onboarding)
- Code tag: `@weshcraft POST /location/allow` ([trace](../TRACE.md))
- Kind: action · confidence: inferred
- Front end: ▶ `#125` Allow location
- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.

## Open questions

- `POST /interests/continue` (Continue) is inferred from an action label: confirm path, payload and whether it is needed.
- `POST /location/allow` (Allow location) is inferred from an action label: confirm path, payload and whether it is needed.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "kind": "back-api",
 "operations": [
  {
   "key": "op-continue-87",
   "method": "POST",
   "path": "/interests/continue",
   "screen": "scr-2-interests",
   "trigger": 87
  },
  {
   "key": "op-allow-location-125",
   "method": "POST",
   "path": "/location/allow",
   "screen": "scr-3-location",
   "trigger": 125
  }
 ],
 "sourceHash": "b85bb69c1a0acf67"
}
-->
