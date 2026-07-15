# TODO.md — POgrid.id Build Backlog

> Derived from locked decisions in `MAIN-IDEA.md`.
> Work top-to-bottom. Do not skip priorities.
> Update status as work progresses: `[ ]` → `[x]`

---

## 🔴 PRIORITY 1 — Core Logic Fixes (Break existing wrong behavior)

These are regressions from the locked vision. Must be fixed before any new feature.

### 1.1 — Remove Auto-Injection from ItemObserver

**File**: `app/Observers/ItemObserver.php`
**What**: Delete the entire `creating()` hook body (the auto-inject logic).
**Keep**: The `created()` hook (creates ItemProgress rows from admin's selection).
**Also**: Remove warm-start 33%/50% from `created()` — all stages start at 0% / PENDING.

```
Before: Admin picks [Machining] → system injects [Material, Design, Machining, QC, Delivery]
After:  Admin picks [Machining] → exactly [Machining] created
```

- [x] Delete `creating()` auto-injection logic in `ItemObserver`
- [x] Remove Material 33% / Design 50% warm-start in `created()`
- [x] Run tests: `php artisan test --testsuite=Feature`
- [x] Run `graphify update /home/tito/pogrid`

---

### 1.2 — Progress Input: Additive Delta (not replace)

**File**: `app/Http/Controllers/WorkerDashboardController.php` → `updateProgress()`
**What**: Change `completed_qty = input` to `completed_qty += input` (additive).
**Cap**: Result must never exceed `target_qty`.
**Both paths**: The qty>1 path AND the custom stage (Design/Material) path.

```
Before: CNC inputs 2 → completed_qty = 2. Milling inputs 1 → completed_qty = 1.
After:  CNC inputs 2 → completed_qty = 2. Milling inputs 1 → completed_qty = 3.
```

- [x] Change qty>1 path: `$completedQty = min($item->target_qty, $progress->completed_qty + $request->completed_qty)`
- [x] Change custom stage path: accumulate `progress_percent` additively (or recalculate from additive qty)
- [x] Verify `cancel-last-update` still works correctly with additive model
- [x] Test: CNC+Milling same stage, multi-update, cancel

---

### 1.3 — QC Gate: Generic Preceding-Stages Check

**File**: `app/Http/Controllers/WorkerDashboardController.php` → `validateStageAccess()`
**What**: Replace hardcoded Machining+Fabrication keyword check with generic "all preceding stages must be COMPLETED".

```php
// Replace old hardcoded block with:
$precedingStages = ItemProgress::where('item_id', $item->id)
    ->where('stage_name', 'not like', '%QC%')
    ->where('stage_name', 'not like', '%qc%')
    ->where('stage_name', 'not like', '%rework%')
    ->where('stage_name', 'not like', '%REWORK%')
    ->get();

foreach ($precedingStages as $stage) {
    if ($stage->status !== 'COMPLETED') {
        abort(403, "Stage locked: QC requires all preceding stages to be COMPLETED first. ({$stage->stage_name} is not done yet)");
    }
}
```

- [x] Replace QC gate logic in `validateStageAccess()`
- [x] Test: Surface Treatment → QC flow (new stage type)
- [x] Test: Material → Machining → QC flow (existing)
- [x] Test: QC REWORK is excluded from gate check

---

### 1.4 — Stage-to-Role Map: Config Array (replace hardcoded if-else)

**File**: `app/Http/Controllers/WorkerDashboardController.php` → `validateStageAccess()`
**What**: Replace the 7-branch if-elseif chain with a loop over a config map.

```php
// New map (extract to config or service)
const STAGE_ROLE_MAP = [
    'DRAFTER'     => ['design','gambar','drawing','draft','cad','sketsa'],
    'PURCHASING'  => ['material','bahan','purchasing','procurement','vendor','logistik','gudang'],
    'MACHINING'   => ['machining','cnc','milling','frais','turning','bubut',
                      'drilling','bor','grinding','gerinda','slotting','edm'],
    'FABRICATION' => ['fabrication','fabrikasi','welding','las','cutting',
                      'potong','bending','tekuk','rolling','stamping'],
    'ASSEMBLY'    => ['assembly','perakitan','rakit','fitting','fitter','erection'],
    'SURFACE'     => ['surface','heat treatment','powder coating','painting','cat',
                      'galvanizing','galvanis','plating','anodizing','sandblasting',
                      'electroplating','finishing','coating'],
    'QC'          => ['qc','quality control','inspeksi','qa','metrologi'],
    'DELIVERY'    => ['delivery','pengiriman','kirim','ekspedisi'],
    'MAINTENANCE' => ['maintenance','perawatan','repair','perbaikan'],
];
// PRODUCTION = catch-all if no keyword matches
```

- [x] Extract STAGE_ROLE_MAP to `app/Services/StageRoleMap.php` or `config/pogrid.php`
- [x] Rewrite role-check block in `validateStageAccess()` to loop over map
- [x] PRODUCTION role = passes if no other role matches the stage keyword
- [x] Office users still bypass all checks (unchanged)
- [x] Test: all existing roles still work
- [x] Test: SURFACE role can update `Surface Treatment` stage
- [x] Test: ASSEMBLY role can update `Assembly` stage
- [x] Test: PRODUCTION role can update unknown custom stages

---

### 1.5 — PO Status: Add DELIVERED and CLOSED

**Migration**: new migration file
**Files**: `DoItemObserver.php`, `OwnerDashboardController.php` (Finance action)

```sql
-- PO statuses: PENDING, IN_PROGRESS, COMPLETED, DELIVERED, CLOSED
```

- [x] Create migration: alter `pos.status` to support DELIVERED + CLOSED
- [x] `ItemProgressObserver`: when all items COMPLETED → PO = COMPLETED (not DELIVERED)
- [x] `DoItemObserver`: when all items fully delivered → PO = DELIVERED (was: COMPLETED)
- [x] Finance action: when all items `payment_status = PAID` → PO = CLOSED
- [x] Update all status checks in controllers and frontend components
- [x] Update Owner Dashboard status badge labels

---

### 1.6 — item.delivery_status Field

**Migration**: new field on items table
**File**: `DoItemObserver.php`

```sql
ALTER TABLE items ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'PENDING';
-- Values: PENDING | PARTIAL | DELIVERED
```

- [x] Create migration: add `delivery_status` to items
- [x] `DoItemObserver::saved()`: recalculate and store `delivery_status`
  - `PENDING` = delivered_qty = 0
  - `PARTIAL` = 0 < delivered_qty < target_qty
  - `DELIVERED` = delivered_qty >= target_qty
- [x] Add `delivery_status` to `Item::$fillable`
- [x] Update Owner Dashboard to show delivery_status badge per item
- [x] Update Finance dashboard to show delivery_status

---

### 1.7 — Delivery: Additive Running Total (not replace)

**File**: `WorkerDashboardController.php` → `updateProgress()` (Delivery stage block)
**What**: DoItem.delivered_qty should ADD each update, not overwrite.

```php
// Before:
DoItem::updateOrCreate([...], ['delivered_qty' => $deliveredQty]);

// After:
$existing = DoItem::where('delivery_order_id', $deliveryOrder->id)
    ->where('item_id', $item->id)->first();
$newTotal = min($item->target_qty, ($existing->delivered_qty ?? 0) + $deliveredQty);
DoItem::updateOrCreate([...], ['delivered_qty' => $newTotal]);
```

- [x] Change Delivery stage update to additive DoItem.delivered_qty
- [x] Cap at target_qty
- [x] Test: deliver 3 pcs → deliver 2 more → total = 5, not 2
- [x] Test: DoItemObserver fires correctly after additive update

---

## 🔴 PRIORITY 2 — Database: New Roles, Posts, Invoice Fields

### 2.1 — Expand Roles Table

**Migration**: new migration

New roles to add:
- `ASSEMBLY` (floor) — Assembly, Perakitan
- `SURFACE` (floor) — Surface Treatment, Powder Coating, Painting, etc.
- `PPIC` (floor/hybrid) — Production Planning
- `MAINTENANCE` (floor) — Maintenance read-only
- `SALES` (office) — Sales role separate from STAFF
- `SUPERVISOR` (office) — Supervisor
- `MANAGER` (office) — Manager
- `DIRECTOR` (office) — Director level

- [x] Create migration: insert new roles
- [x] Update `DatabaseSeeder.php` with new roles
- [x] Update `WorkerAuthController` privilege-escalation check (office level roles)

---

### 2.2 — Expand Posts Table

**Migration**: new migration or extend existing seeder

New posts to add (see MAIN-IDEA.md §22 for full list):

**Engineering**: CAD_DRAFTER, DESIGN_ENGINEER, PRODUCT_ENGINEER, MANUFACTURING_ENGINEER
**Purchasing**: PROCUREMENT, LOGISTIK, GUDANG, INVENTORY
**Machining**: MILLING, TURNING, DRILLING, GRINDING, EDM, SLOTTING
**Fabrication**: FITTER, CUTTING, BENDING, ROLLING
**Assembly**: ASSEMBLY, MECHANICAL_FITTER
**Surface**: HEAT_TREATMENT, POWDER_COATING, PAINTING, GALVANIZING, PLATING, SANDBLASTING
**QC**: QC_INSPECTOR, QA_ENGINEER, METROLOGI
**Delivery**: DRIVER, EKSPEDISI, KURIR
**Finance**: ACCOUNTING, KASIR, BILLING
**Office**: CUSTOMER_SERVICE, SUPERVISOR, FOREMAN, DIRECTOR, PPIC, MAINTENANCE

- [x] Create migration: insert all new posts
- [x] Update `DatabaseSeeder.php`
- [x] Update CreatePo and User Management forms to show new options

---

### 2.3 — Invoice Fields on Items Table

**Migration**: alter items table

```sql
ALTER TABLE items MODIFY invoice_status ENUM('UNINVOICED','PARTIAL','INVOICED') DEFAULT 'UNINVOICED';
ALTER TABLE items MODIFY payment_status ENUM('UNPAID','PARTIAL_PAID','PAID') DEFAULT 'UNPAID';
ALTER TABLE items ADD COLUMN invoiced_qty INTEGER DEFAULT 0;
```

- [x] Create migration for new invoice_status values + invoiced_qty field
- [x] Update Finance `updateFinanceStatus()` controller to accept PARTIAL + invoiced_qty
- [x] Update item `$fillable` and `$casts`
- [x] Update Finance dashboard: show PARTIAL invoice badge
- [x] Update Owner Dashboard: show PARTIAL invoice in item row

---

## 🟡 PRIORITY 3 — Worker Dashboard Overhaul

### 3.1 — Cross-Role Read-Only Visibility

**File**: `WorkerDashboardController.php` → `index()` (floor section)
**What**: Remove `whereHas` stage filter. ALL active items shown to ALL floor workers.
Stage update controls only shown for the worker's matching role.

- [ ] Remove `whereHas` role-based item filter from Worker Dashboard query
- [ ] All active items (not COMPLETED/CANCELLED/TERMINATED) shown to all floor workers
- [ ] Finance filter unchanged (they see active + completed-but-unpaid)
- [ ] Frontend: stage update controls appear only for matched role's stage
- [ ] Frontend: other stages shown as read-only status cards
- [ ] Test: Fabrication worker sees Machining items but cannot update Machining stage

---

### 3.2 — Stage Template Picker in CreatePo

**File**: `resources/js/Pages/Owner/CreatePo.tsx`
**What**: Add template picker before the stage checkbox list.

Templates (9 total — see MAIN-IDEA.md §21):
1. CNC Workshop
2. Fabrication Workshop
3. Engineering Workshop
4. CNC + Design
5. Assembly Workshop
6. Full Engineering
7. With Finishing (adds Surface Treatment)
8. Procurement Only
9. Service / Design Only
10. Custom (blank)

- [ ] Add template dropdown/card picker to CreatePo form
- [ ] Selecting a template pre-fills the stage checkbox list
- [ ] Admin can add/remove stages after template selection
- [ ] Stage names must match STAGE_ROLE_MAP keywords for auto-role-assignment to work
- [ ] Add free-text custom stage input (for Heat Treatment, Powder Coating, etc.)

---

### 3.3 — Archive Tab (Role-Filtered)

**New page**: `resources/js/Pages/Worker/Archive.tsx` (or tab in Dashboard)
**New route**: `GET /c/{slug}/archive`
**New controller method**: `WorkerDashboardController::archive()`

Archive query per role:
- DRAFTER → items where Design stage = COMPLETED
- PURCHASING → items where Material stage = COMPLETED
- MACHINING → items where Machining/CNC stage = COMPLETED
- FABRICATION → items where Fabrication stage = COMPLETED
- ASSEMBLY → items where Assembly stage = COMPLETED
- SURFACE → items where Surface stage = COMPLETED
- QC → items where QC stage = COMPLETED
- DELIVERY → items where delivery_status = DELIVERED
- FINANCE → items where payment_status = PAID
- PRODUCTION → items where any non-QC stage = COMPLETED (their generic)
- STAFF/MANAGER/SUPERVISOR/DIRECTOR → POs where status = CLOSED or DELIVERED

- [ ] Add `GET /c/{slug}/archive` route in `routes/web.php`
- [ ] Implement `archive()` method in `WorkerDashboardController`
- [ ] Build `Archive.tsx` page (read-only cards, date filter, search by item/PO/client)
- [ ] Add Archive nav link in Worker Dashboard header
- [ ] Add Archive nav link in Owner Dashboard tabs

---

## 🟡 PRIORITY 4 — Finance & Invoice UI

### 4.1 — Partial Invoice UI

**File**: `resources/js/Pages/Worker/Dashboard.tsx` (Finance role view)
**What**: Finance card shows invoice options: Full PO or Partial (by delivered qty).

- [ ] Show `delivery_status` and `delivered_qty` on Finance item cards
- [ ] Add "Invoice Full" and "Invoice Partial" options
- [ ] Partial invoice: input `invoiced_qty` (max = delivered_qty)
- [ ] Show PARTIAL badge when invoiced_qty < delivered_qty
- [ ] Update `updateFinanceStatus()` to accept `invoiced_qty` + set PARTIAL status
- [ ] Update Owner Dashboard: PARTIAL invoice badge visible in item directory

---

### 4.2 — Finance Gate Update (Partial-aware)

**File**: `WorkerDashboardController.php` → `updateFinanceStatus()`
**What**: Gate = at least one piece delivered. Partial invoice allowed any time after first delivery.

- [ ] Gate: `delivery_status != PENDING` (not just completed_qty > 0)
- [ ] Allow Finance to update even if delivery is PARTIAL
- [ ] invoice_status = PARTIAL if `invoiced_qty < delivered_qty`
- [ ] invoice_status = INVOICED if `invoiced_qty >= delivered_qty`

---

## 🟢 PRIORITY 5 — Owner Dashboard Enhancements

### 5.1 — User Management UI (NEXT_BUILD.md Task 1)

Already spec'd in `NEXT_BUILD.md`. Backend routes + controller exist.

- [x] User list section in Owner Dashboard (Task 1a)
- [x] Edit User modal (Task 1b)
- [x] Delete User flow (Task 1c)
- [x] PIN Reset approval button (Task 1d)
- [x] New roles/posts appear in role/post dropdowns

---

### 5.2 — PO Status Badges Update

**File**: Owner Dashboard + Worker Dashboard
**What**: New PO statuses: DELIVERED, CLOSED.

- [x] Add DELIVERED badge (blue/teal) to PO status display
- [x] Add CLOSED badge (gray/muted) to PO status display
- [x] Update Owner Dashboard PO filter pills
- [x] Update NEXT_TODO.md status badge mappings

---

### 5.3 — Item Delivery & Invoice Status in Directory

**File**: `resources/js/Pages/Owner/Dashboard.tsx`
**What**: Add delivery_status + invoice_status columns to item rows.

- [x] Show `delivery_status` pill (PENDING / PARTIAL / DELIVERED) per item
- [x] Show `invoice_status` pill (UNINVOICED / PARTIAL / INVOICED) per item
- [x] Show `payment_status` pill (UNPAID / PARTIAL_PAID / PAID) per item
- [x] Clickable pills filter the directory (same as existing drilldown pattern)

---

## 🟢 PRIORITY 6 — Testing & Stability

### 6.1 — Update CoreLogicTest.php

**File**: `tests/Feature/CoreLogicTest.php`

- [ ] Test: additive progress (CNC + Milling on same stage)
- [ ] Test: QC generic gate (Surface Treatment → QC flow)
- [ ] Test: delivery additive total
- [ ] Test: PO → COMPLETED → DELIVERED → CLOSED lifecycle
- [ ] Test: item.delivery_status transitions
- [ ] Test: invoice PARTIAL state
- [ ] Test: SURFACE role can update Surface Treatment stage
- [ ] Test: ASSEMBLY role can update Assembly stage
- [ ] Test: no auto-injection when item created

### 6.2 — Update AdminManagementTest.php

- [ ] Test: new roles (ASSEMBLY, SURFACE, PPIC, MAINTENANCE) create correctly
- [ ] Test: archive query returns correct items per role

---

## 🟢 PRIORITY 7 — Performance

### 7.1 — Eager Loading Optimization

**File**: `WorkerDashboardController.php` → `getTelemetryData()`
**What**: N+1 queries in `buildClientHealth()` and bottleneck analyzer.

- [x] Eager load items + doItems in `buildClientHealth()`
- [x] Add composite index migration if missing: `items(tenant_id, status, invoice_status, payment_status)`
- [x] Profile query count before/after: verified no regression via PerformanceMatrixTest

---

## 🔵 BACKLOG — Future Features

- [ ] **Pusher live toast**: bind React to Pusher channel for real-time Kendala alerts on Owner Dashboard
- [ ] **Alert escalation**: auto-notify (log) if RED alert unresolved > 24 hours
- [ ] **Worker self-KPI tab**: "My Completed Tasks" sub-tab with cycle times
- [ ] **CSV/Excel export**: "Export to Excel" on Matrix tab
- [ ] **Rework analytics**: "Rework Logbook" — 6-month rework trend per client/item/stage
- [ ] **Tenant stage templates**: save custom templates per tenant for re-use
- [ ] **Repeat order shortcut**: clone previous PO stages for same client/item
- [ ] **PPIC dashboard**: production planning view (backlog, capacity, scheduling)
- [ ] **Multi-language posts**: posts have EN + ID display names

---

## Commands Reference

```bash
# Run tests
php artisan test --testsuite=Feature

# Backfill existing items (after removing auto-injection)
php artisan pogrid:backfill-stages

# Update knowledge graph after changes
graphify update /home/tito/pogrid

# Format PHP
vendor/bin/pint

# Dev server
composer dev        # PHP services
npm run dev         # Vite (separate terminal)
```

---

*Last updated: 2026-07-15*
*Cross-reference: `MAIN-IDEA.md` for all decisions, `NEXT_BUILD.md` for immediate task specs.*
