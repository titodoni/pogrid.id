# Next Build — pogrid

## Task 1: User Management Card (Owner Dashboard)

**Problem**: `users` prop fetched at `WorkerDashboardController.php:71`, passed to `Owner/Dashboard.tsx:380` but never rendered. Routes exist: `POST /users/{id}/update` (OwnerDashboardController:217), `POST /users/{id}/delete` (OwnerDashboardController:284). Missing UI to manage users.

**Scope**: resources/js/Pages/Owner/Dashboard.tsx, app/Http/Controllers/OwnerDashboardController.php (backend validation)

**Deliverables**:

### 1a. User List Section
- Add user list below existing KPIs in Owner Dashboard
- Table/cards showing: name, role, login method (PIN/PASSWORD), status
- Only visible to non-OWNER roles (OWNER uses existing Add Admin modal)
- Sort/filter by role

### 1b. Edit User Modal
- Click user row/card opens edit modal
- Fields: name, role (dropdown), username (if PASSWORD), password (optional), PIN (if PIN method)
- Toggle login_method between PASSWORD and PIN
- Submit to `POST /users/{userId}/update`
- Validation: `OwnerDashboardController.php:236-259`

### 1c. Delete User
- Delete button in edit modal or row
- Confirmation dialog
- Submit to `POST /users/{userId}/delete`
- Block self-delete (already in controller at line 288)

### 1d. Admin PIN Reset
- Button in user card to reset PIN
- Submit to `POST /pin-reset/{alertId}/approve` flow or direct PIN change via updateUser

### 1e. Backend Validation Fix (DONE)
- `OwnerDashboardController.php:232-234`: removed `Rule::in(['ADMIN'])` from `updateUser` — OWNER can now update any user
- `OwnerDashboardController.php:155`: added PURCHASING/FINANCE/CNC to PIN auto-assignment

---

## Task 2: Worker Dashboard Cleanup

**Problem**: Stage pills removed from expanded card drawer. Need to verify auto-selection works correctly for all roles.

**Scope**: resources/js/Pages/Worker/Dashboard.tsx

**Deliverables**:

### 2a. Verify Auto-Selection
- `getMatchingStageOrMock()` (line 337) auto-selects stage by role
- Verify each floor role sees correct stage controls:
  - PURCHASING → Material (Order/Process/Complete buttons)
  - DRAFTER → Design (Drafting/Approved buttons)
  - MACHINING/CNC → Machining (qty-based progress)
  - FABRICATION → Fabrication (qty-based progress)
  - QC → QC (rework controls)
  - DELIVERY → Delivery (qty-based)
  - FINANCE → Finance virtual stage (invoice/payment toggle)

### 2b. Finance Stage
- Virtual stage `{ id: -item.id, stage_name: 'Finance' }` pushed at line 726
- After pill removal, verify Finance still reachable via auto-select for FINANCE role
- Check `selectStage` function (line 429) still accessible — currently only called from pills which are removed

### 2c. Edge: No Matching Stage
- If user has no matching stage (e.g., WORKER role), expanded card shows nothing
- Consider showing generic progress or message

---

## Task 3: End-to-End Stage Flow Test

**Problem**: New stage ordering (Material→Design→Production→QC→Delivery) and initial values (Material 33%, Design 50%) may break dependency locks.

**Scope**: tests/Feature/CoreLogicTest.php, app/Http/Controllers/WorkerDashboardController.php

**Deliverables**:

### 3a. Test Full Chain
```
DRAFTER: Design (50%→100%→Approved)
PURCHASING: Material (33%→66%→100%→Complete)
MACHINING: Machining (qty-based progress)
QC: QC inspection
DELIVERY: Delivery
FINANCE: Invoice/Payment
```

### 3b. Verify Dependency Locks
- `WorkerDashboardController.php:902-928`: Machining/Fabrication requires Design + Material COMPLETED first
- `WorkerDashboardController.php:931-951`: QC requires Machining or Fabrication COMPLETED
- `WorkerDashboardController.php:953-961`: Delivery requires QC has completed quantities
- `WorkerDashboardController.php:818`: Finance requires Delivery completed

### 3c. Test cancelLastUpdate on Custom Stages
- `POST /c/{slug}/progress/{progressId}/cancel-last-update`
- Verify revert works for Design and Material stages

### 3d. Test Off-State Locks
- Vendor job locks: production stages blocked when Vendor checked
- Machining-only vs Fabrication-only lockouts

---

## Task 4: Polish & Edge Cases

**Scope**: Multiple files

### 4a. drafter_status / purchasing_status UI
- `app/Models/Item.php:28-29`: `$fillable` includes `purchasing_status`, `drafter_status`
- No frontend UI to set these
- `routes/web.php:75-76`: routes exist for `POST /items/{itemId}/drafter-status` and `purchasing-status`
- `WorkerDashboardController.php:754-791`: controller methods exist
- Frontend buttons in `Dashboard.tsx` worker card (purchasing_status: Order/Proses/Ready buttons at ~line 889)

### 4b. Finance Queue Filter
- `WorkerDashboardController.php:84-94`: Finance sees non-completed + completed-but-unpaid/uninvoiced items
- Verify filter SQL correct

### 4c. PIN Reset from Admin
- `PinResetController.php:60-86`: approve flow exists
- No admin UI to approve pending PIN resets
- Add approval button in alerts list or user card

---

## Commands

```bash
# Run tests after each task
docker run --rm -v "$(pwd):/app" -w /app php-node php artisan test --testsuite=Feature

# Backfill existing items with new stages (run once after Task 1 deployment)
docker run --rm -v "$(pwd):/app" -w /app php-node php artisan pogrid:backfill-stages

# Update graphify knowledge graph after changes
graphify update /home/tito/pogrid
```
