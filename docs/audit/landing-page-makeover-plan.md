# POgrid.id Landing Page — Makeover Plan (Refactor + Full Package / Clean SaaS)

Date: 2026-08-14
Source audit: `docs/audit/landing-page-audit.md` (2026-08-13, Overall B+ / 7.0, 1,397-LOC monolith)
Scope: `resources/js/Pages/Landing/Landing.tsx` + `resources/css/app.css` + `resources/js/i18n/locales/{en,id}.json` + `routes/web.php` + `resources/views/app.blade.php` + `public/*` + tests/probe
Decisions (user-confirmed): Goal **Full package** · Style **Clean SaaS** · Proof **No proof yet** (product-trust only) · Scope **Refactor + makeover**

---

## 1. Goals & Success Metrics

Primary metric: **landing → register/demo conversion** (clicks to `app.pogrid.id/register` + `wa.me`).

Targets:
- Mobile hero no longer text-only (product visual above the fold on <640px and 640–1023px).
- Placeholder social links gone; no dead `#` hrefs in footer.
- a11y: mobile menu `aria-expanded`/`aria-controls`, keyboard-navigable simulator, skip link.
- SEO: `hreflang`, `og:image:width/height` + proper 1200×630 OG image, FAQ `FAQPage` JSON-LD.
- i18n: single source of truth `pogrid_lang` (remove redundant `pogrid_landing_lang` + dead `detectLang()`).
- Architecture: hotspot `Landing.tsx` decreasing; no new business truth duplicated in TS.

Non-goals (scope lock): no ERP/accounting modules, no microservices/repos/GraphQL/Redis/Redux, no testimonial fabrication, no pricing tier invention beyond showing monthly vs annual clearly.

---

## 2. Visual Direction — Clean SaaS

Keep `bg-white` / `text-slate-*` / `border-slate-200` language already in the page. Strengthen with:
- Light, airy B2B SaaS cards, restrained motion, real product screenshots instead of pure JSX mockups.
- Consistent 12-col grid + `max-w-[1200px] mx-auto border-x` chrome reused everywhere.
- CTA hierarchy: `btn-dark` (primary register) + `btn-white` / outline (WhatsApp/secondary) — do not invent new button system.
- Motion: keep `Reveal` (IntersectionObserver) + `prefers-reduced-motion` handling; no new animation framework.

Explicitly NOT doing: dark control-room theme, monochrome Linear/Vercel direction, heavy gradients. Landing already has `slate-950` hero/final CTA — keep those but clean up contrast, not re-theme to dark.

Proof stance: **no customer logos**. Replace sector/proof cards with product-trust proof (Tenant Isolation / Cloud / Setup / No Credit Card) + feature clarity; do not render unused `testimonials` (en/id:805–824) as if real.

---

## 3. Information Architecture (keep 14 sections, reorder/polish)

1. Top rule + sticky nav (mobile menu fix)
2. Hero — copy left, product visual right, **mobile visual added**
3. Sectors marquee (pause-on-hover + a11y label kept)
4. Pain Points (01–04)
5. How It Works (3 steps)
6. Features grid (F.01–F.06) — add real product imagery
7. Comparison table (Spreadsheet/WhatsApp vs POgrid)
8. Sectors + proof cards (CNC/Fabrication/Assembly) — de-hype, product-trust wording
9. Trust band (4 items)
10. Pricing — clarify monthly vs annual
11. FAQ — fix `max-height` 400px clip
12. Final CTA (dark `slate-950` + `cta-grid`)
13. Footer — fix social links

Locale namespace stays `Landing_Landing` (`en.json:613–947`, `id.json:613–947`).

---

## 4. Structural Refactor — File Ownership

Controller rule & hotspot budget apply: `Landing.tsx` must decrease; new feature work goes to `features/`-style modules — for landing, `resources/js/Pages/Landing/components/`.

Create (new):

