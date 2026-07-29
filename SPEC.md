# SPEC: POgrid.id — Pre-Launch Readiness

> Generated via `to-spec` from grill-me interview results + codebase exploration.
> Status: `ready-for-agent`
> Date: July 29, 2026

---

## Problem Statement

Indonesian SME manufacturing workshops (20–30 people, ~20 POs/month) lack real-time visibility into order progress. Workshop owners frequently miss delivery deadlines because they have no way to track project status without calling the office or checking Excel spreadsheets. This results in delivery penalties from clients and inability to answer client inquiries promptly. Current tools (Excel + email threads) are chaotic, not real-time, and provide no alert mechanism for at-risk orders.

The founder experienced this pain firsthand as an Admin at a workshop — the boss (Owner) constantly asked "where is this order?" and frequently missed deadlines because there was no centralized, real-time tracking system.

---

## Solution

A **Live Progress & Delivery Punctuality Tracker** (SaaS) that:

1. Lets floor workers log production progress from their phones via simple PIN login
2. Provides Owners/Admins a real-time dashboard showing all PO statuses
3. Sends instant alerts (Pusher toast) when orders are stuck, overdue, or at risk
4. Enables Owners to answer client questions immediately without calling the office
5. Tracks delivery and finance status end-to-end

**Not an ERP. Not MES. Not inventory. Not accounting.** One question answered: *"Where is my order right now, and will it be on time?"*

---

## User Stories

### Owner (Dashboard Viewer)

1. As an Owner, I want to see a real-time dashboard of all active POs, so that I know the status of every order at a glance
2. As an Owner, I want to see color-coded status badges (PENDING, IN_PROGRESS, COMPLETED, DELIVERED, CLOSED), so that I can quickly identify which orders need attention
3. As an Owner, I want to receive instant Pusher toast notifications when a worker reports a kendala (stuck issue), so that I am aware of problems immediately
4. As an Owner, I want to see RED alerts for stuck and overdue items, so that I can prioritize which issues to address first
5. As an Owner, I want to see YELLOW alerts for at-risk items (≤3 days remaining, <70% progress), so that I can intervene before deadlines are missed
6. As an Owner, I want to resolve alerts manually by clicking resolve and inputting resolution data, so that I can acknowledge I have handled the issue
7. As an Owner, I want to see a staleness indicator for stages that haven't been updated in over a day, so that I can identify neglected work
8. As an Owner, I want to filter POs by status (click status pills), so that I can focus on specific categories
9. As an Owner, I want to see delivery_status, invoice_status, and payment_status per item, so that I have complete visibility into the order lifecycle
10. As an Owner, I want to terminate items midway (TERMINATE_MIDWAY) when needed, so that I can stop production and trigger sunk-cost invoicing
11. As an Owner, I want my dashboard to be read-only (I cannot create POs), so that my role is focused on monitoring and decision-making

### Admin (Operator)

12. As an Admin, I want to create new POs with PO number, client name, and global deadline, so that new orders are tracked in the system
13. As an Admin, I want to select from 10 stage templates (CNC Workshop, Fabrication, Engineering, etc.), so that I can quickly set up stages without building from scratch
14. As an Admin, I want to add/remove stages after template selection, so that I can customize for特殊 orders
15. As an Admin, I want to add items to POs with target_qty and item_type (MANUFACTURE, BUY_OUT, SERVICE), so that each order line is tracked
16. As an Admin, I want to manage users (create, edit, delete), so that the workshop's team is properly set up
17. As an Admin, I want to approve PIN reset requests from workers, so that locked-out workers can regain access
18. As an Admin, I want to see new roles/posts in dropdowns (ASSEMBLY, SURFACE, PPIC, MAINTENANCE, etc.), so that I can assign correct permissions
19. As an Admin, I want to resolve alerts, so that I can acknowledge and handle issues

### Worker (Floor - PIN Login)

