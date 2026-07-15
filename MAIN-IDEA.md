# MAIN-IDEA.md — POgrid.id Canonical Knowledge Base

> **Read this first.** Single source of truth for all AI agents and contributors.
> Load at the start of every session before touching any code.
> Cross-reference: `PRD.md` (product spec), `TODO.md` (build backlog).
> Last updated: 2026-07-12 — All 17 decisions locked.

---

## 1. The Soul

**POgrid.id** answers one question:
> *"Where is my order right now, and will it be on time?"*

It is a **Live Progress & Delivery Punctuality Tracker** for Indonesian SME manufacturing workshops.
It is **NOT** an ERP, MES, inventory system, or accounting tool.

**Core paradigm**: Item-Centric, Zero-Block, Asynchronous Progress Tracking.

---

## 2. Tech Stack

Laravel 11 · React 18 + TypeScript · Inertia.js v2 · Tailwind CSS v4 · PostgreSQL (Neon) · Pusher

Key quirks:
- No `tsconfig.json` — Vite compiles TS directly
- No `tailwind.config.js` — config via `@import "tailwindcss"` in `app.css`, Tailwind runs via `@tailwindcss/vite`
- No API routes — all routes in `routes/web.php`, controllers return Inertia
- No persistent daemons — queue via `queue:work --stop-when-empty` cron every 1 min
- Design system: Astryx (`@astryxdesign/core`), imported in `app.tsx`
- Dual language: EN/ID via `translations` object per component + `localStorage('pogrid_lang')`
- Alias `@/` → `resources/js`

---

## 3. Multi-Tenancy & Auth

- **Row-level tenancy**: `TenantScope` on all operational models by `tenant_id`
- **TenantManager singleton**: manages `tenant_id` for request lifecycle
  - `TenantManager::bypass()` before global/admin queries → `TenantManager::enableScope()` after
- **No subdomains**: all tenants at `app.pogrid.id/c/{slug}`
- **Guard A** (Office): email/username + password → `/login`
- **Guard B** (Floor): select name + PIN numpad → `/c/{slug}`
- Office roles blocked from PIN login (privilege escalation protection in `WorkerAuthController`)

---

## 4. The Two User Worlds

### World A — Office (Guard A)

| Role | Level | Key Behavior |
|---|---|---|
| Owner (`is_owner=true`) | office | KPI dashboard, alerts, client health. **Cannot create POs (403).** |
| Admin | office | Creates POs, manages users, approves PIN resets |
| Manager | office | Full dashboard, floor oversight |
| Supervisor | office | Floor oversight, read-heavy |
| Sales | office | Client-facing PO status |
| Director | office | Owner-level view |

### World B — Floor (Guard B)

**ROLE** = permission engine (stage access + dashboard type).
**POST** = job title label only (cosmetic, shown in greeting). Does NOT enforce access.

| Role | Stage Keywords They Can Update |
|---|---|
| `DRAFTER` | design, gambar, drawing, draft, cad |
| `PURCHASING` | material, bahan, purchasing, procurement, vendor, logistik, gudang |
| `MACHINING` | machining, cnc, milling, frais, turning, bubut, drilling, bor, grinding, gerinda, slotting, edm |
| `FABRICATION` | fabrication, fabrikasi, welding, las, cutting, potong, bending, tekuk, rolling, stamping |
| `ASSEMBLY` | assembly, perakitan, rakit, fitting, fitter, erection, instalasi |
| `SURFACE` | surface, heat treatment, powder coating, painting, cat, galvanizing, plating, anodizing, sandblasting, electroplating, finishing, coating |
| `QC` | qc, quality control, inspeksi, qa, metrologi |
| `DELIVERY` | delivery, pengiriman, kirim, ekspedisi |
| `FINANCE` | (not a stage — updates invoice_status + payment_status fields) |
| `PRODUCTION` | catch-all: any stage not matched by roles above |
| `MAINTENANCE` | read-only floor view, no stage updates |
| `PPIC` | production planning, hybrid floor/office view |

