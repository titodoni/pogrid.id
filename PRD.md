# PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Project Name:** POgrid.id
**Version:** 4.0 (Vision-Locked Edition)
**Document Type:** Master Specification — Canonical Product Authority
**Last Updated:** 2026-07-12

---

## 1. PRODUCT SOUL — WHAT POGRID IS AND IS NOT

POgrid.id is **NOT** an ERP, MES, inventory management system, or accounting software.
It has **NO Bill of Materials, NO raw material stock tracking, NO warehouse management.**

The sole, absolute purpose of POgrid.id is to:
> **Eliminate the Owner's anxiety and instantly answer the client's ultimate question:**
> *"Where is my order right now, and will it be delivered on time?"*

It is a **Live Progress & Delivery Punctuality Tracker** for Indonesian SME manufacturing workshops — CNC shops, fabrication houses, full engineering workshops, and any combination thereof.

It translates chaotic floor realities into clean, real-time, undeniable data — visible on the Owner's dashboard and each worker's phone in seconds.

---

## 2. TECH STACK (LOCKED)

| Layer | Choice | Constraint |
|---|---|---|
| Backend | Laravel 11 (PHP 8.3) | Standard request/response |
| Frontend | React 18 + TypeScript | Strict type-safety |
| SSR Bridge | Inertia.js v2 | Zero-API SPA architecture |
| Styling | Tailwind CSS v4 | Token-driven, @tailwindcss/vite, no tailwind.config.js |
| Database | PostgreSQL (Neon.tech) | Row-level multi-tenancy via TenantScope |
| Real-time | Pusher + Laravel Echo | Free-tier WebSockets, no local daemons |
| Queue | Database driver + Cron | `queue:work --stop-when-empty` every 1 min |
| Hosting | Shared hosting (Hostinger) | **Zero persistent background processes** |
| Design system | Astryx (`@astryxdesign/core`) | CSS reset/base imported in app.tsx |

**No TypeScript compiler config** — Vite handles TS compilation directly.
**No PostCSS** — Tailwind v4 runs via `@tailwindcss/vite` plugin.

---

## 3. MULTI-TENANCY & ROUTING

- **Row-level tenancy**: `TenantScope` filters every operational model by `tenant_id`.
- **Zero subdomains**: All traffic through `app.pogrid.id`. No wildcard subdomains.
- **Guard A** (Office): Email/username + password → `/login`
- **Guard B** (Floor): Select name + PIN numpad → `/c/{slug}`
- Office roles blocked from PIN login (privilege escalation protection).
- Tenant identified by `slug` in the URL path.

---

## 4. TWO USER WORLDS

### World A — Office (Guard A, password login)

| Role | Level | Responsibilities |
|---|---|---|
| Owner (`is_owner=true`) | office | Bird's-eye KPI dashboard, alerts, client health. **Cannot create POs.** |
| Admin | office | Creates POs, manages users, approves PIN resets. |
| Manager | office | Floor oversight, bottleneck analysis, full dashboard. |
| Supervisor | office | Floor oversight, read-heavy. |
| Sales | office | Client-facing PO status and reporting. |
| Director | office | Same as Owner-level view. |

### World B — Floor (Guard B, PIN login)

| Role | Stage Access | Notes |
|---|---|---|
| DRAFTER | Design, Gambar, Drawing, Draft, CAD | Confirms drawings approved |
| PURCHASING | Material, Bahan, Procurement, Vendor, Logistik | Confirms material ready |
| MACHINING | Machining, CNC, Milling, Bubut, Frais, Turning, Drilling, Bor, Grinding, Gerinda, EDM | Additive qty input |
| FABRICATION | Fabrication, Fabrikasi, Welding, Las, Cutting, Potong, Bending, Tekuk, Rolling | Additive qty input |
| ASSEMBLY | Assembly, Perakitan, Rakit, Fitting, Erection | Additive qty input |
| SURFACE | Surface Treatment, Heat Treatment, Powder Coating, Painting, Galvanizing, Plating, Sandblasting | Finishing stages |
| QC | QC, Quality Control, Inspeksi, QA | OK/NG inspection, rework logging |
| DELIVERY | Delivery, Pengiriman, Kirim, Ekspedisi | Physical handoff tracking |
| FINANCE | (not a stage — updates invoice_status + payment_status) | Invoice + payment |
| PRODUCTION | Any stage not matched by above roles | Generic catch-all |
| MAINTENANCE | Read-only floor view | No stage updates |
| PPIC | Production planning view | Hybrid floor/office |

