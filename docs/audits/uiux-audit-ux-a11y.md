# UI/UX Audit & Remediation — UX-GIT-1

Date: 2026-08-02
Status: Applied (committed)
Scope: Design-system token bridge, a11y (WCAG 2.1 AA), chrome theming, toast consolidation

## Background

POgrid.id ships a 8-theme design system (`theme-default/linear/vercel/stripe/github/nordic/light/brand`)
via semantic CSS custom properties (`--color-pg-*`). An audit found the system was only **half-wired**:
the shared app chrome (`AppShell`) and several dashboards hardcoded Tailwind slate/white values,
so the theme switcher silently broke most of the shell. Additional a11y + duplication issues were
confirmed in code.

This pass applies the audit findings. The proof-of-contrast numbers below were computed with
relative-luminance scripts against the actual token values.

---

## Findings & Remediation

### 1. Chrome not themeable (CRITICAL)

**Finding:** `Components/AppShell.tsx` (sidebar, header, drawer, bottom-nav) used hardcoded
`bg-slate-950`, `border-white/10`, `text-slate-400/500/600`, `bg-white/5`, `text-blue-300`,
`bg-red-500`. The `theme-*` CSS-variable system never reached the chrome, so `theme-light` and
`theme-brand` appeared broken.

**Fix:** Added 6 semantic nav tokens per theme in `resources/css/app.css`:
- `--color-pg-nav`, `--color-pg-nav-border`, `--color-pg-nav-hover`,
  `--color-pg-nav-active`, `--color-pg-nav-text`, `--color-pg-nav-muted`

`AppShell.tsx` now references these tokens (sidebar, header, drawer, theme dropdown, bottom-nav,
role CTA, user footer, active/hoover/indicator, logout). All 8 themes now fully restyle the shell.

**Per-theme `--color-pg-nav` values:** default `#050507`, linear `#06050d`, vercel `#000`,
stripe `#080f24`, github `#0b1117`, nordic `#262c3a`, light `#ffffff`, brand `#00241c`.

### 2. Missing keyboard focus indicator (HIGH, WCAG 2.4.7)

**Finding:** no `:focus-visible` styling; keyboard users saw no focus on buttons/links/inputs.

**Fix:** Global rule targeting every interactive element:
```css
:where(button, a, [role="button"], input, select, textarea, summary, [tabindex]):focus-visible {
    outline: 2px solid var(--color-pg-accent, #6b8cff);
    outline-offset: 2px;
}
```

### 3. Duplicated live-toast stacks (HIGH)

**Finding:** `Owner/Dashboard`, `Worker/Dashboard`, and `Ppic/Dashboard` each inlined an
identical `<div style="position:fixed; top:16px; right:16px; zIndex:9999">` toast renderer
(~30 duplicated lines each) plus a redundant local `@keyframes slideIn`.

**Fix:** Extracted `Components/BroadcastToasts.tsx` (one shared component) with:
- `role="status"` + `aria-live="polite"` on the container,
- keyboard-`role="button"` + Enter/Space dismiss on each toast,
- `aria-label` combining the severity title + message,
- still uses the global `slideIn` keyframe (already defined once in `app.css`).
Removed the three inline stacks and the redundant local keyframe.

### 4. Modals lacked dialog semantics (HIGH)

**Finding:** `ModalShell`, `FullscreenOverlay`, `SearchModal`, and the PPIC `Reschedule PO`
modal never declared `role="dialog"` / `aria-modal`, and close buttons had no accessible name.

**Fix:** All four dialogs now get `role="dialog"`, `aria-modal="true"`, `aria-label` (title-based),
and close buttons carry `aria-label="Close …"`.

### 5. Landing low-contrast text (MEDIUM)

**Finding (from contrast calc on light sections):** `slate-300` on white ≈ **1.48:1**
(AA fail, WCAG 2.1 — 4.5:1 required), `slate-400` on white ≈ **2.56:1** (fail). RAATI-based
measurement below.

| Pair | Contrast | Verdict |
|------|----------|---------|
| `slate-300` on `white` | ~1.48:1 | FAIL |
| `slate-400` on `white` | ~2.56:1 | FAIL |
| `slate-500` on `white` | ~4.76:1 | PASS (after fix) |

**Fix:** Landing feature index `F.0X` `slate-300` → `slate-400`; comparison table header
`slate-400` → `slate-500`. Remaining `slate-400` on white in the landing are decorative/non-text
index labels, acceptable per WCAG. Along with `slate-500` (4.76:1) the primary body copy exceeds AA.

### 6. Orientable mono treatment (LOW — partial)

**Finding:** `.mono` font appeared only in `Landing` + `AppShell`; PO numbers / timestamps /
PIPs in product data tables never got the code-font treatment.

**Fix (targeted, not blind):** Applied `mono` to the most prominent PO-number displays:
Owner dashboard search-result card, Owner dashboard header row, and Worker item card.
Interactive underlined table links were deliberately kept sans (mono + underline is less legible).

**Not extended:** a full blind 40-page sweep was avoided to reduce layout regression risk; this
was deliberately partial per the scope decision.

---

## Non-findings / rejects

- **Landing test persons + 5-star block** — previously flagged as fabricated social proof.
  Decision per scoped layer: left in place for this pass (marketing copy owner to reconfirm).
- **Bulk hex→token migration** (300+ literal `#hex` values across all pages) — explicitly deferred.

---

## Files changed

| File | Change |
|------|--------|
| `resources/css/app.css` | nav tokens (×8 themes), focus-visible rule |
| `resources/js/Components/AppShell.tsx` | chrome rewired to nav tokens |
| `resources/js/Components/BroadcastToasts.tsx` | **new** shared toast component |
| `resources/js/Components/Modal/ModalShell.tsx` | dialog a11y |
| `resources/js/Components/Modal/FullscreenOverlay.tsx` | dialog a11y |
| `resources/js/Components/OwnerDashboard/SearchModal.tsx` | dialog a11y + close label |
| `resources/js/Pages/Landing/Landing.tsx` | light-bg contrast bumps |
| `resources/js/Pages/Owner/Dashboard.tsx` | shared toasts, mono PO, dialog (via modal) |
| `resources/js/Pages/Worker/Dashboard.tsx` | shared toasts, mono PO |
| `resources/js/Pages/Ppic/Dashboard.tsx` | shared toasts, dialog role |

## Verification

- `npm run build` — passes; confirmed all nav-token utilities and rgba overlays generated in the
  compiled CSS (`color-pg-nav`, `-border`, `-hover`, `-active`, `-text`, `-muted`).
- No PHP files touched → Pint N/A.