---

## 5. Domain Model

```
Tenant
└── PO
    ├── po_number, client_name, global_deadline
    ├── status: PENDING | IN_PROGRESS | COMPLETED | DELIVERED | CLOSED | CANCELLED
    └── Items[]
        ├── item_name, target_qty
        ├── item_type: MANUFACTURE | BUY_OUT | SERVICE
        ├── required_stages: ["Design","Material","Machining","QC"]  ← admin-selected
        ├── progress_percent  ← flat-stored, updated by observer
        ├── status: PENDING | IN_PROGRESS | COMPLETED | CANCELLED | TERMINATED
        ├── delivery_status: PENDING | PARTIAL | DELIVERED
        ├── invoice_status: UNINVOICED | PARTIAL | INVOICED
        ├── invoiced_qty
        ├── payment_status: UNPAID | PARTIAL_PAID | PAID
        ├── drafter_status: DRAWING | APPROVED | null
        ├── purchasing_status: ORDER | PROSES | READY | null
        └── ItemProgress[]  ← one row per stage
            ├── stage_name
            ├── completed_qty (running total, additive)
            ├── progress_percent
            ├── previous_completed_qty  ← snapshot for 1-level undo
            ├── previous_progress_percent
            └── status: PENDING | IN_PROGRESS | COMPLETED | STUCK
```

---

## 6. Observer Chain (The Hidden Control Flow)

Business logic lives in Eloquent observers, not controllers.

```
Item::created
  → creates ItemProgress rows (one per admin-selected stage)
  → ALL start at 0% / PENDING  [NO auto-injection, NO warm-starts]

ItemProgress::saved  (fires on every progress write)
  → recalculate item.progress_percent (formula by qty type — see §7)
  → if progress = 100% → item.status = COMPLETED
  → if any item IN_PROGRESS and PO = PENDING → PO = IN_PROGRESS
  → if all items COMPLETED and PO = IN_PROGRESS → PO = COMPLETED

DoItem::saved  (fires when Delivery logs delivery)
  → recalculate item.delivery_status (PENDING|PARTIAL|DELIVERED)
  → if all non-cancelled items DELIVERED → PO.status = DELIVERED

Finance action  (manual, WorkerDashboardController, no observer)
  → Finance sets invoice_status, invoiced_qty, payment_status
  → When all non-cancelled items payment_status = PAID → PO.status = CLOSED
```

**Who does what — controller vs observer:**

| Responsibility | Owner |
|---|---|
| ItemProgress row creation | `ItemObserver::created()` |
| Item progress% recalculation | `ItemProgressObserver::saved()` |
| Item status update | `ItemProgressObserver::saved()` |
| PO → IN_PROGRESS / COMPLETED | `ItemProgressObserver::saved()` |
| PO → DELIVERED | `DoItemObserver::saved()` |
| PO → CLOSED | Finance controller action |
| delivery_status update | `DoItemObserver::saved()` |
| DO + DoItem creation | `WorkerDashboardController::updateProgress()` inline |
| drafter_status sync | `WorkerDashboardController::updateProgress()` inline |
| purchasing_status sync | `WorkerDashboardController::updateProgress()` inline |
| Pusher broadcast (Kendala) | `WorkerDashboardController::reportKendala()` |
| Pusher broadcast (Terminate) | `OwnerDashboardController::terminateMidway()` |
| Timeline alerts | `EvaluateTimelines` cron |

---

## 7. Progress System (Locked)

### 7.1 Input Model: Additive Delta

Workers input **"how many pieces I finished THIS session"** (a delta, not an absolute total).

```
System: completed_qty += input_delta
Cap:    completed_qty cannot exceed target_qty
Undo:   Cancel Last Update → reverts to previous snapshot (one level only)
```

Multi-operator example (CNC + Milling on same Machining stage):
```
CNC logs +2  → completed_qty = 2  (prev snapshot: 0)
Milling logs +1 → completed_qty = 3  (prev snapshot: 2)
Cancel Last Update → completed_qty = 2  (entire last write reverted)
```

