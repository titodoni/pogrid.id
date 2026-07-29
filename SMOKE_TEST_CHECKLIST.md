# SMOKE TEST CHECKLIST — POgrid.id

> Pre-launch QA checklist. Test every flow before approaching first customer.
> Status: [ ] = not tested, [x] = passed, [!] = failed/blocker

---

## How to Use This Checklist

1. Run tests against the seeded demo data (`teknik-mandiri` tenant)
2. Test each flow end-to-end, don't skip steps
3. Mark status: `[x]` passed, `[!]` failed (include error message), `[ ]` not tested yet
4. Any `[!]` item = BLOCKER — fix before launch
5. Run `php artisan test --testsuite=Feature` after each code change

### Demo Accounts

**Office login at `/login` (password: `poiuy`):**
- `sari` — Owner
- `budi` — Admin
- `fitri` — Sales
- `dimas` — Manager

**Floor PIN login at `/c/teknik-mandiri` (PIN: `0000`):**
- Rina Wulandari (Purchasing), Dewi Sartika (Finance), Arief Prasetyo (Drafter)
- Hendra Gunawan (Machining/CNC), Bambang Supriyadi (Fabrication)
- Agus Hermawan (QC), Slamet Riyadi (Delivery), Joko Susilo (Production)

---

## 1. AUTH — Office (Guard A)

### 1.1 Login Flow
- [ ] Login with valid email → redirected to `/dashboard`
- [ ] Login with valid username → redirected to `/dashboard`
- [ ] Login with wrong password → error message, stay on `/login`
- [ ] Login with non-existent user → generic error (no user enumeration)
- [ ] After login, session persists across page refresh

### 1.2 Office Role Access
- [ ] Owner (`sari`) → sees Owner dashboard, can see alerts
- [ ] Admin (`budi`) → sees Admin dashboard, can create POs
- [ ] Sales (`fitri`) → sees PO status, client-facing view
- [ ] Manager (`dimas`) → sees full dashboard, floor oversight

### 1.3 Privilege Escalation Protection
- [ ] Office role user CANNOT login via PIN at `/c/teknik-mandiri`
- [ ] Attempting PIN login with office role → blocked with appropriate message

### 1.4 Logout
- [ ] Click logout → session destroyed, redirected to `/login`
- [ ] After logout, back button does NOT restore session

---

## 2. AUTH — Floor (Guard B)

### 2.1 PIN Login Flow
- [ ] Navigate to `/c/teknik-mandiri` → name selection screen appears
- [ ] Select worker name → PIN numpad appears
- [ ] Enter correct PIN (0000) → redirected to Worker dashboard
- [ ] Enter wrong PIN → error message, stay on PIN screen
- [ ] 5 wrong attempts → throttled (rate limit)

### 2.2 Floor Role Access
- [ ] Hendra (Machining) → sees Machining stage controls
- [ ] Bambang (Fabrication) → sees Fabrication stage controls
- [ ] Agus (QC) → sees QC stage controls
- [ ] Slamet (Delivery) → sees Delivery stage controls
- [ ] Dewi (Finance) → sees Finance controls (invoice + payment)

### 2.3 Cross-Role Visibility
- [ ] Hendra (Machining) → can SEE Fabrication items (read-only, no update button)
- [ ] Bambang (Fabrication) → can SEE Machining items (read-only, no update button)
- [ ] All floor workers → see ALL active items on dashboard

### 2.4 PIN Security
- [ ] PIN is bcrypt hashed in database (not plaintext)
- [ ] PIN reset request → creates BLUE alert
- [ ] Admin approves PIN reset → new PIN generated, displayed once in alert

---

## 3. PO CREATION (Admin)

### 3.1 Create PO
- [ ] Admin clicks "Create PO" → form appears
- [ ] Input PO number, client name, global deadline → submit
- [ ] PO created with status PENDING
- [ ] PO appears in Owner dashboard

### 3.2 Stage Template Picker
- [ ] Select "CNC Workshop" template → stages auto-filled: Material, Machining, QC
- [ ] Select "Fabrication Workshop" → stages: Material, Fabrication, QC
- [ ] Select "Full Engineering" → stages: Design, Material, Machining, Fabrication, Assembly, QC
- [ ] Select "Custom" → empty stage list, admin builds from scratch
- [ ] After template selection, admin can add/remove stages

