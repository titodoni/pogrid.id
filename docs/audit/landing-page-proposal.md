# POgrid.id Landing Page -- Makeover Proposal

Date: 2026-08-13
Basis: Landing Page Audit Report (same directory)

---

## Goal

Increase visitor-to-trial conversion by fixing mobile experience gaps, adding social proof, improving transparency, and reducing architectural debt.

---

## Phase 1: Critical Fixes (Week 1)

### 1.1 Mobile Hero Visual

**Problem:** Dashboard mockup hidden `<1024px`, phone kiosk hidden `<640px`. Mobile visitors (majority of Indonesian B2B traffic) see text-only hero.

**Solution:** Add a single simplified product mockup visible on all screen sizes:
- Create a compact card showing the 3-stage progress bar (Milling 100%, CNC 100%, Welder 60%)
- No interactive simulator on mobile -- static visual with "Try the demo below" link to `#cara`
- Position: below the hero copy, above the stats row
- Estimated effort: 2 hours

### 1.2 Social Media Links

**Problem:** LinkedIn and Instagram `href="#"`.

**Solution:** Either link to real profiles or remove the icons entirely. If no profiles exist yet, remove the icons to avoid appearing unprofessional.
- Estimated effort: 15 minutes

---

## Phase 2: Trust and Conversion (Week 2)

### 2.1 Real Customer Proof

**Problem:** Sector cards are hypothetical. No evidence anyone uses POgrid.

**Solution:**
- Replace 3 sector cards with 3 mini case studies
- Format: "[Anonymized Factory Type], [City] -- [Key Result]"
- Example: "CNC Job Shop, Bekasi -- Reduced late-delivery penalties by 40% in first month"
- Add a "Request full case study" link that opens WhatsApp
- Estimated effort: 4 hours

### 2.2 Monthly Pricing Transparency

**Problem:** Only annual billing shown. Rp250,000/month is annual-only rate.

**Solution:**
- Show toggle: "Billed Monthly (Rp299,000/mo)" vs "Billed Annually (Rp250,000/mo)"
- Annual shows "Save Rp588,000/year" badge
- Both CTAs go to `/register`
- Estimated effort: 3 hours

### 2.3 FAQ Structured Data

**Problem:** No JSON-LD FAQPage schema.

**Solution:** Add `FAQPage` schema to `<Head>` with all 7 Q&A pairs.
- Estimated effort: 1 hour

### 2.4 Language Key Unification

**Problem:** Landing uses `pogrid_landing_lang`, app uses `pogrid_lang`. Preference not persisted.

**Solution:** Migrate landing to use `pogrid_lang`. Keep `detectLang()` as fallback for first visit.
- Files: `Landing.tsx`, `useTranslation.ts`
- Estimated effort: 1 hour

---

## Phase 3: Maintainability (Week 3)

### 3.1 Component Extraction

**Problem:** 1,397-line monolithic file. Hard to review, test, or modify safely.

**Solution:** Extract into `resources/js/Pages/Landing/` directory:

```
resources/js/Pages/Landing/
  Landing.tsx          (orchestrator, ~150 lines)
  components/
    Header.tsx         (nav + mobile menu)
    Hero.tsx           (hero copy + stats)
    Simulator.tsx      (dashboard + phone kiosk mockup)
    Marquee.tsx        (sectors marquee)
    PainPoints.tsx
    HowItWorks.tsx
    Features.tsx
    Comparison.tsx
    Sectors.tsx
    TrustBand.tsx
    Pricing.tsx
    Faq.tsx
    FinalCta.tsx
    Footer.tsx
    icons.tsx          (all 20+ SVG icons)
    Reveal.tsx         (scroll animation)
    SectionHead.tsx
    LangToggle.tsx
    types.ts           (shared types)
```

- `Landing.tsx` imports and composes all sections
- No logic changes -- pure extraction
- Estimated effort: 6 hours

### 3.2 Accessibility Fixes

**Solution:**
- Add `aria-expanded={mobileOpen}` and `aria-controls="mobile-menu"` to hamburger button
- Add `id="mobile-menu"` to mobile menu container
- Add skip-to-content link as first focusable element
- Add `role="img"` and `aria-label` to mockup containers
- Estimated effort: 2 hours

### 3.3 SEO Improvements

**Solution:**
- Add `<link rel="alternate" hreflang="id" href="https://pogrid.id/" />` and `hreflang="en" href="https://pogrid.id/?lang=en" />`
- Create `public/og-image.png` (1200x630) with product screenshot + headline
- Add `og:image:width` and `og:image:height` meta tags
- Estimated effort: 2 hours

---

## Phase 4: Polish (Week 4)

### 4.1 Performance

- Add `loading="lazy"` to footer logo image
- Consider reducing to 2 fonts (drop Oswald, use Inter 800 for display headings)
- Move inline `<style>` to a CSS module or keep as-is (low impact)
- Estimated effort: 2 hours

### 4.2 Content Additions

- Add a "See it in action" section with a short screen recording GIF or embedded video
- Add testimonials section (even 2-3 short quotes) between Sectors and Trust Band
- Estimated effort: 4 hours (depends on asset creation)

---

## File Impact Summary

| File | Action | Effort |
|------|--------|--------|
| `Landing.tsx` | Refactor: extract components | 6h |
| `Landing/components/*.tsx` | Create: 17 new files | (included above) |
| `Landing/components/icons.tsx` | Create: move all SVG icons | 1h |
| `en.json` | Edit: update pricing keys, add case study text | 1h |
| `id.json` | Edit: same updates in Indonesian | 1h |
| `Landing.tsx` (Head) | Add FAQ schema, hreflang, OG image | 2h |
| `app.blade.php` | No changes needed | -- |
| `routes/web.php` | No changes needed | -- |

**Total estimated effort: ~28 hours**

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Mobile hero engagement | 0% (no visual) | >30% scroll past hero |
| Visitor-to-trial rate | Baseline TBD | +15% |
| FAQ rich snippet in Google | Not present | Present |
| Language preference persistence | Broken across landing/app | 100% |
| Component file size | 1,397 lines | <200 lines per file |
| Lighthouse mobile score | Not measured | >85 |