### 7.2 Progress Formulas

Calculated by `ItemProgressObserver::saved()`. Result flat-stored on item.

**For Target_Qty > 1 (multi-piece):**
```
Item Progress (%) = Σ(completed_qty across ALL stages) / (target_qty × total_stage_count) × 100
```

**For Target_Qty == 1 (single piece):**
```
Item Progress (%) = Σ(progress_percent across ALL stages) / total_stage_count
```

`total_stage_count` = `count($item->required_stages)` — admin-selected only.
Rework sub-stages add to numerator but NOT denominator (they make item harder to complete).

### 7.3 Two Completion Levels

**Item Level (production complete):**
- `item.progress_percent = 100%` when all stages done
- QC is typically the last production stage → item COMPLETE when QC done
- Delivery and Finance do NOT affect `item.progress_percent`
- Triggers: `item.status = COMPLETED`

**PO Level (lifecycle):**
```
PENDING     → created, no work started
IN_PROGRESS → any item started production
COMPLETED   → all items production-complete (ItemProgressObserver)
DELIVERED   → all items physically delivered (DoItemObserver)
CLOSED      → all items PAID (Finance action)
CANCELLED   → cancelled by admin (only if no items started)
```

---

## 8. Stage System (Locked)

### 8.1 Zero Auto-Injection

`ItemObserver::creating()` does **nothing** — no forced stages.
Admin selects exactly the stages their factory needs.
`ItemObserver::created()` creates ItemProgress rows from whatever admin selected.
All stages start at 0% / PENDING (no warm-starts).

### 8.2 Stage Templates (Curated)

| Template | Stages |
|---|---|
| CNC Workshop | Material → Machining → QC |
| Fabrication Workshop | Material → Fabrication → QC |
| Engineering Workshop | Design → Material → Machining → Fabrication → QC |
| CNC + Design | Design → Material → Machining → QC |
| Assembly Workshop | Material → Machining → Assembly → QC |
| Full Engineering | Design → Material → Machining → Fabrication → Assembly → QC |
| With Finishing | …any above… → Surface Treatment → QC |
| Procurement Only | Material → QC |
| Service / Design | Design → QC |
| Custom | Admin builds from scratch |

Stage names must use recognized keywords for role-mapping to work.
Admin can add free-text specialty stages (e.g., `Heat Treatment`, `Powder Coating`) —
these are caught by SURFACE role keywords or fall back to PRODUCTION.

### 8.3 Stage Access Gate (`validateStageAccess`)

Called on every progress write. Two layers:

**Layer 1 — Role-to-Stage match (config-driven):**
```php
// STAGE_ROLE_MAP in app/Services/StageRoleMap.php (or config/pogrid.php)
// Loop through map, check if stage_name contains any keyword for that role
// If no match → PRODUCTION role required
// Office users → bypass all stage locks
```

**Layer 2 — QC dependency gate (generic):**
Before QC can be updated: **ALL non-QC, non-REWORK stages must be COMPLETED**.
Not hardcoded keywords — checks all preceding stages generically.
QC is optional — if not in stage list, no gate applies.

```php
// Correct implementation:
$precedingStages = ItemProgress::where('item_id', $item->id)
    ->where('stage_name', 'not like', '%QC%')
    ->where('stage_name', 'not like', '%qc%')
    ->where('stage_name', 'not like', '%rework%')
    ->get();

foreach ($precedingStages as $stage) {
    if ($stage->status !== 'COMPLETED') {
        abort(403, "QC locked: {$stage->stage_name} not completed yet.");
    }
}
```

### 8.4 Delivery Gate

Finance can update invoice only if `delivery_status != PENDING` (at least 1 piece delivered).

---

## 9. Delivery Tracking

- Delivery worker logs pieces sent out as **additive delta** per trip.
- `DoItem.delivered_qty` = running total (never replaced).
- One `DeliveryOrder` per PO, auto-created by system (`do_number = 'DO-{po_number}'`).
- No manual DO document entry required.

