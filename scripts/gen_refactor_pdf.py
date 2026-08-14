#!/usr/bin/env python3
"""Generate corporate-grade refactor plan PDF for POgrid.id"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, ListFlowable, ListItem,
                                KeepTogether)
from reportlab.lib.randomtext import randomText  # noqa (unused guard)
import datetime

OUT = "/home/tito/pogrid/POgrid-Refactor-Plan-2026-08-12.pdf"

BRAND   = colors.HexColor("#2563eb")   # POgrid primary blue
DARK    = colors.HexColor("#0f172a")
SLATE   = colors.HexColor("#334155")
LIGHT   = colors.HexColor("#eef2ff")
ROWALT  = colors.HexColor("#f8fafc")
AMBER   = colors.HexColor("#b45309")
GREEN   = colors.HexColor("#047857")
RED     = colors.HexColor("#b91c1c")
WHITE   = colors.white

styles = getSampleStyleSheet()

def S(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

st_title   = S("t", parent=styles["Title"], textColor=DARK, fontSize=26, leading=30, spaceAfter=6)
st_sub     = S("s", textColor=BRAND, fontSize=13, leading=16, spaceAfter=2)
st_meta    = S("m", textColor=SLATE, fontSize=9.5, leading=14)
st_h1      = S("h1", parent=styles["Heading1"], textColor=BRAND, fontSize=16, leading=20, spaceBefore=14, spaceAfter=6)
st_h2      = S("h2", parent=styles["Heading2"], textColor=DARK, fontSize=12.5, leading=16, spaceBefore=10, spaceAfter=4)
st_h3      = S("h3", parent=styles["Heading3"], textColor=SLATE, fontSize=11, leading=14, spaceBefore=8, spaceAfter=3)
st_body    = S("body", fontSize=9.8, leading=14.5, textColor=DARK, spaceAfter=6, alignment=TA_LEFT)
st_bullet  = S("bullet", parent=st_body, leftIndent=12, spaceAfter=3)
st_small   = S("small", fontSize=8.5, leading=12, textColor=SLATE)
st_cell    = S("cell", fontSize=8.8, leading=11.5, textColor=DARK)
st_cellB   = S("cellB", parent=st_cell, fontName="Helvetica-Bold")
st_cellW   = S("cellW", parent=st_cell, textColor=WHITE, fontName="Helvetica-Bold")
st_note    = S("note", parent=st_body, textColor=SLATE, backColor=LIGHT, borderPadding=6, borderColor=BRAND, borderWidth=0.8, borderPadding_top=6)

story = []

# ------------------------------------------------------------------ COVER
story.append(Spacer(1, 40*mm))
story.append(Paragraph("POgrid.id", st_title))
story.append(Paragraph("Refactor &amp; Security Remediation Plan", st_sub))
story.append(Spacer(1, 6))
story.append(Paragraph("Engineering Remediation Roadmap · v1.0", st_meta))
story.append(Paragraph("Prepared: 12 August 2026 · Classification: Internal — Engineering", st_meta))
story.append(Paragraph(
    "Laravel 11 · Inertia.js v2 · React 18 · TypeScript · Tailwind v4 · Vite 8", st_meta))
story.append(Spacer(1, 18))
story.append(Paragraph(
    "This document translates the codebase audit (POgrid-Audit-2026-08-12.pdf) into a "
    "prioritized, test-gated remediation plan. All 7 critical and 14 high findings from the "
    "audit are mapped to surgical, bounded tasks across four execution phases. Domain logic "
    "the audit explicitly rates as strong (observer-driven progress engine, additive-delta "
    "model, QC-rework sub-stages, sunk-cost protection) is intentionally left untouched.",
    st_body))
story.append(Spacer(1, 10))
story.append(Paragraph(
    "<b>Deliverable status:</b> All critical findings verified against the current working "
    "tree on the date of preparation. Line references were reconfirmed for the security "
    "cluster (C1–C5) and the two frontend render crashes (C6, C7).",
    st_note))
story.append(PageBreak())

# ------------------------------------------------------------------ TOC
story.append(Paragraph("Contents", st_h1))
toc_rows = [[
    Paragraph("<b>#</b>", st_cellB),
    Paragraph("<b>Section</b>", st_cellB),
    Paragraph("<b>Phase</b>", st_cellB),
    Paragraph("<b>Findings</b>", st_cellB),
]]
toc = [
    ("1", "Executive Verdict &amp; Scope", "1", "Immediate", "N/A"),
    ("2", "Phase 1 — Stop the Bleeding", "1", "Immediate", "C1–C7, M2, M3, §6.1"),
    ("3", "Phase 2 — High Severity", "2", "Weeks 2–4", "H1–H4, M1, M4–M6, §4.x, §6.4"),
    ("4", "Phase 3 — Structural", "3", "Quarter", "God-objects, typing, i18n, CI"),
    ("5", "Testing &amp; Verification Strategy", "All", "Ongoing", "N/A"),
    ("6", "Risk Register &amp; Tradeoffs", "All", "Ongoing", "N/A"),
    ("7", "Open Questions", "All", "Resolve early", "N/A"),
]
for n, sec, ph, when, f in toc:
    toc_rows.append([
        Paragraph(n, st_cell),
        Paragraph(sec, st_cell),
        Paragraph(ph, st_cell),
        Paragraph(when, st_cell),
        Paragraph(f, st_cell),
    ])
t = Table(toc_rows, colWidths=[10*mm, 72*mm, 32*mm, 32*mm, 42*mm], repeatRows=1)
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), BRAND),
    ("TEXTCOLOR", (0,0), (-1,0), WHITE),
    ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cbd5e1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, ROWALT]),
    ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story.append(t)
story.append(Spacer(1, 8))
story.append(Paragraph(
    "<b>Finding severity reference:</b> 7 Critical · 14 High · 21 Medium · 18 Low / Info — "
    "per the commissioning audit. This plan addresses 100% of critical and high findings.",
    st_small))
story.append(PageBreak())

# ------------------------------------------------------------------ 1. Executive verdict
story.append(Paragraph("1. Executive Verdict &amp; Scope", st_h1))
story.append(Paragraph(
    "POgrid.id's domain core is genuinely strong. The observer-driven progress cascades, "
    "additive-delta progress model, QC-rework sub-stage spawning, and sunk-cost protection "
    "are thoughtful, well-tested designs (~6,700 LOC of feature tests across 14 suites). "
    "Tenant isolation on worker-mutating endpoints is verified solid, there is no "
    "<i>$request-&gt;all()</i> mass-assignment anywhere, no XSS sinks, and zero "
    "TODO/FIXME/HACK comments in application code.", st_body))
story.append(Paragraph(
    "The production risk concentrates in two clusters and one systemic gap:", st_body))
story.append(Paragraph(
    "<b>(A) Authorization collapse.</b> The <i>verified</i> middleware is a no-op: "
    "<i>User</i> does not implement <i>MustVerifyEmail</i>, so the <i>instanceof</i> check on "
    "the middleware never matches and every office route is reachable by any authenticated "
    "floor worker. Combined with a permissive <i>UserPolicy::manage</i> and an unguarded "
    "PIN-reset approval, full tenant-admin account takeover is feasible from a 4-digit PIN "
    "session. A cross-tenant write IDOR in the PPIC endpoints and a logo-upload RCE close "
    "out the critical set.", st_body))
story.append(Paragraph(
    "<b>(B) Frontend delivery discipline.</b> 561 TypeScript compile errors never surface "
    "because <i>npm run build</i> is a plain <i>vite build</i> (esbuild strips types without "
    "checking). Two render-time ReferenceErrors white-screen the most-used pages (Worker "
    "floor dashboard; Owner Dashboard matrix tab).", st_body))
story.append(Paragraph(
    "<b>Verdict:</b> All critical findings are fixable with small, high-certainty diffs. "
    "This plan prioritizes closing the security cluster first, wire the type-check gate, "
    "then address high severity and structural debt.", st_body))

# --------------------------------------------------------------- 2. Phase 1
story.append(Paragraph("2. Phase 1 — Stop the Bleeding (Week 1)", st_h1))
story.append(Paragraph(
    "All tasks below are bounded and test-gated. Phase 1 exit gate: 7 critical findings "
    "closed, <i>RoleSecurityRemediationTest</i> extended, <i>npm run typecheck</i> green, "
    "full <i>php artisan test</i> green. No domain-logic changes.", st_body))

t1 = [
    [Paragraph("<b>Task</b>", st_cellW), Paragraph("<b>Finding</b>", st_cellW),
     Paragraph("<b>Action (surgical)</b>", st_cellW), Paragraph("<b>Effort</b>", st_cellW)],
    [Paragraph("T1 — Office route gate", st_cellB), Paragraph("C1, M3", st_cell),
     Paragraph("New <i>office</i> middleware (role_level == office) on the routes/web.php:59 "
               "group; remove the testing-env bypass in EnsureEmailIsVerified; do NOT make "
               "User implement MustVerifyEmail.", st_cell), Paragraph("~1h", st_cell)],
    [Paragraph("T2 — UserPolicy tighten", st_cellB), Paragraph("C2", st_cell),
     Paragraph("Allow manage() only for office roles; forbid non-owners granting office "
               "roles; block self role-change at updateUser.", st_cell), Paragraph("~2h", st_cell)],
    [Paragraph("T3 — PIN-reset hardening", st_cellB), Paragraph("C3, HIGH-untested", st_cell),
     Paragraph("Authorize approvePinReset; never persist plaintext PIN (flash-only + "
               "one-time reference); throttle request endpoint; fix item_id=0 FK bug.", st_cell),
     Paragraph("~2h", st_cell)],
    [Paragraph("T4 — PPIC IDOR", st_cellB), Paragraph("C4", st_cell),
     Paragraph("view-tenant + office/PPIC gate on updatePo &amp; updateItemPriority; stop "
               "re-pinning tenant scope to a foreign slug.", st_cell), Paragraph("~30m", st_cell)],
    [Paragraph("T5 — Logo RCE", st_cellB), Paragraph("C5", st_cell),
     Paragraph("storePublicly() with hash+MIME name from storage/; .htaccess engine-off in "
               "public/uploads; office-only gate.", st_cell), Paragraph("~1h", st_cell)],
    [Paragraph("T6 — Render crashes + typecheck", st_cellB), Paragraph("C6, C7", st_cell),
     Paragraph("Fix Worker/Dashboard.tsx:1858 + ActiveDelayDirectory missing props; add "
               "tsc --noEmit to build + CI (zero NEW errors first).", st_cell), Paragraph("~3h", st_cell)],
    [Paragraph("T7 — Missing happy-path tests", st_cellB), Paragraph("§6.1", st_cell),
     Paragraph("PIN-reset happy path, forgot/reset password, profile, BackfillItemStages "
               "guards.", st_cell), Paragraph("~3h", st_cell)],
]
t = Table(t1, colWidths=[38*mm, 22*mm, 108*mm, 20*mm], repeatRows=1)
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), DARK),
    ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cbd5e1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, ROWALT]),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story.append(t)

story.append(Paragraph("2.1 Key remediation detail — C1 root cause", st_h2))
story.append(Paragraph(
    "<i>routes/web.php:59</i> applies <i>'verified'</i> to the office group. The middleware "
    "<i>EnsureEmailIsVerified.php:22</i> only blocks when <i>user instanceof MustVerifyEmail</i>. "
    "<i>app/Models/User.php:11</i> extends <i>Authenticatable</i> (no verification interface), so "
    "the guard is false for every user and the middleware is a silent no-op — confirmed in the "
    "working tree on 2026-08-12. The fix is a dedicated <i>office</i> role gate, not "
    "re-activating the half-dead email-verification flow.", st_body))

story.append(Paragraph("2.2 Key remediation detail — C3 credential recovery", st_h2))
story.append(Paragraph(
    "PIN reset is the only credential-recovery path for floor workers, has zero happy-path "
    "tests, and currently persists the new plaintext PIN into a broadcast alert. Remediation "
    "keeps UX (admin approves, worker sees PIN once) while removing plaintext-at-rest and "
    "enforcing an admin/owner gate.", st_body))
story.append(PageBreak())

# --------------------------------------------------------------- 3. Phase 2
story.append(Paragraph("3. Phase 2 — High Severity (Weeks 2–4)", st_h1))
p2 = [
    [Paragraph("<b>ID</b>", st_cellW), Paragraph("<b>Finding</b>", st_cellW),
     Paragraph("<b>Action</b>", st_cellW), Paragraph("<b>Effort</b>", st_cellW)],
    [Paragraph("H2", st_cellB), Paragraph("Office login unthrottled", st_cell),
     Paragraph("throttle:5,1 on POST /login with per-username key", st_cell), Paragraph("0.5h", st_cell)],
    [Paragraph("H3", st_cellB), Paragraph("Weak PIN policy", st_cell),
     Paragraph("6-digit min; per-user_id throttle key; lockout/backoff after N failures", st_cell), Paragraph("2h", st_cell)],
    [Paragraph("H1", st_cellB), Paragraph("Telemetry leak across tenants", st_cell),
     Paragraph("Add items.tenant_id filter to both raw DB queries (WorkerDashboardController)", st_cell), Paragraph("0.5h", st_cell)],
    [Paragraph("H4", st_cellB), Paragraph("Credentials in logs/flash", st_cell),
     Paragraph("Gate mail logger to local env; strip temp password from flash; redact tokens", st_cell), Paragraph("1h", st_cell)],
    [Paragraph("M1", st_cellB), Paragraph("TenantScope fails open", st_cell),
     Paragraph("Fail closed (whereRaw('1=0') or throw) when no tenant set + not bypassed", st_cell), Paragraph("1h", st_cell)],
    [Paragraph("M4", st_cellB), Paragraph("SESSION_SECURE_COOKIE unset", st_cell),
     Paragraph("Set true in prod .env; consider HSTS", st_cell), Paragraph("10m", st_cell)],
    [Paragraph("M5", st_cellB), Paragraph("Password policy divergence", st_cell),
     Paragraph("Centralize Password::min(8)-&gt;numbers() rule", st_cell), Paragraph("0.5h", st_cell)],
    [Paragraph("M6", st_cellB), Paragraph("CSV/XLSX formula injection", st_cell),
     Paragraph("Prefix =,+,@,- cells with a single quote in ExportService", st_cell), Paragraph("0.5h", st_cell)],
    [Paragraph("§4.3", st_cellB), Paragraph("Draft restore fragility", st_cell),
     Paragraph("Schema/version guard on CreatePo draft; scope DRAFT_KEY per tenant", st_cell), Paragraph("2h", st_cell)],
    [Paragraph("§4.7", st_cellB), Paragraph("Systemic duplication", st_cell),
     Paragraph("Extract shared permissions/Echo-Pusher/clock modules", st_cell), Paragraph("3h", st_cell)],
    [Paragraph("§4.4", st_cellB), Paragraph("Missing onError handlers", st_cell),
     Paragraph("Add to worker progress/kendala/rework/finance mutations", st_cell), Paragraph("1h", st_cell)],
    [Paragraph("§6.4", st_cellB), Paragraph("Deploy fragility", st_cell),
     Paragraph("Single deploy script; add migrate --force; decide --delete; drop public/hot artifact", st_cell), Paragraph("2h", st_cell)],
]
t = Table(p2, colWidths=[16*mm, 52*mm, 100*mm, 20*mm], repeatRows=1)
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), DARK),
    ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cbd5e1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, ROWALT]),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story.append(t)
story.append(Paragraph(
    "<b>Defer decision:</b> Laravel 12 upgrade (framework EOL March 2026) and PHPUnit upgrade "
    "are scheduled as a dedicated migration task, not bolted onto this work.", st_note))

# --------------------------------------------------------------- 4. Phase 3
story.append(Paragraph("4. Phase 3 — Structural (Quarter)", st_h1))
for item in [
    "Decompose Owner/Dashboard.tsx (4,203 LOC) and WorkerDashboardController.php (1,946 LOC); "
    "extract getTelemetryData (~500 LOC) and validateStageAccess (~140 LOC) into services.",
    "Adopt types/index.d.ts shared models (imported by zero files today; three divergent local "
    "Item interfaces exist). Type useTranslation keyed by locale JSON; ratchet strict: true.",
    "Code-split pages via React.lazy per page group; stop eager-bundling the 4,200-line Owner "
    "Dashboard with Pusher + Echo + all locales.",
    "Consolidate the three parallel i18n mechanisms into locale JSONs; stake inline-string "
    "parity for the EN/ID pair.",
    "Migrate inline style={{}} blocks (~1,200) to theme-aware classes — the theme/cascade "
    "architecture is correct; this is adoption, not redesign.",
    "Add a PgSQL CI test job, an E2E smoke suite in CI, and a composer audit gate "
    "(policy.advisories.block: true).",
]:
    story.append(Paragraph("• " + item, st_bullet))

# --------------------------------------------------------------- 5. Testing
story.append(Paragraph("5. Testing &amp; Verification Strategy", st_h1))
for item in [
    "TDD per task: failing test → minimal implementation → green (enforced in Phase 1).",
    "Regression base: full php artisan test before and after every phase; composer test for "
    "the fast loop.",
    "Frontend: npm run typecheck wired into build + CI (Phase 1); existing Puppeteer/Jest E2E "
    "added to CI.",
    "Never regress: observers' weighted-progress cascade, QC-rework sub-stage spawn, "
    "sunk-cost TERMINATED logic, tenant isolation on worker mutations.",
]:
    story.append(Paragraph("• " + item, st_bullet))
story.append(Paragraph(
    "<b>Exit criteria:</b> 0 critical findings open; RoleSecurityRemediationTest covers a "
    "floor-role actor for every office endpoint; typecheck green; PgSQL parity job green.",
    st_note))

# --------------------------------------------------------------- 6. Risk
story.append(Paragraph("6. Risk Register &amp; Tradeoffs", st_h1))
risks = [
    [Paragraph("<b>Risk</b>", st_cellW), Paragraph("<b>Severity</b>", st_cellW),
     Paragraph("<b>Mitigation</b>", st_cellW)],
    [Paragraph("Office middleware breaks legit hybrid flows", st_cellB), Paragraph("Med", st_cell),
     Paragraph("Enumerate every route in the group during T1; set gates by declared intent.", st_cell)],
    [Paragraph("Removing plaintext PIN changes admin UX", st_cellB), Paragraph("Low", st_cell),
     Paragraph("PIN still delivered via flash on approve; one-time-token as follow-on option.", st_cell)],
    [Paragraph("tsc --noEmit red-builds until 561 errors resolve", st_cellB), Paragraph("Med", st_cell),
     Paragraph("Gate on zero NEW errors first, then ratchet to zero; do not ship a red build.", st_cell)],
    [Paragraph("Deploy --delete risk to prod-only files", st_cellB), Paragraph("Med", st_cell),
     Paragraph("Scope exclusions (storage/uploads) before enabling; unify script first.", st_cell)],
]
t = Table(risks, colWidths=[62*mm, 22*mm, 104*mm], repeatRows=1)
t.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,0), DARK),
    ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cbd5e1")),
    ("ROWBACKGROUNDS", (0,1), (-1,-1), [WHITE, ROWALT]),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story.append(t)

# --------------------------------------------------------------- 7. Questions
story.append(Paragraph("7. Open Questions", st_h1))
for item in [
    "<b>Email verification:</b> keep 'verified' as a real future gate or delete it? "
    "Recommended: delete middleware, keep office gate.",
    "<b>PIN delivery:</b> is flash-only sufficient, or build one-time-token redemption? "
    "Recommended: flash-only for v1.",
    "<b>Logs/telemetry scope:</b> owner+office only, or visible to some floor roles?",
]:
    story.append(Paragraph("Q. " + item, st_bullet))

# --------------------------------------------------------------- footer/cover page
def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(SLATE)
    canvas.drawString(20*mm, 12*mm, "POgrid.id  ·  Refactor & Security Remediation Plan v1.0")
    canvas.drawRightString(190*mm, 12*mm, f"Page {doc.page}")
    canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 15*mm, 190*mm, 15*mm)
    # top rule
    canvas.setStrokeColor(BRAND)
    canvas.setLineWidth(2)
    canvas.line(20*mm, 295*mm, 190*mm, 295*mm)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.setFillColor(BRAND)
    canvas.drawString(20*mm, 297.5*mm, "POGRID.REFACTOR.2026-08-12")
    canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=A4,
                        leftMargin=20*mm, rightMargin=20*mm,
                        topMargin=14*mm, bottomMargin=20*mm,
                        title="POgrid Refactor & Security Remediation Plan",
                        author="POgrid Engineering")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("WROTE", OUT)