### 3.3 Add Items to PO
- [ ] Add item "Gearbox" with target_qty = 5, item_type = MANUFACTURE
- [ ] Select required stages for item (from template or custom)
- [ ] Item created with progress_percent = 0%, status = PENDING
- [ ] ItemProgress rows created for each selected stage (all 0% / PENDING)

### 3.4 Item Types
- [ ] MANUFACTURE item → progress tracked via stages
- [ ] BUY_OUT item → behavior correct
- [ ] SERVICE item → behavior correct

---

## 4. PROGRESS TRACKING (Worker)

### 4.1 Basic Progress Update
- [ ] Hendra (Machining) → selects Gearbox item → sees Machining stage
- [ ] Inputs "+2 pcs" → completed_qty = 2, progress recalculated
- [ ] Progress bar updates on Owner dashboard (via Pusher or page refresh)

### 4.2 Additive Delta Model
- [ ] Hendra logs +2 → completed_qty = 2
- [ ] Bambang (same Machining stage) logs +1 → completed_qty = 3 (NOT 1)
- [ ] Additive accumulation works correctly

### 4.3 Cap Enforcement
- [ ] Input more than target_qty → capped at target_qty
- [ ] completed_qty never exceeds target_qty

### 4.4 Cancel Last Update
- [ ] Worker clicks "Cancel Last Update" → reverts to previous snapshot
- [ ] Only ONE level of undo (cannot undo twice)
- [ ] After cancel, progress recalculated correctly

### 4.5 No Negative Input
- [ ] Worker cannot input negative numbers
- [ ] Validation error shown if negative value submitted

### 4.6 Progress Formula (Multi-piece)
- [ ] Gearbox (5 pcs, 3 stages): Material → Machining → QC
- [ ] Material READY (5 pcs) → 5/15 = 33%
- [ ] Machining +2 → 7/15 = 47%
- [ ] Machining +3 → 10/15 = 67%
- [ ] QC +5 → 15/15 = 100% → item.status = COMPLETED

### 4.7 Progress Formula (Single Piece)
- [ ] Item with target_qty = 1 → formula uses stage progress% average
- [ ] 3 stages at 100% each → item = 100% → COMPLETED

---

## 5. STAGE ACCESS GATE

### 5.1 Role-to-Stage Matching
- [ ] Hendra (MACHINING) → can update "Machining" stage
- [ ] Hendra (MACHINING) → CANNOT update "Fabrication" stage (403)
- [ ] Agus (QC) → can update "QC" stage
- [ ] Joko (PRODUCTION) → can update any unmatched stage (catch-all)
- [ ] Office user → bypasses all stage locks

### 5.2 QC Dependency Gate
- [ ] QC cannot update until ALL preceding stages are COMPLETED
- [ ] Test: Material COMPLETED, Machining IN_PROGRESS → QC blocked
- [ ] Test: Material COMPLETED, Machining COMPLETED → QC allowed
- [ ] QC stage is optional (if not in stage list, no gate applies)
- [ ] REWORK sub-stages excluded from gate check

### 5.3 Stage Keywords
- [ ] "Surface Treatment" stage → matched by SURFACE role
- [ ] "Powder Coating" stage → matched by SURFACE role
- [ ] "Heat Treatment" stage → matched by SURFACE role
- [ ] "Custom Stage XYZ" → falls to PRODUCTION role (catch-all)

---

## 6. QC REWORK FLOW

### 6.1 QC Reject
- [ ] Agus (QC) logs reject_qty = 2 on Gearbox
- [ ] System spawns "QC - REWORK" sub-stage (0% / PENDING)
- [ ] Original QC stage: completed_qty -= 2 (floored at 0)
- [ ] YELLOW alert created (reason_type = 'QC Rework')
- [ ] If item was COMPLETED → status forced back to IN_PROGRESS

### 6.2 Rework Stage
- [ ] Hendra logs progress on "QC - REWORK" stage
- [ ] Rework progress contributes to numerator but NOT denominator
- [ ] After rework done, Agus re-inspects → QC updated
- [ ] Item can reach 100% after rework cycle

