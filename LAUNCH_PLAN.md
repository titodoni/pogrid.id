# POgrid.id — Codebase Audit & v1 Launch Plan

> Generated: July 29, 2026
> Source: Codebase inspection + SPEC.md + SMOKE_TEST_CHECKLIST.md + grill-me interview
> Purpose: Audit current state, identify gaps, create phased plan to v1 launch

---

## 1. CODEBASE AUDIT

### Current State (as of July 29, 2026)

| Metric | Count |
|--------|-------|
| PHP files (app/) | 44 |
| React/TS files (resources/js/) | 37 |
| Test files (tests/) | 14 |
| Database migrations | 28 |
| Routes (web.php) | 124 lines, ~40 endpoints |
| Controllers | 10 |
| Models | 14 |
| Observers | 3 |
| Events | 7 |
| Jobs | 1 |
| Frontend pages | 20 |

### What's Implemented ✅

#### Backend (Laravel)
- [x] **Multi-tenancy**: TenantManager + TenantScope (row-level)
- [x] **Dual auth**: Guard A (password) + Guard B (PIN)
- [x] **Office roles**: Owner, Admin, Manager, Supervisor, Sales, Director
- [x] **Floor roles**: 12 roles (DRAFTER → MAINTENANCE + PPIC)
- [x] **PO CRUD**: CreatePo with stage templates (10 templates)
- [x] **Progress system**: Additive delta, cancel last update
- [x] **Observer chain**: ItemProgressObserver, DoItemObserver, ItemObserver
- [x] **Stage access gate**: STAGE_ROLE_MAP keyword matching
- [x] **QC gate**: Generic preceding-stages check
- [x] **QC rework**: Sub-stage spawn, reject_qty handling
- [x] **Kendala reporting**: STUCK status, RED alert
- [x] **Delivery tracking**: Additive DoItem, delivery_status transitions
- [x] **Finance tracking**: Invoice/Payment status, partial invoice
- [x] **Alert system**: RED/YELLOW/BLUE, stale detection
- [x] **PIN reset flow**: Request → BLUE alert → Admin approve
- [x] **Archive tab**: Role-filtered completed items
- [x] **Export**: PDF, CSV, XLSX
- [x] **Stage templates**: CRUD per tenant
- [x] **Rework logbook**: Analytics view
- [x] **Attribution tracking**: UTM params on registration
- [x] **Legal pages**: Terms, Privacy

#### Frontend (React + TypeScript)
- [x] **Landing page**: Full marketing page (900+ lines, EN/ID)
- [x] **Owner dashboard**: KPI, alerts, user management
- [x] **Worker dashboard**: Progress update, kendala, archive
- [x] **PPIC dashboard**: Production planning view
- [x] **Auth pages**: Login, Register, Forgot Password, Reset
- [x] **Error pages**: 403, 404, 419, 500
- [x] **Components**: StatusBadge, WarningPill, FlashMessages, Modal

#### Infrastructure
- [x] **Pusher**: Real-time toast notifications
- [x] **Queue**: Database driver + cron
- [x] **Seed data**: Demo tenant (teknik-mandiri) with users
- [x] **Knowledge graph**: 625+ nodes (graphify)

#### Tests
- [x] **CoreLogicTest**: Progress formulas, QC gate, PO lifecycle
- [x] **AdminManagementTest**: Roles, archive queries
- [x] **PerformanceMatrixTest**: Eager loading, query optimization
- [x] **TenantScopeAuditTest**: Multi-tenancy isolation
- [x] **StageFlowE2ETest**: Stage access gate flow
- [x] **PusherRealtimeE2ETest**: Real-time sync
- [x] **BroadcastTest**: Event broadcasting
- [x] **MultilingualDisplayNameTest**: EN/ID display names
- [x] **InertiaErrorPagesTest**: Error page rendering
- [x] **BacklogFeatureRegressionTest**: Feature regression

### What's NOT Implemented / Gaps 🔴

#### Critical (Must-have for launch)

| Gap | Impact | Effort |
|-----|--------|--------|
| **Payment integration** | Can't collect subscription revenue | HIGH |
| **Registration flow** | Users can't sign up | MEDIUM |
| **Onboarding wizard** | First-time setup unclear | MEDIUM |
| **Smoke test execution** | Loopholes unknown | HIGH |
| **Production deployment** | Not live | HIGH |
| **Email system** | No transactional emails | MEDIUM |

#### Important (Should-have for launch)

| Gap | Impact | Effort |
|-----|--------|--------|
| **Subscription management** | No billing cycle tracking | HIGH |
| **Trial period logic** | 30-day trial not enforced | MEDIUM |
| **Rate limiting (production)** | Security concern | LOW |
| **Error logging/monitoring** | No observability | MEDIUM |
| **Backup strategy** | Data loss risk | LOW |
| **SSL/HTTPS** | Security requirement | LOW (hosting) |