```
resources/js/Pages/Landing/
  Landing.tsx            # page composition only — imports, state, Head/JSON-LD, layout
  components/
    Reveal.tsx           # from Landing.tsx:43–74
    SectionHead.tsx      # 76–86
    LangToggle.tsx       # 264–283
    Navigation.tsx       # 411–491 (sticky header + mobile panel)
    Hero.tsx             # 493–854 (copy + CTAs + stats + product visual + simulator)
    Simulator.tsx        # 686–853 + sim state machine (pin → update → success)
    Marquee.tsx          # 856–871
    PainPoints.tsx       # 873–899
    HowItWorks.tsx       # 901–928
    Features.tsx         # 930–952
    Comparison.tsx       # 954–1000
    Sectors.tsx          # 1002–1025
    TrustBand.tsx        # 1027–1046
    Pricing.tsx          # 1048–1108
    Faq.tsx              # 1110–1146
    FinalCta.tsx         # 1148–1183
    Footer.tsx           # 1185–1247
    icons.tsx            # 92–253 (all 20+ inline SVG icons)
  landing.css            # extract 1249–1394 inline <style> → real CSS file/cacheable
```

Modify:
- `resources/js/Pages/Landing/Landing.tsx` — orchestration only; delete inline icons/css, replace with imports.
- `resources/css/app.css` — de-duplicate font loading (current duplicate: `app.css:8` imports Oswald+Inter+IBM Plex Mono while `Landing.tsx:373–375` loads Inter+IBM Plex Mono again). Choose one loader; add `display=swap` + preconnect.
- `resources/js/i18n/locales/en.json` + `id.json` — prune/fix: `nav_demo` (626), `logo_strip_label` (673), `pain_tag` (677) are unused; decide keep vs remove; do not add duplicate vocab.
- `resources/views/app.blade.php` — confirm Vite head, favicon, no extra landing logic needed.
- `public/pogrid-logo.png` stays; add new OG image `public/og-image.png` (1200×630) and stop using small logo as `og:image`.

Do NOT touch: `routes/web.php:15–23` domain routing closure (unless adding hreflang needs controller — prefer Head tags over route change), `AppServiceProvider` workflow prop (landing owns its own copy, not app workflow).

---

## 5. Phased Implementation

### Phase 0 — Prep / Scaffolding (no visual change)

- Create `resources/js/Pages/Landing/components/` + `landing.css`.
- Add baseline checks: `npm run typecheck:ci` must pass, `scripts/typecheck-baseline.txt` may only go down; `npm run build` OK.
- Snapshot current Lighthouse / a11y manual check so deltas are measurable.

### Phase 1 — Extract Monolith (risk: low, payoff: maintainability)

1. Move icons → `icons.tsx`, styles → `landing.css`, primitives → `Reveal.tsx`, `SectionHead.tsx`, `LangToggle.tsx`.
2. Extract sections one-by-one in order listed in §4; keep props as `t` slices + minimal local state.
3. Keep simulator state (`simPin`, `simStep`, `simProgress`, `isSending`, `poStatus`, `simDone`) inside `Simulator.tsx`; `Landing.tsx` holds only `lang`, `openFaq`, `scrolled`, `mobileOpen`.
4. Verify: `wc -l Landing.tsx` strictly decreasing after each extraction; build + manual smoke on `/` at 375px, 768px, 1024px, 1366px.

Acceptance: same pixels as before, just split files. No new UI.

### Phase 2 — P0/P1 Conversion Fixes (highest user value)

A. Mobile hero visual (P0)
- Current: `landing.css:1380–1388` — `.dashboard-mockup { display:none }` below 1024px, phone mockup hidden below 640px ⇒ mobile hero is text-only.
- Fix: add mobile-visible product visual (single simplified screenshot/card) inside `Hero.tsx` with `lg:hidden` variant; ensure one visual is present at <640px. Do not duplicate full desktop mockup — use stacked card or cropped view. Keep existing responsive wrappers; add new `.hero-visual-mobile` block.

B. Footer social links (P0)
- Current: `Landing.tsx:1200,1203` `href="#"` for LinkedIn/Instagram.
- Fix: remove placeholders or point to real profiles; if no profiles, remove those icons and keep WhatsApp only. Never ship `href="#"`.