### 6.3 Multiple Reworks
- [ ] QC rejects same item 3x in a row → each spawns new REWORK sub-stage
- [ ] No duplicate REWORK stages (firstOrCreate pattern)
- [ ] Item becomes progressively harder to complete (denominator stays same)

---

## 7. ALERT SYSTEM

### 7.1 RED — Stuck (Kendala)
- [ ] Worker clicks "Lapor Kendala" → selects reason type + optional note
- [ ] ItemProgress.status = STUCK
- [ ] RED alert created with reason_type
- [ ] Pusher broadcasts to Owner Dashboard → red toast appears
- [ ] Owner sees alert in alert list with timestamp

### 7.2 RED — Overdue
- [ ] Create PO with deadline = yesterday
- [ ] Item not COMPLETED → RED overdue alert auto-created
- [ ] Cron `pogrid:evaluate-timelines` detects overdue item
- [ ] Alert auto-resolves when item reaches 100%

### 7.3 YELLOW — Risk
- [ ] Item with deadline in 2 days AND progress < 70% → YELLOW alert
- [ ] Alert auto-resolves when progress >= 70% or deadline extended

### 7.4 YELLOW — Rework
- [ ] QC logs reject_qty > 0 → YELLOW alert created
- [ ] Manual resolve by Owner/Admin/PPIC

### 7.5 BLUE — PIN Reset
- [ ] Worker requests PIN reset → BLUE alert created
- [ ] Admin approves → new PIN generated, displayed once in alert message
- [ ] Only ONE pending PIN reset alert per worker at a time (spam protection)

### 7.6 Alert Resolution
- [ ] Owner can resolve any alert (click resolve + input data)
- [ ] Admin can resolve any alert
- [ ] PPIC can resolve any alert
- [ ] Worker resume logging → STUCK alert auto-resolves
- [ ] No escalation levels — only detection timestamp ages

### 7.7 Stale Detection
- [ ] Stage with no updates for > 1 day → flagged as stale
- [ ] Stale indicator visible on Owner dashboard

---

## 8. DELIVERY TRACKING

### 8.1 Delivery Update
- [ ] Slamet (Delivery) logs +3 pcs → DoItem.delivered_qty = 3
- [ ] item.delivery_status = PARTIAL (0 < 3 < 5)
- [ ] DoItemObserver fires → delivery_status recalculated

### 8.2 Additive Delivery
- [ ] Slamet logs +2 more → delivered_qty = 5 (NOT 2)
- [ ] Additive accumulation works correctly
- [ ] Cap at target_qty enforced

### 8.3 Delivery Completion
- [ ] delivered_qty >= target_qty → delivery_status = DELIVERED
- [ ] All non-cancelled items DELIVERED → PO.status = DELIVERED

### 8.4 Partial Delivery
- [ ] Deliver 3 today, 2 tomorrow → both logged correctly
- [ ] Delivery status transitions: PENDING → PARTIAL → DELIVERED

### 8.5 Delivery Order
- [ ] DO auto-created by system (one per PO)
- [ ] do_number = 'DO-{po_number}'
- [ ] No manual DO document entry required

---

## 9. FINANCE TRACKING

### 9.1 Finance Gate
- [ ] Finance CANNOT invoice if delivery_status = PENDING
- [ ] Finance CAN invoice if delivery_status = PARTIAL or DELIVERED

### 9.2 Full Invoice
- [ ] Finance invoices full PO → invoiced_qty = target_qty
- [ ] invoice_status = INVOICED

### 9.3 Partial Invoice
- [ ] Finance invoices partial → invoiced_qty < target_qty
- [ ] invoice_status = PARTIAL
- [ ] Can invoice again later for remaining qty

### 9.4 Payment Status
- [ ] Finance marks PAID → payment_status = PAID
- [ ] All non-cancelled items PAID → PO.status = CLOSED

### 9.5 Finance Dashboard
- [ ] Finance sees active items + completed-but-unpaid items
- [ ] Finance sees delivery_status, delivered_qty on item cards
- [ ] PARTIAL invoice badge visible

---

## 10. PO STATUS LIFECYCLE

### 10.1 Full Lifecycle
- [ ] PO created → status = PENDING
- [ ] Any item starts production → status = IN_PROGRESS
- [ ] All items COMPLETED → status = COMPLETED
- [ ] All items DELIVERED → status = DELIVERED
- [ ] All items PAID → status = CLOSED

