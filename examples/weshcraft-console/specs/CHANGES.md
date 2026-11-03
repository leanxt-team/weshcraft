# Design changelog

Every regeneration that changed the prototype, newest first. Written by WeshCraft from the manifest; `#id` cites the layer.

<!-- weshcraft:change d5a504f901758656 -->
### 2026-11-03 23:53 UTC · `02428ce47d0b8664` → `d5a504f901758656`

- + `GET /parity` on scr-dashboard-light (explicit)
- + `GET /links` on scr-dashboard-light (explicit)
- + `GET /events` on scr-dashboard-light (explicit)
- + `GET /parity` on scr-dashboard-dark (explicit)
- + `GET /links` on scr-dashboard-dark (explicit)
- + `GET /events` on scr-dashboard-dark (explicit)
- ~ Front ⇄ back links: +6 −0
- − Gaps: 12 → 0

<!-- weshcraft:change 02428ce47d0b8664 -->
### 2026-11-03 23:52 UTC · `6ed2d6fe4e540020` → `02428ce47d0b8664`

- + Dashboard — Light: new text “WeshCraft” (`#8`)
- + Dashboard — Light: new text “console” (`#9`)
- + Dashboard — Light: new text “Overview” (`#10`)
- + Dashboard — Light: new text “Specs” (`#12`)
- + Dashboard — Light: new text “Links” (`#13`)
- + Dashboard — Light: new text “Prototype” (`#14`)
- + Dashboard — Light: new text “Publish” (`#15`)
- + Dashboard — Light: new text “live · 192.168.3.159” (`#16`)
- + Dashboard — Light: new text “WeshCraft console” (`#19`)
- + Dashboard — Light: new text “design → prototype → contract-checked specs” (`#20`)
- + Dashboard — Light: new text “Search specs…” (`#22`)
- + Dashboard — Light: new text “Publish” (`#24`)
- + Dashboard — Light: new text “Parity” (`#26`)
- + Dashboard — Light: new text “{{parity.score}}” (`#27`)
- + Dashboard — Light: new text “Checks” (`#29`)
- + Dashboard — Light: new text “{{parity.checks}}” (`#30`)
- + Dashboard — Light: new text “Errors” (`#32`)
- + Dashboard — Light: new text “{{parity.errors}}” (`#33`)
- + Dashboard — Light: new text “Screens” (`#35`)
- + Dashboard — Light: new text “{{parity.screens}}” (`#36`)
- + Dashboard — Light: new text “Spec jobs” (`#38`)
- + Dashboard — Light: new text “specs/front/screens/scr-home-light.md” (`#40`)
- + Dashboard — Light: new text “done” (`#41`)
- + Dashboard — Light: new text “2 min ago” (`#42`)
- + Dashboard — Light: new text “specs/front/screens/scr-trail-light.md” (`#44`)
- + Dashboard — Light: new text “done” (`#45`)
- + Dashboard — Light: new text “3 min ago” (`#46`)
- + Dashboard — Light: new text “specs/back/api.md” (`#48`)
- + Dashboard — Light: new text “changed” (`#49`)
- + Dashboard — Light: new text “5 min ago” (`#50`)
- + Dashboard — Light: new text “specs/LINKS.md” (`#52`)
- + Dashboard — Light: new text “done” (`#53`)
- + Dashboard — Light: new text “5 min ago” (`#54`)
- + Dashboard — Light: new text “Front ⇄ back” (`#56`)
- + Dashboard — Light: new text “lists” (`#58`)
- + Dashboard — Light: new text “{{link.rel}} · {{link.target}}” (`#59`)
- + Dashboard — Light: new text “displays” (`#61`)
- + Dashboard — Light: new text “{{link.rel}} · {{link.target}}” (`#62`)
- + Dashboard — Light: new text “triggers” (`#64`)
- + Dashboard — Light: new text “{{link.rel}} · {{link.target}}” (`#65`)
- … 65 more copy changes
- + Spec detail: “← Specs” → navigate scr-dashboard-light (`#133`)
- + Entity **Event** (message)
- + Entity **Job** (file, status, updated)
- + Entity **Link** (rel)
- + Entity **Parity** (score, checks, errors, screens)
- + Entity **Spec** (title, file, status, heading, fingerprint, checks, errors, layer, owner)
- + `POST /specs/publish` on scr-dashboard-light (explicit)
- + `POST /specs/publish` on scr-dashboard-dark (explicit)
- ~ Front ⇄ back links: +60 −0
- + Gaps: 3 → 12