**POST** = job title label (cosmetic, shown in greeting). Does not affect permissions.
**ROLE** = the permission engine (what stages you can write, which dashboard you see).

Floor workers use phones with **44px+ touch targets**. UI must be mobile-first, large stepper buttons, no hover-only states.

---

## 5. CORE LOGIC — ITEM-CENTRIC, ZERO-BLOCK

### 5.1 Stage System

Stages are **fully admin-configurable per item** at PO creation time.
There is **zero auto-injection** — no system-imposed stages.
Admin selects exactly the stages their factory needs using a template or custom list.

**Stage templates** (curated from Indonesian factory standards):

| Template | Stages |
|---|---|
| CNC Workshop | Material → Machining → QC |
| Fabrication Workshop | Material → Fabrication → QC |
| Engineering Workshop | Design → Material → Machining → Fabrication → QC |
| CNC + Design | Design → Material → Machining → QC |
| Assembly Workshop | Material → Machining → Assembly → QC |
| Full Engineering | Design → Material → Machining → Fabrication → Assembly → QC |
| With Finishing | ...any above... → Surface Treatment → QC |
| Procurement Only | Material → QC |
| Service / Design | Design → QC |
| Custom | Admin builds from scratch |

**Stage names must use recognized keywords** so the role-mapping engine can assign the right role. Admin can also add free-text specialty stages (e.g., `Heat Treatment`, `Powder Coating`) — these are caught by the SURFACE role keyword map or fall back to PRODUCTION.

### 5.2 Progress Input: Additive Delta

- Worker inputs **how many pieces they finished THIS session** (a delta, not a total).
- System: `completed_qty += delta` (additive, never replace).
- Cap: result cannot exceed `target_qty`.
- **Undo**: `Cancel Last Update` reverts to the previous snapshot (one level only).
- **No negative input**. Mistakes corrected via Cancel Last Update.

Multiple operators on the same stage (e.g., CNC operator + Milling operator both on `Machining`):
- CNC logs +2 → total = 2
- Milling logs +1 → total = 3
- Last Cancel Last Update reverts the entire stage's last write regardless of who wrote it.

### 5.3 Progress Formulas

Calculated by `ItemProgressObserver::saved()` on every ItemProgress save.
Result is flat-stored on the item for fast queries.

**For Target_Qty > 1 (multi-piece):**
```
Item Progress (%) = Σ(completed_qty across all stages) / (target_qty × total_stage_count) × 100
```

**For Target_Qty == 1 (single piece):**
```
Item Progress (%) = Σ(progress_percent across all stages) / total_stage_count
```

`total_stage_count` = `count($item->required_stages)` — only admin-selected stages.
Rework sub-stages contribute to the numerator but NOT the denominator.

### 5.4 Two Completion Levels

**Item Level — production complete:**
- `item.progress_percent = 100%` when all admin-selected stages reach their respective 100%.
- QC is typically the last production stage → item COMPLETE when QC done.
- Delivery and Finance are NOT production stages — they do not affect `item.progress_percent`.
- `item.status = COMPLETED`

**PO Level — lifecycle:**
```
PENDING     → PO created, no work started
IN_PROGRESS → at least one item has started production
COMPLETED   → all items are production-complete (item.status = COMPLETED)
DELIVERED   → all items fully delivered (DoItemObserver)
CLOSED      → all items payment_status = PAID (Finance final action)
```

