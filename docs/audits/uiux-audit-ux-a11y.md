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

## Round 3 — Landing honest-social-proof & display-font scope

### 7. Fabricated social proof (CRITICAL)

**Finding:** Now affirmatively rejected (no longer "left in place"). The landing sold on a hero
trust bar of invented initials (HG/RK/DF/JS) + 5 stars, and a testimonials/quote section — there
is verifiably no real, consenting customer yet.

**Fix:** Removed the fake star+initials trust bar and replaced it with an honest early-access
gate (new keys `hero_access_label` / `hero_access_note` in both lang dicts); removed the
testimonials section and the dead `StarRow` / `QuoteIcon` components. **ZERO testimonials shipped.**

**Sell via capability, not borrowed voice:** hero now leads with the "Papan PO" demo mockup —
live Aman/Rawan/Telat statuses.

### 8. Display-font scope creep (MEDIUM)

**Decision:** Oswald stencil type is applied **only** to headings / section titles
(`.landing-display`), never to body or data.

- body stays Inter; data/mono stays IBM Plex Mono (added Oswald line to the Webfonts import).
- `metrics` count-up band removed entirely (dead `CountUp` gone), stats now appear only once,
  integrated into the untouched "Cara Kerja" section.

### 9. Stats duplication (LOW)

**Finding:** stats appeared twice (hero + full METRICS BAND). Removed the band; single instance
remains in "Cara Kerja".

### 10. 01/02/03 numbering (MEDIUM)

**Decision:** numbering retained only where it denotes real process order (actual familiarization
"a + b = c" style), not as decorative index labels.

### Builds

- `npm run build` passes after all round-3 cuts; Landing chunk shrank **83.9 → 80.7 kB** gzip.
- `CountUp`, `StarRow`, `QuoteIcon` confirmed dead (no references) before removal.

---

## Non-findings / rejects

- **Landing test persons + 5-star block** — previously flagged as fabricated social proof.
  Decision per scoped layer: left in place for this pass (marketing copy owner to reconfirm).
- **Bulk hex→token migration** (300+ literal `#hex` values across all pages) — explicitly deferred.

---

## Files changed

| File | Change |
|------|--------|
| `resources/css/app.css` | nav tokens (×8 themes), focus-visible rule; Oswald added to Webfonts (r3) |
| `resources/js/Components/AppShell.tsx` | chrome rewired to nav tokens |
| `resources/js/Components/BroadcastToasts.tsx` | **new** shared toast component |
| `resources/js/Components/Modal/ModalShell.tsx` | dialog a11y |
| `resources/js/Components/Modal/FullscreenOverlay.tsx` | dialog a11y |
| `resources/js/Components/OwnerDashboard/SearchModal.tsx` | dialog a11y + close label |
| `resources/js/Pages/Landing/Landing.tsx` | light-bg contrast bumps; round-3 hero/proof/mono rewrite |
| `resources/js/Pages/Owner/Dashboard.tsx` | shared toasts, mono PO, dialog (via modal) |
| `resources/js/Pages/Worker/Dashboard.tsx` | shared toasts, mono PO |
| `resources/js/Pages/Ppic/Dashboard.tsx` | shared toasts, dialog role |

## Verification

- `npm run build` — passes; confirmed all nav-token utilities and rgba overlays generated in the
  compiled CSS (`color-pg-nav`, `-border`, `-hover`, `-active`, `-text`, `-muted`).
- Round 3: `npm run build` passes after dead-code removal; Landing chunk **83.9 → 80.7 kB** gzip.
- No PHP files touched → Pint N/A.