# ACKNOWLEDGEMENT — POgrid.id Product Deep Dive

> Output of grill-me interview session with Tito (founder), July 29, 2026.
> Purpose: Validate product assumptions, architecture, business model, and pre-launch gaps.

---

## 1. Product & Pain Point

### What is POgrid.id?
**Live Progress & Delivery Punctuality Tracker** for Indonesian SME manufacturing workshops.

Not an ERP. Not an MES. Not inventory. Not accounting.

The single question it answers:
> *"Where is my order right now, and will it be delivered on time?"*

### Pain Point (from founder's experience)
- **Workshop size: 20–30 people, ~20 POs/month**
- **Founder's role: Admin** — created POs, managed data, answered emails
- **Boss (Owner)**: had no visibility into project status, frequently missed delivery deadlines
- **Tools at the time**: Excel + email threads — chaotic, no real-time data
- **Result**: Delivery penalties from clients, boss could not answer client questions without calling the office

### How POgrid.id Solves It
1. **Workers log progress from their phones** — additive delta ("+2 pcs"), no Excel needed
2. **Owner sees real-time dashboard** — knows status of every PO, alerts appear instantly
3. **Alert system** — RED (stuck/overdue), YELLOW (at-risk/rework), BLUE (PIN reset)
4. **Pusher instant toast** — Owner gets notified *in real time*
5. **Boss can answer clients** — "Let me check" → opens dashboard → responds immediately

---

## 2. Target Users & Market

### Who uses the system? (All roles, daily usage)

| Role | Daily Activity |
|------|----------------|
| Owner | Checks dashboard, views alerts, resolves kendala |
| Admin | Creates POs, manages users, approves PIN resets |
| Workers (Floor) | PIN login → logs progress → reports kendala |
| Sales | Answers PO status questions from clients |

### Target Market
- **Workshops with 20–30 people, ~20 POs/month**
- Fabrication shops, CNC shops, engineering workshops
- Owners/Admins who need real-time visibility
- **No direct competitors exist** in this specific niche in Indonesia

### Why Not ERP/Odoo?
- Expensive training required
- Overkill for a 20-person workshop
- Requires IT staff to maintain

---

## 3. Architecture & Tech Stack

### Tech Stack (Locked)

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 11 (PHP 8.3) |
| Frontend | React 18 + TypeScript |
| SSR Bridge | Inertia.js v2 |
| Styling | Tailwind CSS v4 + Astryx design system |
| Database | PostgreSQL (Neon.tech) |
| Real-time | Pusher + Laravel Echo |
| Queue | Database driver + cron (1-min interval) |
| Hosting | Shared hosting (Hostinger) — considering VPS migration |

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Row-level multi-tenancy** | Every tenant has `tenant_id`; TenantScope filters automatically |
| **Zero subdomains** | All tenants at `app.pogrid.id/c/{slug}` — simpler deployment |
| **Two auth worlds** | Office (password) vs Floor (PIN) — workers don't need email |
| **Additive delta input** | Worker clicks "+2 pcs" instead of entering total — fast, intuitive |
| **Observer cascade** | Business logic lives in Eloquent observers, not controllers |
| **No persistent daemons** | Queue via cron `queue:work --stop-when-empty` — works on shared hosting |
| **Pusher instant toast** | Notifications are synchronous from observer; data processing is deferred to queue |

### Multi-Tenancy
- **Guard A (Office)**: email/username + password → `/login`
- **Guard B (Floor)**: select name + PIN numpad → `/c/{slug}`
- Office roles are blocked from PIN login (privilege escalation protection)
- Tenant identified by `slug` in URL path

### Role System

**Floor (12 roles):**
DRAFTER, PURCHASING, MACHINING, FABRICATION, ASSEMBLY, SURFACE, QC, DELIVERY, FINANCE, PRODUCTION, MAINTENANCE, PPIC

**Office (5 roles):**
STAFF, SALES, SUPERVISOR, MANAGER, DIRECTOR

### Stage System
- **Zero auto-injection** — Admin selects stages manually; no system-imposed stages
- **10 stage templates** — CNC Workshop, Fabrication, Engineering, Full Engineering, etc.
- **STAGE_ROLE_MAP** — keyword-based role-to-stage access matching
- **QC dependency gate** — all stages preceding QC must be COMPLETED before QC can update

---

## 4. Core Business Logic

### Progress Formulas

**Multi-piece (target_qty > 1):**
```
Item % = Σ(completed_qty across ALL stages) / (target_qty × stage_count) × 100
```

**Single piece (target_qty == 1):**
```
Item % = Σ(stage progress%) / stage_count
```

### PO Status Lifecycle
```
PENDING → IN_PROGRESS → COMPLETED → DELIVERED → CLOSED
                    ↓ CANCELLED (0% progress only)
                    ↓ TERMINATED (>0%, sunk-cost protection)
```

### Alert System

| Severity | Trigger | Auto-resolve |
|----------|---------|-------------|
| 🔴 RED — Stuck | Worker clicks "Report Kendala" | Worker resumes logging on that stage |
| 🔴 RED — Overdue | Current date > deadline AND item not COMPLETED | Item reaches 100% or deadline extended |
| 🟡 YELLOW — Risk | Days remaining ≤ 3 AND progress < 70% | Either condition clears |
| 🟡 YELLOW — Rework | QC logs reject_qty > 0 | Manual resolve |
| 🔵 BLUE | PIN reset requested by worker | Admin approves |

**Alert resolution**: Owner, Admin, or PPIC can resolve manually + input data.
**No escalation levels** — only the detection timestamp ages.