C. Pricing transparency (P1)
- Current: `id` `price_*` / `plan_*` keys show `Rp250,000/month, billed annually` + `Rp3,000,000/year` note. Audit asked to show monthly vs annual more clearly.
- Fix: keep single "Factory Plan" but surface both rates side-by-side in `Pricing.tsx` (e.g., monthly equiv. + annual total), no new tier invented.

D. Keep: marquee is decorative (no links — intentional per No proof yet), pain points without fake stats.

### Phase 3 — Clean SaaS Visual Polish (reuse existing tokens)

- Hero: tighten spacing, improve contrast on dark bg (`slate-950` + `hero-grid` + `line-grad` kept); add mobile visual from 2A; ensure CTAs visible without scroll.
- Features grid: add one product screenshot per card or a single composite image section — real product proof instead of abstract text.
- Sectors/proof: de-hype copy; keep `CNC / Fabrication / Assembly` but avoid pseudo-customer claims.
- Pricing: center card already `max-w-[620px]`; add subtle `border + line-grad` polish, keep `btn-dark` CTA.
- No new color system; reuse `slate` + `blue-700` + semantic props.

### Phase 4 — a11y / SEO / i18n Correctness

a11y:
- Hamburger `button` `Landing.tsx:453–460`: add `aria-expanded={mobileOpen}` + `aria-controls="landing-mobile-menu"` + `id="landing-mobile-menu"` on panel `465`. Add skip-to-content link before header.
- Marquee `856–871`: add `aria-label={t.marquee_label}` and `role="region"`; keep pause-on-hover.
- Simulator: make numpad keyboard-navigable (`button` per key, `aria-label`, focus ring), support Enter/Backspace.
- Dashboard/phone mockups: add `role="img"` + `aria-label` or `alt` text.
- FAQ accordion: add `aria-expanded`, `aria-controls`, `id` per item.

SEO:
- Add `hreflang` for EN/ID inside `<Head>` (both `id_ID` and `en_US` alternates pointing to `https://pogrid.id/` with `?lang=` or path — pick one scheme and be consistent).
- Replace `og:image` from `pogrid-logo.png` (`381,388`) with `https://pogrid.id/og-image.png` (1200×630) + add `og:image:width` / `og:image:height`; same for `twitter:image`.
- Add `FAQPage` JSON-LD alongside existing `SoftwareApplication` schema (`390–405`). Source Q/A from `t.faqs`.
- Keep `title`, `description`, `keywords`, `robots`, `canonical` (`366–371`) as is; `og:locale` already switches on `lang`.

i18n:
- Remove redundant `pogrid_landing_lang` writes (`302–305`) and dead `detectLang()` (`9–20`, unused). Make landing `lang` come from `useTranslation('Landing_Landing')` which reads `pogrid_lang` (`i18n/useTranslation.ts:11–16`) so preference persists across landing → app. Landing `useEffect` should only set `document.documentElement.lang`.
- Audit keeps listing `pogrid_landing_lang` mismatch — actual bug is the extra key, not missing persistence.

### Phase 5 — Performance & Cleanup

- Font loading: de-duplicate. Keep one Google Fonts request (prefer `Landing.tsx` Head preconnect + stylesheet with `display=swap`), remove duplicate `@import` in `app.css:8` or scope it to app pages only. Avoid loading Oswald twice.
- Images: add `loading="lazy"` to footer logo, keep hero logo eager; add proper OG image.
- Inline style: fully moved to `landing.css` so it can be cached (current `1249–1394` inline block is not cacheable).
- Icons: all in `icons.tsx` as tree-shakeable components; no sprite sheet needed at this scale.
- No new deps: do not add carousel, animation, or icon libraries.

---

## 6. Files Changed / Created

