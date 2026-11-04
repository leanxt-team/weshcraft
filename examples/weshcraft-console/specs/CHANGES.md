# Design changelog

Every regeneration that changed the prototype, newest first. Written by WeshCraft from the manifest; `#id` cites the layer.

<!-- weshcraft:change d69943427aa24a1d -->
### 2026-11-04 14:58 UTC · `d378e26074d3cd4f` → `d69943427aa24a1d`


<!-- weshcraft:change d378e26074d3cd4f -->
### 2026-11-04 07:33 UTC · `60e569c9b2fe7a39` → `d378e26074d3cd4f`

- ~ Console — Light: “Dashboard” → “Console” (`#43`)

<!-- weshcraft:change 60e569c9b2fe7a39 -->
### 2026-11-04 00:04 UTC · `f3439d0656eb5a1a` → `60e569c9b2fe7a39`

- + Screen **Console — Light** added
- + Entity **Job** (file, group, updated, status, checks)
- + Entity **Link** (rel, share)
- + Entity **Parity** (score, checks, errors, screens)
- + `GET /jobs` on scr-console-light (explicit)
- + `POST /specs/publish` on scr-console-light (explicit)
- + `GET /parity` on scr-console-light (explicit)
- + `GET /parity/trend` on scr-console-light (explicit)
- + `GET /links` on scr-console-light (explicit)
- + `GET /parity/history` on scr-console-light (explicit)
- + `GET /specs` on scr-console-light (explicit)
- ~ Front ⇄ back links: +38 −0

<!-- weshcraft:change f3439d0656eb5a1a -->
### 2026-11-04 00:02 UTC · `8e9827ca19d6a3bc` → `f3439d0656eb5a1a`

- − Screen **Console — Light** removed
- − Entity **Job** removed
- − Entity **Link** removed
- − Entity **Parity** removed
- − `GET /jobs` on scr-console-light removed
- − `POST /specs/publish` on scr-console-light removed
- − `GET /parity` on scr-console-light removed
- − `GET /parity/trend` on scr-console-light removed
- − `GET /links` on scr-console-light removed
- − `GET /parity/history` on scr-console-light removed
- − `GET /specs` on scr-console-light removed
- ~ Front ⇄ back links: +0 −38

<!-- weshcraft:change 8e9827ca19d6a3bc -->
### 2026-11-04 00:00 UTC · `d5a504f901758656` → `8e9827ca19d6a3bc`

- + Screen **Console — Light** added
- − Screen **Dashboard — Light** removed
- − Screen **Dashboard — Dark** removed
- − Screen **Spec detail** removed
- − Component **Job row** removed
- + Field `Job.group` added
- + Field `Job.checks` added
- + Field `Link.share` added
- − Entity **Event** removed
- − Entity **Spec** removed
- + `GET /jobs` on scr-console-light (explicit)
- + `POST /specs/publish` on scr-console-light (explicit)
- + `GET /parity` on scr-console-light (explicit)
- + `GET /parity/trend` on scr-console-light (explicit)
- + `GET /links` on scr-console-light (explicit)
- + `GET /parity/history` on scr-console-light (explicit)
- + `GET /specs` on scr-console-light (explicit)
- − `GET /jobs` on scr-dashboard-light removed
- − `POST /specs/publish` on scr-dashboard-light removed
- − `GET /parity` on scr-dashboard-light removed
- − `GET /links` on scr-dashboard-light removed
- − `GET /events` on scr-dashboard-light removed
- − `GET /jobs` on scr-dashboard-dark removed
- − `POST /specs/publish` on scr-dashboard-dark removed
- − `GET /parity` on scr-dashboard-dark removed
- − `GET /links` on scr-dashboard-dark removed
- − `GET /events` on scr-dashboard-dark removed
- − `GET /specs/{id}` on scr-spec-detail removed
- ~ Front ⇄ back links: +38 −66

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