20. As a Worker, I want to login via name selection + 4-digit PIN numpad, so that I can access the system without needing an email
21. As a Worker, I want to see all active items on my dashboard (cross-role visibility), so that I can see what colleagues are working on
22. As a Worker, I want to see stage update controls ONLY for stages matching my role, so that I can only update what I am responsible for
23. As a Worker, I want to log progress using additive delta ("+2 pcs finished this session"), so that I can quickly update without calculating totals
24. As a Worker, I want the system to cap my input at target_qty, so that I cannot over-report
25. As a Worker, I want to cancel my last update (one level only), so that I can fix mistakes
26. As a Worker, I want to report kendala (stuck issue) by selecting a reason type and optional note, so that the Owner is notified immediately
27. As a Worker, I want my kendala report to create a STUCK status on my stage (without blocking other stages), so that other workers can continue their work
28. As a Worker, I want my progress update to be instantly reflected on the Owner dashboard via Pusher, so that the Owner sees real-time data
29. As a Worker, I want to see my completed tasks in an Archive tab, so that I can review my work history
30. As a Worker, I want the UI to have 44px+ touch targets, so that I can use it comfortably on my phone

### QC (Quality Control)

31. As a QC worker, I want to log reject_qty on the QC stage, so that rejected pieces are tracked
32. As a QC worker, I want the system to spawn a "QC - REWORK" sub-stage when I reject pieces, so that rework is tracked separately
33. As a QC worker, I want the original QC stage's completed_qty to decrease by reject_qty, so that the progress reflects actual approved pieces
34. As a QC worker, I want the QC dependency gate to prevent me from updating until ALL preceding stages are COMPLETED, so that I only inspect finished work
35. As a QC worker, I want REWORK sub-stages to be excluded from the QC gate check, so that rework can be processed independently

### Delivery

36. As a Delivery worker, I want to log how many pieces I physically send out (additive delta per trip), so that delivery progress is tracked
37. As a Delivery worker, I want my delivery log to accumulate (not replace), so that multiple trips are recorded correctly
38. As a Delivery worker, I want the system to auto-create a DeliveryOrder per PO, so that I don't need to create DO documents manually
39. As a Delivery worker, I want item.delivery_status to transition PENDING → PARTIAL → DELIVERED, so that partial deliveries are visible

### Finance

40. As a Finance worker, I want to see items that are active OR completed but UNINVOICED/UNPAID, so that I can manage billing
41. As a Finance worker, I want to invoice the full PO or partially (by delivered qty), so that I have flexibility
42. As a Finance worker, I want a gate that prevents invoicing if delivery_status = PENDING, so that I only invoice delivered items
43. As a Finance worker, I want to mark items as PAID, so that payment status is tracked
44. As a Finance worker, I want PO.status to auto-close to CLOSED when all items are PAID, so that the lifecycle is complete

### Sales

45. As a Sales person, I want to see PO status and client-facing reports, so that I can answer client inquiries promptly
46. As a Sales person, I want to see delivery and payment status per item, so that I can give accurate updates to clients

### System Behaviors

47. As the system, I want to recalculate item.progress_percent on every ItemProgress save, so that progress is always accurate
48. As the system, I want to use different formulas for multi-piece (qty>1) vs single-piece (qty==1) items, so that progress calculation is correct for both types
49. As the system, I want to auto-transition PO status (PENDING → IN_PROGRESS → COMPLETED → DELIVERED → CLOSED), so that the lifecycle is automated
50. As the system, I want to create YELLOW alerts when QC logs reject_qty, so that rework is flagged
51. As the system, I want to use Alert::updateOrCreate for timeline alerts, so that no duplicate alerts are created
52. As the system, I want to run timeline evaluation via cron every 1 minute, so that overdue and at-risk items are detected promptly
53. As the system, I want to prevent cancellation of items with progress > 0%, so that sunk-cost is protected
54. As the system, I want to freeze worker screens via Pusher when TERMINATE_MIDWAY is triggered, so that production halts immediately
55. As the system, I want to dispatch GenerateSunkCostInvoiceJob on termination, so that Finance can bill for completed work
56. As the system, I want to enforce bcrypt hashing for both passwords and PINs, so that credentials are secure
57. As the system, I want to block office role users from PIN login, so that privilege escalation is prevented
58. As the system, I want row-level multi-tenancy via TenantScope, so that tenants cannot see each other's data
59. As the system, I want to process the queue via cron every 1 minute (queue:work --stop-when-empty), so that deferred jobs run on shared hosting
60. As the system, I want Pusher toast notifications to be synchronous (instant), so that Owners get notified immediately

