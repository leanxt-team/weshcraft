# API & MCP

2 operations, by function. Request and response details are in [the API spec](back/api.md) and [`openapi.json`](back/openapi.json); conventions (auth, errors, pagination) in [conventions](back/conventions.md).

## Onboarding

| Method | Path | What | Called from | Returns |
|---|---|---|---|---|
| [`POST`](back/api.md#op-continue-87) | `/interests/continue` | Continue | [2 Interests](front/screens/scr-2-interests.md) | — |
| [`POST`](back/api.md#op-allow-location-125) | `/location/allow` | Allow location | [3 Location](front/screens/scr-3-location.md) | — |

## Notes

<!-- weshcraft:notes:start -->
_Versioning, rate limits, idempotency, webhooks, open questions._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "endpoints": [],
 "kind": "api-overview",
 "operations": [
  {
   "fn": "fn-onboarding",
   "key": "op-continue-87",
   "method": "POST",
   "path": "/interests/continue"
  },
  {
   "fn": "fn-onboarding",
   "key": "op-allow-location-125",
   "method": "POST",
   "path": "/location/allow"
  }
 ],
 "sourceHash": "e249123dd8bfcc22",
 "tools": []
}
-->