### 5.5 Stage Access Gate (validateStageAccess)

Two-layer security on every progress write:

**Layer 1 — Role-to-Stage match:**
Stage name matched against `STAGE_ROLE_MAP` config (keyword arrays per role).
If no match → PRODUCTION role required.
Office users bypass all stage locks.

**Layer 2 — QC dependency gate:**
Before QC can be updated: ALL other non-QC, non-REWORK stages must be COMPLETED.
This is generic — checks ALL preceding stages, not hardcoded keywords.
Admin controls the gate by controlling which stages exist above QC.
QC stage is optional — if not in the stage list, no QC lock applies.

---

## 6. DELIVERY & FINANCE (POST-PRODUCTION TRACKING)

### 6.1 Delivery

- Delivery worker logs **how many pieces physically sent out** (additive delta per trip).
- System adds to `DoItem.delivered_qty` (running total, same DO record).
- `item.delivery_status` field: `PENDING | PARTIAL | DELIVERED`
- `DoItemObserver` updates `delivery_status` on each write.
- Partial delivery is supported — Delivery can log 3 pcs today, 2 pcs tomorrow.
- No internal DO document entry required. DO is auto-created by system.
- Finance gate: `delivery_status != PENDING` (at least one piece delivered) before invoice allowed.

### 6.2 Finance

- Finance sees items that are: active, OR completed but UNINVOICED or UNPAID.
- Finance can invoice **the full PO** (default) or **partially** (situational — Finance decides).
- `item.invoiced_qty` tracks how many pieces have been invoiced.
- `item.invoice_status`: `UNINVOICED | PARTIAL | INVOICED`
- `item.payment_status`: `UNPAID | PARTIAL_PAID | PAID`
- When all items on a PO have `payment_status = PAID` → `PO.status = CLOSED`.
- Finance fields are terminal — no observer cascade. Finance manually updates.

---

## 7. ALERT SYSTEM

Alerts have 4 severity levels:

| Severity | Color | Trigger | Auto-resolve |
|---|---|---|---|
| 🔴 RED — Stuck | Red | Worker clicks "Lapor Kendala" → selects reason type | When worker resumes progress on that stage |
| 🔴 RED — Overdue | Red | `Current Date > Global Deadline` AND item not COMPLETED | When item reaches 100% or deadline extended |
| 🟡 YELLOW — Risk | Amber | `Days Remaining ≤ 3` AND `progress < 70%` | When either condition clears |
| 🟡 YELLOW — Rework | Amber | QC logs `reject_qty > 0` → REWORK sub-stage spawned | Manual resolve |
| 🔵 BLUE | Blue | PIN Reset requested by worker | When admin approves |

**Kendala (Stuck) Flow:**
1. Worker clicks Lapor Kendala → selects `reason_type` (Machine Broken, Material Shortage, Design Issue, etc.) + optional note.
2. `ItemProgress.status = STUCK`.
3. `Alert` created with `severity=RED`, `reason_type` stored separately for analytics.
4. Pusher broadcasts to Owner Dashboard → red toast notification.
5. When worker resumes logging progress → RED alert auto-resolves for that stage.

**Timeline evaluation** runs via cron (`php artisan pogrid:evaluate-timelines` every 1 min).
Uses `Alert::updateOrCreate` — no duplicate spam.

---

## 8. QC REWORK FLOW

1. QC worker logs `reject_qty` on QC stage.
2. System spawns `"QC - REWORK"` ItemProgress sub-stage (0% / PENDING).
3. Original QC stage: `completed_qty -= reject_qty` (floor at 0).
4. YELLOW alert created.
5. If `item.status === COMPLETED` → forced back to `IN_PROGRESS`.
6. Rework stage excluded from QC gate dependency check.
7. Production re-does the rejected pieces → REWORK stage updated → QC re-inspects.

---

## 9. SUNK-COST CANCEL PROTECTION