```
Slamet logs +3 → DoItem.delivered_qty = 3  (PARTIAL)
Slamet logs +2 → DoItem.delivered_qty = 5  (DELIVERED, DoItemObserver → PO = DELIVERED)
```

`item.delivery_status` transitions: PENDING → PARTIAL → DELIVERED (set by DoItemObserver).

---

## 10. Finance Tracking

Finance is **post-production** — separate from `item.progress_percent`.

```
item.invoice_status:  UNINVOICED → PARTIAL → INVOICED
item.payment_status:  UNPAID → PARTIAL_PAID → PAID
item.invoiced_qty:    number of pieces invoiced so far
```

**Default**: 1 invoice per PO after full delivery.
**Partial**: Finance decides situationally — can invoice for delivered qty only.
Finance gate: `delivery_status != PENDING` required before any invoice action.

Dashboard shows full story per item:
```
Gearbox × 10 pcs
  Production:  80%  (QC: 8/10 done)
  Delivery:    6/10 pcs  → PARTIAL
  Invoice:     3 pcs invoiced → PARTIAL
  Payment:     UNPAID
```

---

## 11. Alert System

| Severity | Trigger | Auto-resolve |
|---|---|---|
| 🔴 RED — Stuck | Worker clicks Lapor Kendala → `progress.status = STUCK` | Worker resumes logging on that stage |
| 🔴 RED — Overdue | `today > global_deadline` AND item not COMPLETED | Item reaches 100% or deadline extended |
| 🟡 YELLOW — Risk | `days_remaining ≤ 3` AND `progress < 70%` | Either condition clears |
| 🟡 YELLOW — Rework | QC logs `reject_qty > 0` | Manual resolve |
| 🔵 BLUE | PIN reset requested by worker | Admin approves |

`reason_type` stored as structured column on alerts (not parsed from message string).
Timeline alerts use `Alert::updateOrCreate` — no duplicate spam.
Cron: `php artisan pogrid:evaluate-timelines` every 1 min.

---

## 12. QC Rework Flow

1. QC logs `reject_qty` on QC stage.
2. `ItemProgress::firstOrCreate` spawns `"{stage} - REWORK"` sub-stage (0% / PENDING).
3. Original QC stage: `completed_qty -= reject_qty` (floor at 0).
4. YELLOW alert created (`reason_type = 'QC Rework'`).
5. If `item.status = COMPLETED` → forced back to `IN_PROGRESS`.
6. REWORK stages excluded from QC gate check.
7. REWORK stage contributes to numerator but not denominator → item harder to complete.

---

## 13. Sunk-Cost Cancel Protection

- **Item progress = 0%**: Cancel freely → `item.status = CANCELLED`.
- **Item progress > 0%**: Cancel disabled (HTTP 403).
- **Midway Termination** (`TERMINATE_MIDWAY`):
  - `item.status = TERMINATED`
  - Pusher broadcast → worker screen frozen
  - `completedPieces = round(Σ(completed_qty) / stage_count)` — conservative average
  - `GenerateSunkCostInvoiceJob::dispatch($itemId, $completedPieces)` queued

---

## 14. Cross-Role Visibility & Archive

### Floor Visibility
All floor workers see **all active items** (read-only for stages not matching their role).
Stage update controls only shown for worker's matched role stages.

### Archive Tab
Each role sees their own completed work (read-only):

| Role | Archive trigger |
|---|---|
| DRAFTER | Design stage = COMPLETED |
| PURCHASING | Material stage = COMPLETED |
| MACHINING | Machining/CNC stage = COMPLETED |
| FABRICATION | Fabrication stage = COMPLETED |
| ASSEMBLY | Assembly stage = COMPLETED |
| SURFACE | Surface stage = COMPLETED |
| QC | QC stage = COMPLETED |
| DELIVERY | `delivery_status = DELIVERED` |
| FINANCE | `payment_status = PAID` |
| PRODUCTION | Any matched stage = COMPLETED |
| Office (all) | `PO.status = CLOSED or DELIVERED` |