---

## Implementation Decisions

### Architecture

- **Stack**: Laravel 11 (PHP 8.3) + React 18 + TypeScript + Inertia.js v2 + Tailwind CSS v4 + PostgreSQL (Neon.tech) + Pusher
- **Hosting**: Shared hosting (Hostinger), considering VPS migration for better queue reliability
- **Multi-tenancy**: Row-level via `tenant_id` on all operational models, TenantScope global scope
- **Auth**: Two guards — Guard A (Office: email/password) and Guard B (Floor: name selection + PIN numpad)
- **Real-time**: Pusher + Laravel Echo for instant toast notifications
- **Queue**: Database driver + cron `queue:work --stop-when-empty` every 1 minute (no persistent daemons)

### Progress System

- **Input model**: Additive delta — workers log "pieces finished this session", not absolute totals
- **Formula (multi-piece)**: `Item % = Σ(completed_qty) / (target_qty × stage_count) × 100`
- **Formula (single-piece)**: `Item % = Σ(stage progress%) / stage_count`
- **Undo**: Cancel Last Update reverts to previous snapshot (one level only)
- **Cap**: completed_qty cannot exceed target_qty

### Stage System

- **Zero auto-injection**: Admin selects stages manually, no system-imposed stages
- **10 templates**: CNC Workshop, Fabrication, Engineering, CNC+Design, Assembly, Full Engineering, With Finishing, Procurement Only, Service/Design, Custom
- **STAGE_ROLE_MAP**: Keyword-based role-to-stage matching (config array)
- **QC dependency gate**: All preceding non-QC, non-REWORK stages must be COMPLETED before QC can update

### Observer Chain

- **Item::created** → creates ItemProgress rows (one per selected stage, all 0% / PENDING)
- **ItemProgress::saved** → recalculates item.progress_percent, updates item.status, updates PO.status
- **DoItem::saved** → recalculates delivery_status, updates PO → DELIVERED when all items delivered
- **Finance action** → manual, no observer cascade

### Alert System

- **Severity levels**: RED (Stuck, Overdue), YELLOW (Risk, Rework), BLUE (PIN Reset)
- **Resolution**: Owner, Admin, or PPIC can resolve manually + input data
- **No escalation levels**: Only detection timestamp ages
- **Staleness detection**: Stages with no updates for configured threshold get flagged
- **Timeline evaluation**: Cron `pogrid:evaluate-timelines` every 1 minute

### STUCK Status

- **Label only, no blocking**: STUCK does not prevent other stages on same item from progressing
- **Staleness detection**: Flagged when no updates within configured timeframe

### Pusher Toast vs Data Processing

- **Toast**: Instant, synchronous from `ItemProgress::saved()` observer
- **Data processing**: Deferred, via queue cron every 1 minute
- **Gap acceptable**: Owner sees "something happened" immediately, details load when queue catches up

### Delivery & Finance

- **Additive delivery**: DoItem.delivered_qty accumulates per trip (never replaced)
- **Delivery gate**: Finance cannot invoice if delivery_status = PENDING
- **Partial invoice**: Finance can invoice partial qty (invoiced_qty < delivered_qty)
- **PO lifecycle**: PENDING → IN_PROGRESS → COMPLETED → DELIVERED → CLOSED

### Business Model

- **Pricing**: 30-day trial, monthly billing, minimum 1-year commitment
- **Target**: Workshops with 20–30 people, ~20 POs/month
- **First customer**: Former employer (founder was Admin there)
- **Support**: Founder provides direct support during onboarding
- **Onboarding**: Owner/Admin sets up with founder help, quickstart guide planned

---

## Testing Decisions

### Testing Philosophy

- Tests should verify **external behavior**, not implementation details
- Tests should use the seeded demo data (`teknik-mandiri` tenant)
- Tests should cover the full PO lifecycle (PENDING → CLOSED)

### Modules to Test

- **CoreLogicTest**: Additive progress, QC generic gate, delivery additive, PO lifecycle, delivery_status transitions, invoice PARTIAL state, role-to-stage matching, no auto-injection
- **AdminManagementTest**: New roles (ASSEMBLY, SURFACE, PPIC, MAINTENANCE), archive query per role
- **PerformanceMatrixTest**: Eager loading optimization, query count verification