#### Nice-to-have (Post-launch)

| Gap | Impact | Effort |
|-----|--------|--------|
| **Mobile PWA** | Better mobile experience | MEDIUM |
| **Multi-language UI** | EN/ID toggle exists but incomplete | LOW |
| **API (future)** | Third-party integrations | HIGH |
| **Webhook system** | External notifications | MEDIUM |

---

## 2. SPEC vs CODEBASE MAPPING

### User Stories Coverage

| User Story | Status | Notes |
|------------|--------|-------|
| US01-06: Owner dashboard + alerts | ✅ Implemented | Dashboard, alerts, Pusher toast |
| US07: Stale detection | ✅ Implemented | EvaluateTimelines cron |
| US08: Filter by status | ✅ Implemented | Status pills, click to filter |
| US09: Delivery/invoice/payment status | ✅ Implemented | Per-item pills |
| US10: Terminate midway | ✅ Implemented | OwnerDashboardController |
| US11: Owner read-only (no PO create) | ✅ Implemented | 403 on create |
| US12-13: PO creation + templates | ✅ Implemented | CreatePo with 10 templates |
| US14: Stage customization | ✅ Implemented | Add/remove after template |
| US15: Add items to PO | ✅ Implemented | target_qty, item_type |
| US16-17: User management + PIN reset | ✅ Implemented | CRUD + approve flow |
| US18: New roles/posts | ✅ Implemented | Migration + seeder |
| US19: Alert resolution | ✅ Implemented | Owner/Admin/PPIC resolve |
| US20-21: Worker PIN login + visibility | ✅ Implemented | Guard B, cross-role |
| US22: Stage controls per role | ✅ Implemented | STAGE_ROLE_MAP |
| US23-24: Additive delta + cap | ✅ Implemented | updateProgress |
| US25: Cancel last update | ✅ Implemented | One-level undo |
| US26-27: Kendala reporting | ✅ Implemented | STUCK status, alert |
| US28: Pusher instant update | ✅ Implemented | Observer broadcast |
| US29: Worker archive | ✅ Implemented | Archive.tsx |
| US30: 44px touch targets | ⚠️ Partial | Needs verification |
| US31-35: QC rework flow | ✅ Implemented | logQcRework, sub-stages |
| US36-39: Delivery tracking | ✅ Implemented | Additive DoItem |
| US40-44: Finance tracking | ✅ Implemented | Partial invoice, payment |
| US45-46: Sales view | ✅ Implemented | Read-only dashboard |
| US47-48: Progress recalculation | ✅ Implemented | Observer chain |
| US49: PO status lifecycle | ✅ Implemented | PENDING → CLOSED |
| US50-51: Rework + timeline alerts | ✅ Implemented | EvaluateTimelines |
| US52: Cron every 1 min | ✅ Implemented | Console command |
| US53: Sunk-cost protection | ✅ Implemented | Cancel disabled |
| US54-55: Terminate + invoice job | ✅ Implemented | GenerateSunkCostInvoiceJob |
| US56-57: Auth security | ✅ Implemented | bcrypt, privilege escalation |
| US58: Multi-tenancy | ✅ Implemented | TenantScope |
| US59: Queue via cron | ✅ Implemented | --stop-when-empty |
| US60: Pusher sync toast | ✅ Implemented | Observer broadcast |

**Coverage: 58/60 user stories implemented (97%)**
**Gaps: US30 (touch targets verification), Payment/Subscription system**

---

## 3. PHASED LAUNCH PLAN

### Phase 0: Pre-Launch Audit (Week 1)
**Goal**: Execute smoke test, find and fix loopholes

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 0.1 | Run full smoke test checklist (150+ items) | CRITICAL | 2 days | [ ] |
| 0.2 | Fix all `[!]` failed items | CRITICAL | 1-3 days | [ ] |
| 0.3 | Verify 44px touch targets on mobile | HIGH | 4 hrs | [ ] |
| 0.4 | Run full test suite `php artisan test` | HIGH | 2 hrs | [ ] |
| 0.5 | Fix any failing tests | HIGH | 1 day | [ ] |
| 0.6 | Code formatting `vendor/bin/pint` | MEDIUM | 1 hr | [ ] |
| 0.7 | Security audit (SQL injection, XSS, CSRF) | HIGH | 4 hrs | [ ] |
| 0.8 | Performance audit (N+1 queries, load time) | MEDIUM | 4 hrs | [ ] |

