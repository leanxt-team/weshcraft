# Component: Job row

| | |
|---|---|
| Node | `#2` |
| Kind | component |
| Size | 760 × 56 px |
| Used in | [Dashboard — Light](../screens/scr-dashboard-light.md), [Dashboard — Dark](../screens/scr-dashboard-dark.md) |
| Fingerprint | `3664c117a21d` |

One spec job in the queue.

## Properties

| Property | Type | Values / default |
|---|---|---|
| File | text | {"type":"text"} |
| Status | text | {"type":"text"} |
| Updated | text | {"type":"text"} |

## Anatomy

- `#2` **Job row** — component · 760×56
  - `#3` **File** — text · 520×18 · size fixed×hug — “specs/front/screens/scr-home-light.md”
  - `#4` **Status** — text · 90×17 · size fixed×hug — “done”
  - `#5` **Updated** — text · 110×15 · size fixed×hug — “2 min ago”

## Styles

```css
/* Job row (#2) */
.cmp-job-row {
  width: 760px;
  height: 56px;
}
```

## Acceptance criteria

1. Every variant above renders with the listed size and styles.
2. Interactive variants (hover, pressed, disabled, selected) are reachable by pointer and keyboard; disabled ignores input.
3. Text content comes from properties, never hard-coded, where the design exposes a property.

## Notes

<!-- weshcraft:notes:start -->
_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._
<!-- weshcraft:notes:end -->

<!-- weshcraft:contract
{
 "fingerprint": "3664c117a21d",
 "key": "cmp-job-row",
 "kind": "front-component",
 "node": 2,
 "sourceHash": "d5a504f901758656",
 "variants": []
}
-->