- **Item progress == 0%**: Owner can cancel freely → `item.status = CANCELLED`.
- **Item progress > 0%**: Cancel button disabled (HTTP 403 at controller).
- **Midway Termination**: Owner clicks `TERMINATE_MIDWAY`.
  - Freezes worker screen via Pusher ("Production Halted by Owner").
  - `completedPieces = round(Σ(completed_qty) / stage_count)` — conservative average.
  - Dispatches `GenerateSunkCostInvoiceJob` to Finance for billing of completed work.
  - `item.status = TERMINATED`.

---

## 10. CROSS-ROLE VISIBILITY & ARCHIVE

### Floor Visibility
All floor workers can **see all active items** on their dashboard (read-only for stages not matching their role). Stage update controls only appear for the worker's matched role.

Previously: each role only saw their own stage items. **Changed**: full read-only visibility across all roles for floor coordination.

### Archive Tab
Visible to all workers and office users. Each role sees their own completed work:

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

Archive is read-only. Filterable by date range, searchable by item/PO/client.

---

## 11. DATA MODEL (AUTHORITATIVE SCHEMA)

### Core Tables

```
tenants
  id, company_name, slug, subscription_status, trial_ends_at

users
  id, tenant_id, name, email, username, password, pin (bcrypt),
  role_id (FK→roles), post_id (FK→posts), is_owner (bool),
  pin_reset_requested (bool)

roles
  id, name (unique), display_name, level (floor|office)
  -- See §12 for complete role list

posts
  id, name (unique), display_name
  -- See §12 for complete post list

pos
  id, tenant_id, po_number, client_name, global_deadline,
  status (PENDING|IN_PROGRESS|COMPLETED|DELIVERED|CLOSED)

items
  id, tenant_id, po_id, item_name, target_qty,
  item_type (MANUFACTURE|BUY_OUT|SERVICE),
  required_stages (jsonb array of stage name strings),
  progress_percent (decimal, flat-stored),
  status (PENDING|IN_PROGRESS|COMPLETED|CANCELLED|TERMINATED),
  delivery_status (PENDING|PARTIAL|DELIVERED),
  invoice_status (UNINVOICED|PARTIAL|INVOICED),
  invoiced_qty (integer, default 0),
  payment_status (UNPAID|PARTIAL_PAID|PAID),
  drafter_status (DRAWING|APPROVED|null),
  purchasing_status (ORDER|PROSES|READY|null)

item_progress
  id, tenant_id, item_id, stage_name,
  completed_qty, progress_percent,
  previous_completed_qty (nullable), previous_progress_percent (nullable),
  status (PENDING|IN_PROGRESS|COMPLETED|STUCK)

alerts
  id, tenant_id, item_id, severity (RED|YELLOW|BLUE),
  reason_type (string, structured), message (text), is_resolved (bool)

delivery_orders
  id, tenant_id, po_id, do_number, delivery_date
  -- One DO per PO (updateOrCreate pattern). Auto-created by system.

do_items
  id, delivery_order_id, item_id, delivered_qty
  -- delivered_qty = running total (additive per trip, never replaced)

invoices
  id, tenant_id, delivery_order_id (nullable), invoice_number,
  total_amount, status (UNPAID|PAID), due_date,
  invoice_type (STANDARD|SUNK_COST)
```

### Observer Chain

```
Item::created
  → creates ItemProgress rows (one per admin-selected stage)
  → ALL start at 0% / PENDING  (no warm-starts, no auto-injection)

ItemProgress::saved
  → recalculate item.progress_percent (formula by qty type)
  → if progress = 100% → item.status = COMPLETED
  → if any item IN_PROGRESS and PO = PENDING → PO = IN_PROGRESS
  → if all items COMPLETED and PO = IN_PROGRESS → PO = COMPLETED

DoItem::saved
  → recalculate item.delivery_status (PENDING|PARTIAL|DELIVERED)
  → if all non-cancelled items = DELIVERED → PO.status = DELIVERED

Finance action (manual, no observer)
  → Finance sets invoice_status, invoiced_qty, payment_status
  → When all non-cancelled items PAID → PO.status = CLOSED
```