**Deliverable**: All smoke test items `[x]`, no `[!]` blockers

---

### Phase 1: Infrastructure & Deployment (Week 2)
**Goal**: Deploy to production hosting

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 1.1 | Setup production hosting (Hostinger or VPS) | CRITICAL | 1 day | [ ] |
| 1.2 | Configure SSL/HTTPS for app.pogrid.id | CRITICAL | 2 hrs | [ ] |
| 1.3 | Setup PostgreSQL production database (Neon) | CRITICAL | 2 hrs | [ ] |
| 1.4 | Configure Pusher production keys | CRITICAL | 1 hr | [ ] |
| 1.5 | Setup cron job for queue processing | CRITICAL | 1 hr | [ ] |
| 1.6 | Setup cron job for timeline evaluation | CRITICAL | 1 hr | [ ] |
| 1.7 | Configure environment variables (.env) | CRITICAL | 1 hr | [ ] |
| 1.8 | Run migrations on production DB | CRITICAL | 30 min | [ ] |
| 1.9 | Seed demo tenant for testing | MEDIUM | 30 min | [ ] |
| 1.10 | Setup error logging (Sentry or similar) | MEDIUM | 2 hrs | [ ] |
| 1.11 | Setup backup strategy (DB + files) | MEDIUM | 2 hrs | [ ] |
| 1.12 | Configure email (SMTP or transactional) | MEDIUM | 2 hrs | [ ] |

**Deliverable**: app.pogrid.id live with SSL, DB, Pusher, cron

---

### Phase 2: Authentication & Registration (Week 2-3)
**Goal**: Users can sign up and login

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 2.1 | Test registration flow end-to-end | CRITICAL | 2 hrs | [ ] |
| 2.2 | Test email verification flow | CRITICAL | 2 hrs | [ ] |
| 2.3 | Test forgot password flow | CRITICAL | 2 hrs | [ ] |
| 2.4 | Test PIN login flow (Floor) | CRITICAL | 2 hrs | [ ] |
| 2.5 | Test privilege escalation protection | CRITICAL | 1 hr | [ ] |
| 2.6 | Verify session timeout behavior | MEDIUM | 1 hr | [ ] |
| 2.7 | Test rate limiting on PIN login | MEDIUM | 1 hr | [ ] |

**Deliverable**: Complete auth flow working in production

---

### Phase 3: Onboarding Flow (Week 3)
**Goal**: New users can setup their workshop

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 3.1 | Create onboarding wizard (first-time login) | HIGH | 1 day | [ ] |
| 3.2 | Step 1: Company info (name, slug, industry) | HIGH | 4 hrs | [ ] |
| 3.3 | Step 2: Add first workers (name, role, PIN) | HIGH | 4 hrs | [ ] |
| 3.4 | Step 3: Create first PO (template selection) | HIGH | 4 hrs | [ ] |
| 3.5 | Step 4: Worker PIN login test | HIGH | 2 hrs | [ ] |
| 3.6 | Quickstart guide (help docs) | HIGH | 4 hrs | [ ] |
| 3.7 | In-app tooltips/hints for first-time users | MEDIUM | 4 hrs | [ ] |

**Deliverable**: Self-service onboarding without founder assistance

---

### Phase 4: Subscription & Payment (Week 3-4)
**Goal**: Collect revenue

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 4.1 | Design subscription model (plans, pricing) | CRITICAL | 4 hrs | [ ] |
| 4.2 | Implement trial period logic (30 days) | CRITICAL | 1 day | [ ] |
| 4.3 | Implement subscription status on tenant | CRITICAL | 4 hrs | [ ] |
| 4.4 | Block access when trial expired | CRITICAL | 4 hrs | [ ] |
| 4.5 | Payment gateway integration (Midtrans/Xendit) | CRITICAL | 2 days | [ ] |
| 4.6 | Subscription management UI (billing page) | HIGH | 1 day | [ ] |
| 4.7 | Invoice generation | HIGH | 4 hrs | [ ] |
| 4.8 | Payment notification handling | HIGH | 4 hrs | [ ] |
| 4.9 | Subscription renewal reminders | MEDIUM | 4 hrs | [ ] |

**Deliverable**: Users can subscribe and pay

---

### Phase 5: UI/UX Polish (Week 4)
**Goal**: Production-ready user experience

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 5.1 | Mobile responsiveness audit | HIGH | 4 hrs | [ ] |
| 5.2 | Fix any layout issues on small screens | HIGH | 4 hrs | [ ] |
| 5.3 | Touch target verification (44px+) | HIGH | 2 hrs | [ ] |
| 5.4 | Loading states (skeleton, spinner) | MEDIUM | 4 hrs | [ ] |
| 5.5 | Error states (empty, 404, offline) | MEDIUM | 4 hrs | [ ] |
| 5.6 | Success feedback (toast, redirect) | MEDIUM | 2 hrs | [ ] |
| 5.7 | Form validation messages | MEDIUM | 4 hrs | [ ] |
| 5.8 | Accessibility (keyboard nav, screen reader) | LOW | 4 hrs | [ ] |