### QC Rework Flow
1. QC logs `reject_qty` → system spawns `"{stage} - REWORK"` sub-stage (0% / PENDING)
2. Original QC stage: `completed_qty -= reject_qty` (floored at 0)
3. YELLOW alert created (`reason_type = 'QC Rework'`)
4. If `item.status === COMPLETED` → forced back to `IN_PROGRESS`
5. REWORK stage excluded from QC gate dependency check
6. REWORK stage contributes to numerator but NOT denominator → item harder to complete

### Sunk-Cost Protection
- **Progress == 0%**: Cancel freely → `item.status = CANCELLED`
- **Progress > 0%**: Cancel disabled (HTTP 403)
- **Midway Termination** (`TERMINATE_MIDWAY`):
  - Freezes worker screen via Pusher ("Production Halted by Owner")
  - `completedPieces = round(Σ(completed_qty) / stage_count)` — conservative average
  - Dispatches `GenerateSunkCostInvoiceJob` to Finance for billing
  - `item.status = TERMINATED`

---

## 5. Deployment & Hosting

### Current: Shared Hosting (Hostinger)
- Nginx → PHP-FPM → Laravel
- SQLite for session/cache/queue
- PostgreSQL via Neon.tech (cloud, external)
- Pusher for WebSocket (external, free-tier)

### Queue Processing
- `queue:work --stop-when-empty` via cron every 1 minute
- **Toast notification: instant** (synchronous from observer during request)
- **Data processing: deferred** (queue processed every 1 minute via cron)

### Consideration: VPS Migration
- Shared hosting limitations: cron delay under load, memory limits, no persistent daemons
- VPS = more control, but founder must handle server, backup, security solo
- **Not decided yet** — still under consideration

---

## 6. Business Model

### Pricing
- **Trial**: 30 days
- **Payment**: Monthly billing, minimum 1-year commitment
- **Target customer**: Workshop with 20–30 people, ~20 POs/month

### Revenue Model
- SaaS subscription per tenant per year
- Minimum 1-year commitment
- Pricing not yet finalized

### Market Position
- **First mover advantage** — no direct competitor in this specific niche
- **ERP is overkill** — expensive training, complex, doesn't fit 20-person workshops
- **Excel + WhatsApp** — current tools, not real-time, no alerts
- **Value proposition**: "Boss can answer clients without calling the office. Late delivery = penalty. POgrid.id solves both."

---

## 7. Onboarding & Support

### Onboarding Flow
1. Owner/Admin signs up → creates tenant (name, slug)
2. Adds workers → name + role + PIN
3. Creates first PO → selects stage template → adds items
4. Workers PIN login → start logging progress

### Support Model
- **Founder provides direct support** — helps with initial setup
- **Quickstart guide** — must be created before launch
- **Starts from scratch** — no data migration from Excel

### First Customer Strategy
- **Former employer** — founder was previously Admin there
- **Not yet approached** — still in planning stage
- Pain already validated: boss frequently missed deadlines, had no project visibility

---

## 8. Current Status & Gaps

### What's Done ✅
- Core logic (progress tracking, alerts, QC rework, sunk-cost protection)
- Owner dashboard + user management
- Worker dashboard + PIN login
- Stage templates (10 templates)
- Archive tab (role-filtered)
- Real-time Pusher live sync
- Cross-role read-only visibility
- Partial invoice & delivery tracking
- Alert stale detection
- Knowledge graph (625+ nodes, 1200+ edges)
- Feature tests & unit tests

### Gaps / Not Yet Done 🔴

| Gap | Priority | Impact |
|-----|----------|--------|
| **Smoke test checklist** | #1 — CRITICAL | Find loopholes before launch |
| **UI/UX polish** | #2 — HIGH | User experience not mature yet |
| **Quickstart guide** | #3 — HIGH | Onboarding without founder assistance |
| **Landing page / marketing site** | #4 — MEDIUM | No web presence yet |
| **Payment integration** | #5 — MEDIUM | No automated billing |
| **Production deployment** | #6 — MEDIUM | Still on shared hosting / local |
| **Approach first customer** | #7 — MEDIUM | Former employer not yet contacted |

### Founder Constraints
- **Solo developer** — handles code, support, and sales alone
- **2 hours/day** — limited time allocation
- **0 tenants** — pre-launch, no revenue yet
- **No sales support** — all outreach is manual

---

## 9. Key Architectural Insights

### STUCK Status = Label Only, No Blocking
- STUCK status does NOT block other stages on the same item
- Other workers can continue working on different stages
- Staleness detection: stages with no updates within a configured timeframe get flagged

### Pusher Toast vs Data Processing
- **Toast**: Instant, synchronous from `ItemProgress::saved()` observer
- **Data processing**: Deferred, via queue cron every 1 minute
- Gap is acceptable: Owner sees "something happened" immediately, details load when queue catches up

### Trust-Based with Audit Trail
- Workers are trusted to input accurate numbers
- Detailed logs with timestamps record all activity
- Guard calculation planned for anomaly detection

### Owner Cannot Create POs
- Not a bug — deliberate design decision
- Owner = viewer only, Admin = operator
- Matches real-world workflow: boss wants visibility, not data entry

---

## 10. Recommendations After Grilling

### Immediate Priorities
1. **Create smoke test checklist** — test all flows from Owner, Admin, and Worker perspectives
2. **Approach former employer** — validate with a real user before polishing UI
3. **Write quickstart guide** — enable self-service onboarding
4. **Polish UI/UX** — after loopholes are identified and fixed

### Open Questions (Unresolved)
- What will the subscription price be?
- Where will the first 10 paying workshops come from?
- Final decision: VPS or stay on shared hosting?
- Who handles support if founder becomes overwhelmed?

---

*Document generated: July 29, 2026*
*Method: Grill-me interview (12 questions)*
*Status: Pre-launch, 0 tenants*