### Prior Art

- Feature tests in `tests/Feature/` using PHPUnit
- Unit tests in `tests/Unit/`
- Smoke test checklist created at `SMOKE_TEST_CHECKLIST.md` (150+ test items across 20 categories)

### Smoke Test Categories

1. Auth — Office (Guard A)
2. Auth — Floor (Guard B)
3. PO Creation (Admin)
4. Progress Tracking (Worker)
5. Stage Access Gate
6. QC Rework Flow
7. Alert System
8. Delivery Tracking
9. Finance Tracking
10. PO Status Lifecycle
11. Owner Dashboard
12. Archive Tab
13. Real-Time (Pusher)
14. Edge Cases
15. Multi-Tenancy
16. Performance
17. Data Integrity
18. Browser/Mobile
19. Security
20. Seed Data

### Test Commands

- `php artisan test --testsuite=Feature` — run all feature tests
- `vendor/bin/pint` — code formatting
- All smoke test items must be `[x]` (passed) before launch

---

## Out of Scope

1. **Data migration from Excel** — system starts from scratch, no import functionality
2. **ERP features** — no Bill of Materials, no raw material stock tracking, no warehouse management
3. **Accounting** — no general ledger, no journal entries, no financial reporting beyond invoice/payment status
4. **Inventory management** — purchasing_status is a progress indicator, not inventory tracking
5. **Multi-language UI** — EN/ID per component via translations object, but not a priority for launch
6. **VPS migration** — shared hosting is current target, VPS is consideration for later
7. **Automated payment integration** — manual billing for now
8. **Landing page / marketing site** — not yet built
9. **Mobile native app** — web-based only (responsive for mobile browsers)
10. **API routes** — all traffic through `routes/web.php`, controllers return Inertia (no REST API)
11. **Subdomain multi-tenancy** — all tenants at `app.pogrid.id/c/{slug}`
12. **tsconfig.json** — Vite handles TypeScript compilation directly
13. **tailwind.config.js** — Tailwind v4 runs via `@tailwindcss/vite` plugin
14. **Persistent background daemons** — queue via cron only (shared hosting constraint)

---

## Further Notes

### Pre-Launch Gaps (from grill-me)

| Gap | Priority | Status |
|-----|----------|--------|
| Smoke test checklist | #1 CRITICAL | Created (SMOKE_TEST_CHECKLIST.md) |
| UI/UX polish | #2 HIGH | Not started |
| Quickstart guide | #3 HIGH | Not started |
| Landing page | #4 MEDIUM | Not started |
| Payment integration | #5 MEDIUM | Not started |
| Production deployment | #6 MEDIUM | Not started |
| Approach first customer | #7 MEDIUM | Not started |

### Founder Constraints

- Solo developer (code, support, sales)
- 2 hours/day available
- 0 tenants, pre-launch, no revenue
- No sales support — all manual outreach

### Launch Readiness Rule

ALL smoke test items must be `[x]` (passed) with no `[!]` (failed) items before approaching the first customer.

### Domain Glossary

- **PO** — Purchase Order
- **Item** — Line item on a PO (e.g., "Gearbox × 5 pcs")
- **Stage** — Production step (e.g., Machining, QC, Delivery)
- **Additive Delta** — Worker inputs "pieces finished this session" (not absolute total)
- **Kendala** — Stuck/problem report from worker
- **Tenant** — Workshop/company (multi-tenancy unit)
- **Slug** — URL identifier for tenant (e.g., `teknik-mandiri`)
- **Guard A** — Office authentication (email/password)
- **Guard B** — Floor authentication (name + PIN)
- **STAGE_ROLE_MAP** — Keyword-based role-to-stage access mapping
- **REWORK** — Sub-stage spawned when QC rejects pieces
- **TERMINATE_MIDWAY** — Owner halts production on in-progress item
- **Sunk-Cost Invoice** — Invoice for completed work on terminated item

---

*Generated: July 29, 2026*
*Method: to-spec (from grill-me interview + codebase exploration)*
*Source: ACKNOWLEDGEMENT.md + SMOKE_TEST_CHECKLIST.md + PRD.md + MAIN-IDEA.md*