### 10.2 Cancellation
- [ ] Item at 0% progress → Owner can cancel → status = CANCELLED
- [ ] Item at >0% progress → cancel button disabled (403)

### 10.3 Midway Termination
- [ ] Owner clicks TERMINATE_MIDWAY on item with progress > 0%
- [ ] Worker screen frozen via Pusher ("Production Halted by Owner")
- [ ] completedPieces calculated as conservative average
- [ ] GenerateSunkCostInvoiceJob dispatched
- [ ] item.status = TERMINATED

---

## 11. OWNER DASHBOARD

### 11.1 Dashboard View
- [ ] Owner sees all active POs with status badges
- [ ] Status badges: PENDING, IN_PROGRESS, COMPLETED, DELIVERED, CLOSED
- [ ] Filter pills work (click to filter by status)

### 11.2 Item Directory
- [ ] Owner sees item rows with progress_percent
- [ ] delivery_status pill visible per item
- [ ] invoice_status pill visible per item
- [ ] payment_status pill visible per item
- [ ] Clickable pills filter the directory

### 11.3 User Management
- [ ] Owner/Admin can view user list
- [ ] Edit User modal works
- [ ] Delete User flow works
- [ ] New roles/posts appear in dropdowns

### 11.4 Alert List
- [ ] Owner sees all alerts (RED, YELLOW, BLUE)
- [ ] Alert count badge in navigation
- [ ] Resolve alert flow works

---

## 12. ARCHIVE TAB

### 12.1 Archive Visibility
- [ ] All roles see Archive tab
- [ ] Archive is read-only

### 12.2 Role-Filtered Archive
- [ ] DRAFTER → items where Design stage = COMPLETED
- [ ] PURCHASING → items where Material stage = COMPLETED
- [ ] MACHINING → items where Machining/CNC stage = COMPLETED
- [ ] FABRICATION → items where Fabrication stage = COMPLETED
- [ ] QC → items where QC stage = COMPLETED
- [ ] DELIVERY → items where delivery_status = DELIVERED
- [ ] FINANCE → items where payment_status = PAID
- [ ] Office (all) → POs where status = CLOSED or DELIVERED

### 12.3 Archive Filters
- [ ] Date range filter works
- [ ] Search by item/PO/client works

---

## 13. REAL-TIME (PUSHER)

### 13.1 Toast Notifications
- [ ] Worker logs progress → Owner dashboard shows toast (instant)
- [ ] Worker reports kendala → Owner sees red toast (instant)
- [ ] Multiple toasts don't overlap or crash UI

### 13.2 Live Data Sync
- [ ] Owner dashboard data refreshes without page reload
- [ ] Worker dashboard reflects latest progress
- [ ] Pusher connection stable (no disconnection spam)

---

## 14. EDGE CASES

### 14.1 Concurrent Updates
- [ ] Two workers update same stage simultaneously → both recorded
- [ ] Race condition on progress_percent recalculation → no corruption

### 14.2 Stuck Status Behavior
- [ ] STUCK status does NOT block other stages on same item
- [ ] Other workers can continue on different stages while one is STUCK
- [ ] Staleness detection triggers after configured threshold

### 14.3 Target Qty Edge Cases
- [ ] target_qty = 1 → single-piece formula used
- [ ] target_qty = 0 → validation error (cannot create)
- [ ] target_qty = 100 → large qty works correctly

### 14.4 Stage Edge Cases
- [ ] Item with only 1 stage → progress formula works
- [ ] Item with 6+ stages → progress formula works
- [ ] QC stage missing from required_stages → no QC gate applies

### 14.5 Boundary Conditions
- [ ] progress_percent = 99.9% → item NOT yet COMPLETED
- [ ] progress_percent = 100% → item COMPLETED
- [ ] completed_qty = target_qty exactly → stage COMPLETED

---

## 15. MULTI-TENANCY

### 15.1 Tenant Isolation
- [ ] Tenant A cannot see Tenant B's data
- [ ] TenantScope filters all queries correctly
- [ ] TenantManager singleton sets tenant_id per request