**Deliverable**: Polished, mobile-friendly UI

---

### Phase 6: Testing & QA (Week 4-5)
**Goal**: Confidence to launch

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 6.1 | Full smoke test re-run | CRITICAL | 2 days | [ ] |
| 6.2 | Cross-browser testing (Chrome, Firefox, Safari) | HIGH | 4 hrs | [ ] |
| 6.3 | Mobile device testing (Android, iPhone) | HIGH | 4 hrs | [ ] |
| 6.4 | Load testing (concurrent users) | MEDIUM | 4 hrs | [ ] |
| 6.5 | Security penetration test | MEDIUM | 4 hrs | [ ] |
| 6.6 | Data integrity verification | MEDIUM | 4 hrs | [ ] |
| 6.7 | Backup/restore test | MEDIUM | 2 hrs | [ ] |

**Deliverable**: All tests pass, no critical bugs

---

### Phase 7: Soft Launch (Week 5)
**Goal**: First paying customer

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 7.1 | Approach former employer (first customer) | CRITICAL | 1 day | [ ] |
| 7.2 | Onboard first customer (manual support) | CRITICAL | 2 days | [ ] |
| 7.3 | Monitor usage and gather feedback | CRITICAL | 1 week | [ ] |
| 7.4 | Fix critical issues from real usage | CRITICAL | Ongoing | [ ] |
| 7.5 | Collect testimonials/case study | MEDIUM | 1 day | [ ] |

**Deliverable**: First customer live and paying

---

### Phase 8: Marketing Launch (Week 6)
**Goal**: Public availability

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 8.1 | Deploy marketing site (pogrid.id) | HIGH | 1 day | [ ] |
| 8.2 | Setup Google Analytics / tracking | MEDIUM | 2 hrs | [ ] |
| 8.3 | Setup social media presence | MEDIUM | 2 hrs | [ ] |
| 8.4 | Prepare launch content (social posts) | MEDIUM | 4 hrs | [ ] |
| 8.5 | Submit to relevant directories/communities | LOW | 2 hrs | [ ] |
| 8.6 | Monitor signups and conversion | HIGH | Ongoing | [ ] |

**Deliverable**: Public launch, first organic signups

---

## 4. TIMELINE SUMMARY

```
Week 1:  ████░░░░░░░░░░░░░░░░  Phase 0: Audit & Fix
Week 2:  ░░░░████░░░░░░░░░░░░  Phase 1: Infrastructure
Week 2-3:░░░░░░░░████░░░░░░░░  Phase 2: Auth
Week 3:  ░░░░░░░░░░░░████░░░░  Phase 3: Onboarding
Week 3-4:░░░░░░░░░░░░░░░░████  Phase 4: Payment
Week 4:  ░░░░░░░░░░░░░░░░████  Phase 5: UI/UX Polish
Week 4-5:░░░░░░░░░░░░░░░░░░██  Phase 6: Testing
Week 5:  ░░░░░░░░░░░░░░░░░░██  Phase 7: Soft Launch
Week 6:  ░░░░░░░░░░░░░░░░░░░█  Phase 8: Marketing Launch
```

**Total estimated time: 6 weeks to public launch**

---

## 5. RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Smoke test finds critical bugs | Delay | Start Phase 0 immediately, allocate buffer time |
| Payment integration complexity | Delay | Use simple provider (Midtrans/Xendit), MVP billing |
| Shared hosting limitations | Performance | Monitor closely, plan VPS migration if needed |
| First customer churn | Revenue | Dedicated support, iterate on feedback |
| Founder burnout | All | Time-box to 2 hrs/day, say no to scope creep |
| No marketing budget | Growth | Leverage personal network, WhatsApp communities |

---

## 6. SUCCESS METRICS (Post-Launch)

| Metric | Target (Month 1) | Target (Month 3) |
|--------|-------------------|-------------------|
| Registered tenants | 5 | 20 |
| Paying tenants | 1 | 5 |
| Monthly revenue | Rp 500K | Rp 2.5M |
| Active users | 10 | 50 |
| Support tickets | <10/week | <5/week |
| Uptime | 99% | 99.5% |

---

*Plan generated: July 29, 2026*
*Method: Codebase audit + SPEC.md alignment + phased execution plan*
*Next action: Execute Phase 0 (smoke test)*