| File | Action | Responsibility |
|------|--------|----------------|
| `resources/js/Pages/Landing/Landing.tsx` | modify (shrink) | Page composition, Head/JSON-LD, state wiring |
| `resources/js/Pages/Landing/components/*.tsx` | create (16 files) | Section ownership per §4 |
| `resources/js/Pages/Landing/landing.css` | create | Cacheable landing styles (ex-`1249–1394`) |
| `resources/css/app.css` | modify | De-duplicate font import |
| `resources/js/i18n/locales/{en,id}.json` | modify | Prune unused keys or wire them, fix copy |
| `public/og-image.png` | create | 1200×630 OG/Twitter image |
| `tests/Feature/DomainRoutingTest.php` | modify (add) | hreflang/OG assertions if added |
| `e2e-tests/check-hero.js` or new `e2e-tests/tests/landing.spec.js` | create/modify | Mobile hero visual probe |

Hotspot budgets after: `Landing.tsx` target <600 LOC and decreasing; no new business logic added to the page component.

---

## 7. Tests to Add / Update

- `tests/Feature/DomainRoutingTest.php` — add: landing renders `hreflang` (if added), `og:image:width/height`, `FAQPage` JSON-LD present.
- `e2e-tests/tests/landing.spec.js` (new) or extend `check-hero.js`: assert mobile hero visual is visible at 375px and 768px, desktop mockups visible at 1366px; nav `aria-expanded` toggles; simulator keyboard works.
- `npm run typecheck:ci` — must pass; baseline (`scripts/typecheck-baseline.txt`) may only go down. No `any`, `@ts-ignore`, or locally redefined domain interfaces (`resources/js/types/` is source of truth).

---

## 8. Architecture Checks (post-implementation)

- No business logic added to a controller? N/A (landing is static page) — confirm no new server workflow duplication.
- No hotspot growth? Verify `Landing.tsx` LOC down.
- No rule/type/permission duplication? Confirm no status vocabulary or workflow thresholds duplicated into TS.
- No tenant bypass? No DB reads on landing.
- No client-side business truth? Landing renders marketing copy from `Landing_Landing` namespace only.
- No new `any`/deps? Verify.
- No `Utils` dumping ground? Keep helpers local to landing components.
- ADR alignment: ADR-001 modular monolith (modularize landing), ADR-002 server-owned rules (no new rules invented), ADR-005 service boundaries (no service needed for static landing).

---

## 9. Risks & Mitigations

- Visual regression on mobile breakpoints → add probe at 375/768/1024/1366 + manual QA before merge.
- Font flash / FOUT → `display=swap` + preconnect; do not remove fonts entirely.
- i18n key rename breaks landing → search `Landing_Landing` usage (`Landing.tsx` + locales) before pruning.
- OG image 404 on prod → add `public/og-image.png` and verify after `npm run build` + `rsync --exclude public/hot` deploy.

---

## 10. Implementation Checklist (do in order)

- [ ] Phase 0 scaffolding + baseline `typecheck:ci`/`build`
- [ ] Phase 1 extraction: icons → css → primitives → sections (one commit per group)
- [ ] Phase 2A mobile hero visual (`Hero.tsx` + `landing.css` responsive)
- [ ] Phase 2B footer social links fix
- [ ] Phase 2C pricing clarity (`Pricing.tsx` + locale copy)
- [ ] Phase 3 visual polish (Features imagery + spacing)
- [ ] Phase 4a a11y (nav + simulator + marquee + FAQ + skip link)
- [ ] Phase 4b SEO (hreflang + OG image + FAQ JSON-LD)
- [ ] Phase 4c i18n dedup (`pogrid_landing_lang` + `detectLang`)
- [ ] Phase 5 perf (font dedup + lazy + css caching)
- [ ] Tests + `typecheck:ci` + `build` + reports: files changed/created, responsibility, tests, architecture impact, risks

---

## 11. Metrics After (reuse audit table)

Re-score against `docs/audit/landing-page-audit.md §6` after Phases 2–5; expected deltas: Responsiveness +2, Accessibility +2, SEO +1, Architecture +2, Conversion +1.

## 12. Delivery notes (2026-08-14)

Visible redesign applied: light hero gradient, blue primary CTA, 16px rounded card system. Landing.tsx 1397→137 LOC, 13 section components + icons/shared + Vite-cached landing.css. DOM probe verified hero light + button blue + card radius 16px; check-hero passes all viewports. Docs updated.