---

## 15. Roles & Posts (Complete Reference)

### Roles Table

**Floor level (PIN login):**

| name | display_name | Stage access |
|---|---|---|
| DRAFTER | Juru Gambar | Design stages |
| PURCHASING | Pengadaan | Material stages |
| MACHINING | Operator Mesin | CNC/Machining stages |
| FABRICATION | Operator Fabrikasi | Welding/Fabrication stages |
| ASSEMBLY | Operator Perakitan | Assembly stages |
| SURFACE | Finishing | Surface/Coating stages |
| QC | Inspektor QC | QC stages |
| DELIVERY | Pengiriman | Delivery stages |
| FINANCE | Keuangan | Invoice + payment fields |
| PRODUCTION | Pekerja Produksi | Catch-all any unmatched stage |
| MAINTENANCE | Teknisi | Read-only |
| PPIC | PPIC | Planning view |

**Office level (password login):**

| name | display_name |
|---|---|
| STAFF | Staf Kantor |
| SALES | Sales |
| SUPERVISOR | Supervisor |
| MANAGER | Manajer |
| DIRECTOR | Direktur |

### Posts Table (by department)

| Department | Posts |
|---|---|
| Engineering | CAD_DRAFTER, DESIGN_ENGINEER, PRODUCT_ENGINEER, MANUFACTURING_ENGINEER |
| Purchasing | PURCHASING, PROCUREMENT, LOGISTIK, GUDANG, INVENTORY |
| Machining | CNC, MILLING, TURNING, DRILLING, GRINDING, EDM, SLOTTING |
| Fabrication | WELDER, FITTER, CUTTING, BENDING, ROLLING, HELPER |
| Assembly | ASSEMBLY, MECHANICAL_FITTER |
| Surface | HEAT_TREATMENT, POWDER_COATING, PAINTING, GALVANIZING, PLATING, SANDBLASTING |
| QC | QC_INSPECTOR, QA_ENGINEER, METROLOGI |
| Delivery | DRIVER, EKSPEDISI, KURIR |
| Finance | FINANCE, ACCOUNTING, KASIR, BILLING |
| Office | ADMIN, SALES, MARKETING, CUSTOMER_SERVICE, SUPERVISOR, FOREMAN, MANAGER, DIRECTOR, PPIC, MAINTENANCE, OWNER |

### Example Org: PT. Stahlindo Engineering

```
OFFICE (password login)
  Sari Dewi        → role: STAFF (is_owner=true), post: OWNER
  Budi Santoso     → role: STAFF,   post: ADMIN
  Fitri Handayani  → role: SALES,   post: SALES
  Dimas            → role: MANAGER, post: MANAGER

FLOOR (PIN login at /c/teknik-mandiri)
  Arief Prasetyo   → role: DRAFTER,    post: CAD_DRAFTER
  Rina Wulandari   → role: PURCHASING, post: PURCHASING
  Hendra Gunawan   → role: MACHINING,  post: CNC
  Bambang S.       → role: MACHINING,  post: MILLING
  Joko Susilo      → role: FABRICATION,post: WELDER
  Agus Hermawan    → role: QC,         post: QC_INSPECTOR
  Slamet Riyadi    → role: DELIVERY,   post: DRIVER
  Dewi Sartika     → role: FINANCE,    post: FINANCE
```

---

## 16. Real-World Flow: PT. Stahlindo × PT. Tira Austinite

PO: Gearbox × 5 pcs + Tire Cutter × 5 pcs. Both MANUFACTURE, both Machining.
Admin selects template: **CNC Workshop** → stages: `Material → Machining → QC`.

**Progress math (Gearbox, 5 pcs, 3 stages → denominator = 5 × 3 = 15):**