### 15.2 Slug-Based Routing
- [ ] `/c/teknik-mandiri` → correct tenant loaded
- [ ] `/c/nonexistent-slug` → 404 or error
- [ ] No subdomain routing (all at `app.pogrid.id`)

---

## 16. PERFORMANCE

### 16.1 Dashboard Load Time
- [ ] Owner dashboard loads in < 3 seconds
- [ ] Worker dashboard loads in < 3 seconds
- [ ] No N+1 queries (eager loading verified)

### 16.2 Database
- [ ] Composite index on items(tenant_id, status, invoice_status, payment_status)
- [ ] Query count per dashboard load is reasonable

---

## 17. DATA INTEGRITY

### 16.1 Observer Cascade
- [ ] Item::created → creates ItemProgress rows (one per stage, all 0%)
- [ ] ItemProgress::saved → recalculates item.progress_percent
- [ ] ItemProgress::saved → updates item.status (COMPLETED at 100%)
- [ ] ItemProgress::saved → updates PO.status (IN_PROGRESS / COMPLETED)
- [ ] DoItem::saved → recalculates delivery_status
- [ ] DoItem::saved → updates PO → DELIVERED when all items delivered

### 16.2 Flat-Stored Progress
- [ ] item.progress_percent is always in sync with calculated value
- [ ] No stale progress values after rapid updates

---

## 18. BROWSER / MOBILE

### 18.1 Desktop (Office)
- [ ] Chrome → all pages render correctly
- [ ] Firefox → all pages render correctly
- [ ] Responsive layout on tablet

### 18.2 Mobile (Floor Workers)
- [ ] Touch targets are 44px+ (worker buttons)
- [ ] PIN numpad usable on mobile
- [ ] Progress form usable on mobile
- [ ] No hover-only states (mobile has no hover)
- [ ] Tested on Android phone
- [ ] Tested on iPhone

---

## 19. SECURITY

### 19.1 Authentication
- [ ] Session expires after timeout
- [ ] CSRF protection on all forms
- [ ] Password hashed with bcrypt
- [ ] PIN hashed with bcrypt

### 19.2 Authorization
- [ ] Office role cannot access Floor routes
- [ ] Floor role cannot access Office routes (except `/c/{slug}`)
- [ ] Stage access gate prevents unauthorized updates
- [ ] QC gate prevents premature QC updates

### 19.3 Input Validation
- [ ] Negative progress input rejected
- [ ] Progress exceeding target_qty capped
- [ ] SQL injection prevented (Eloquent parameterized queries)
- [ ] XSS prevented (Inertia auto-escapes)

---

## 20. SEED DATA

### 20.1 Demo Tenant
- [ ] `teknik-mandiri` tenant exists with all demo users
- [ ] Office users can login with password `poiuy`
- [ ] Floor workers can login with PIN `0000`
- [ ] Demo POs with items exist for testing

### 20.2 Test Suite
- [ ] `php artisan test --testsuite=Feature` passes
- [ ] CoreLogicTest covers additive progress, QC gate, delivery, PO lifecycle
- [ ] AdminManagementTest covers new roles, archive queries

---

## Summary

| Category | Total Tests | Passed | Failed | Not Tested |
|----------|-------------|--------|--------|------------|
| 1. Auth — Office | | | | |
| 2. Auth — Floor | | | | |
| 3. PO Creation | | | | |
| 4. Progress Tracking | | | | |
| 5. Stage Access Gate | | | | |
| 6. QC Rework | | | | |
| 7. Alert System | | | | |
| 8. Delivery | | | | |
| 9. Finance | | | | |
| 10. PO Lifecycle | | | | |
| 11. Owner Dashboard | | | | |
| 12. Archive | | | | |
| 13. Real-Time | | | | |
| 14. Edge Cases | | | | |
| 15. Multi-Tenancy | | | | |
| 16. Performance | | | | |
| 17. Data Integrity | | | | |
| 18. Browser/Mobile | | | | |
| 19. Security | | | | |
| 20. Seed Data | | | | |

**Launch Readiness**: Must have ALL tests passed (no `[!]` items) before approaching first customer.

---

*Generated: July 29, 2026*
*Method: Grill-me interview → Smoke test checklist*
*For: POgrid.id pre-launch QA*