---

## 12. ROLES & POSTS (COMPLETE REFERENCE)

### Roles

**Floor level (PIN login):**
`DRAFTER, PURCHASING, MACHINING, FABRICATION, ASSEMBLY, SURFACE, QC, DELIVERY, FINANCE, PRODUCTION, MAINTENANCE, PPIC`

**Office level (password login):**
`STAFF, SALES, SUPERVISOR, MANAGER, DIRECTOR`

### Stage-to-Role Mapping (STAGE_ROLE_MAP)

```
DRAFTER     → design, gambar, drawing, draft, cad, sketsa
PURCHASING  → material, bahan, purchasing, procurement, vendor, logistik, gudang
MACHINING   → machining, cnc, milling, frais, turning, bubut, drilling, bor,
               grinding, gerinda, slotting, edm, broaching
FABRICATION → fabrication, fabrikasi, welding, las, cutting, potong,
               bending, tekuk, rolling, stamping, punching
ASSEMBLY    → assembly, perakitan, rakit, fitting, fitter, erection, instalasi
SURFACE     → surface, heat treatment, perlakuan panas, powder coating,
               painting, cat, galvanizing, galvanis, plating, anodizing,
               phosphating, sandblasting, electroplating, finishing, coating
QC          → qc, quality control, inspeksi, qa, metrologi, pengujian, testing
DELIVERY   → delivery, pengiriman, kirim, ekspedisi
MAINTENANCE → maintenance, perawatan, repair, perbaikan
PRODUCTION  → (catch-all — matches any stage not matched by above)
```

### Key Posts (by department)

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

---

## 13. PIN RESET FLOW

1. Worker (unauthenticated) → `POST /c/{slug}/pin-reset/request` → creates BLUE alert.
2. Admin sees BLUE alert → `POST /pin-reset/{alertId}/approve`.
3. System generates new 4-digit PIN, hashes it, stores on user.
4. PIN displayed once in plaintext in alert message for admin to communicate to worker verbally.
5. Spam protection: only one pending PIN reset alert per worker at a time.

---

## 14. KEY ARCHITECTURAL CONSTRAINTS

1. **No persistent daemons** — queue via cron `queue:work --stop-when-empty` every 1 min.
2. **No subdomain routing** — all tenants at `app.pogrid.id/c/{slug}`.
3. **No tsconfig.json** — Vite compiles TypeScript directly.
4. **No tailwind.config.js** — config via `@import "tailwindcss"` in `app.css`.
5. **No API routes** — all routes in `routes/web.php`, controllers return Inertia.
6. **Dual language** — EN/ID per component via `translations` object + `localStorage('pogrid_lang')`.
7. **TenantManager singleton** — manages `tenant_id` context for request lifecycle.
   - Use `TenantManager::bypass()` before global queries, `enableScope()` after.
8. **Observer-driven cascade** — business logic lives in Observers, not controllers.
9. **No BOM, no stock** — purchasing_status is just a progress indicator, not inventory.

---

## 15. DEMO ACCOUNTS (Seeded)

Tenant: `teknik-mandiri`

**Office login at `/login` (password: `poiuy`):**
- `sari` — Sari Dewi (Owner)
- `budi` — Budi Santoso (Admin)
- `fitri` — Fitri Handayani (Sales)
- `dimas` — Dimas Ardiansyah (Manager)

**Floor PIN login at `/c/teknik-mandiri` (PIN: `0000`):**
- Rina Wulandari (Purchasing), Dewi Sartika (Finance), Arief Prasetyo (Drafter)
- Hendra Gunawan (Machining/CNC), Bambang Supriyadi (Fabrication)
- Agus Hermawan (QC), Slamet Riyadi (Delivery), Joko Susilo (Production)