| Event | Σ completed_qty | item % |
|---|---|---|
| PO created | 0 | 0% |
| Purchasing: Material READY | 5 | 33% |
| CNC: +2 pcs | 7 | 47% |
| Milling: +1 pc (additive!) | 8 | 53% |
| CNC: +2 more pcs | 10 | 67% |
| Machining: 5/5 done | 10 | 67% |
| QC: all 5 OK | 15 | **100% → item COMPLETED** |
| Delivery: 3 pcs sent | — | PARTIAL delivery |
| Delivery: 2 more sent | — | DELIVERED → PO = DELIVERED |
| Finance: invoices sent | — | INVOICED |
| Finance: client pays | — | PAID → PO = CLOSED |

---

## 17. Key Code Locations

| What | File |
|---|---|
| Stage auto-injection (REMOVED) | `app/Observers/ItemObserver.php` |
| Progress recalculation | `app/Observers/ItemProgressObserver.php` |
| PO delivery completion | `app/Observers/DoItemObserver.php` |
| Stage access gate | `WorkerDashboardController::validateStageAccess()` |
| Progress update (additive) | `WorkerDashboardController::updateProgress()` |
| QC rework | `WorkerDashboardController::logQcRework()` |
| Kendala reporting | `WorkerDashboardController::reportKendala()` |
| Finance update | `WorkerDashboardController::updateFinanceStatus()` |
| Timeline cron | `app/Console/Commands/EvaluateTimelines.php` |
| PIN reset request | `app/Http/Controllers/PinResetController.php` |
| Floor auth | `app/Http/Controllers/WorkerAuthController.php` |
| Tenant context | `app/Services/TenantManager.php` |
| Stage-role map (PLANNED) | `app/Services/StageRoleMap.php` |
| Routes | `routes/web.php` |

---

## 18. Locked Decisions Registry

| # | Decision | Status |
|---|---|---|
| D1 | Item 100% = all admin-selected stages done (QC typically last). PO CLOSED = all PAID. | ✅ LOCKED |
| D2 | Progress input = additive delta. Undo = cancel-last-update only. | ✅ LOCKED |
| D3 | Delivery = same DO, running total additive per trip. | ✅ LOCKED |
| D4 | Invoice = 1 per PO default, partial situational, Finance decides. | ✅ LOCKED |
| D5 | Zero auto-injection. Admin selects ALL stages. Templates aid selection. | ✅ LOCKED |
| D6 | Archive = role-specific completed work. Delivery→DELIVERED, Finance→PAID, others→stage COMPLETED. | ✅ LOCKED |
| D7 | QC stage is optional/skippable. | ✅ LOCKED |
| D8 | QC gate = ALL preceding stages must be COMPLETED (generic, not keyword). | ✅ LOCKED |
| D9 | ROLE = permission engine. POST = job title label only. | ✅ LOCKED |
| D10 | 12 floor roles + 5 office roles. 30+ posts. | ✅ LOCKED |
| D11 | Stage-to-role = STAGE_ROLE_MAP config array. PRODUCTION = catch-all. | ✅ LOCKED |
| D12 | 9 stage templates from Indonesian factory standards. | ✅ LOCKED |
| D13 | invoice_status: UNINVOICED/PARTIAL/INVOICED. payment_status: UNPAID/PARTIAL_PAID/PAID. | ✅ LOCKED |
| D14 | item.delivery_status field: PENDING/PARTIAL/DELIVERED. | ✅ LOCKED |
| D15 | PO statuses: PENDING/IN_PROGRESS/COMPLETED/DELIVERED/CLOSED/CANCELLED. | ✅ LOCKED |
| D16 | All floor workers see all active items (read-only for other roles). | ✅ LOCKED |
| D17 | Finance gated by delivery_status != PENDING. Partial invoice by invoiced_qty. | ✅ LOCKED |

---

## 19. Commands Reference

```bash
# Full setup
composer setup

# Dev (run separately)
composer dev        # PHP: server + queue + pail
npm run dev         # Vite HMR

# Tests
composer test       # config:clear + php artisan test

# Code format
vendor/bin/pint

# Knowledge graph
graphify update /home/tito/pogrid
graphify query "<question>"

# Cron commands (run by scheduler)
php artisan pogrid:evaluate-timelines
php artisan queue:work --stop-when-empty
```
