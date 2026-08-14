# POgrid.id Landing Page -- Audit Report

Date: 2026-08-13
Scope: `resources/js/Pages/Landing/Landing.tsx` (1,397 lines), `resources/css/app.css`, `resources/js/i18n/locales/{en,id}.json`, `routes/web.php`, `resources/views/app.blade.php`

---

## 1. Executive Summary

The POgrid landing page is a single-file, 1,397-line monolithic React component serving the marketing site at `pogrid.id`. It implements 14 sections (hero through footer) with scroll-reveal animations, an interactive PIN simulator mockup, bilingual EN/ID support, and full SEO meta/JSON-LD.

**Overall grade: B+** -- Solid execution with meaningful gaps in accessibility, performance, and architectural maintainability.

---

## 2. Section-by-Section Findings

### 2.1 Navigation (Lines 411-491)

| Aspect | Finding | Severity |
|--------|---------|----------|
| Sticky header | Works, shrinks h-16 to h-14 on scroll | OK |
| Logo | 44px to 34px transition, links to `/` | OK |
| Mobile menu | Slide-down panel, closes on link click | OK |
| Accessibility | `aria-label="Menu"` on hamburger, no `aria-expanded` | **Medium** |
| Sign In link | Hidden on `<md`, visible on `md+` | OK |
| Nav links | `#fitur`, `#cara`, `#harga`, `#faq` -- anchor-only | OK |

**Issue:** Hamburger button lacks `aria-expanded` and `aria-controls`. Screen readers cannot determine menu state.

### 2.2 Hero Section (Lines 493-854)

| Aspect | Finding | Severity |
|--------|---------|----------|
| Layout | 12-col grid, copy left, mockups right | OK |
| Headline | Three-part with gradient text on middle phrase | OK |
| Primary CTA | White button to `/register` | OK |
| WhatsApp CTA | Opens `wa.me` with pre-filled message | OK |
| Stats row | 4-column grid (Live / Minutes / No Install / 30 days) | OK |
| Dashboard mockup | Hidden `<1024px`, shows faux browser window | OK |
| Phone kiosk mockup | Hidden `<640px`, absolute positioned bottom-right | OK |

**Issue:** Dashboard mockup and phone kiosk are completely hidden on mobile. Mobile visitors see only text -- no product visual. Significant conversion gap on the primary device type for Indonesian B2B factory owners.

**Issue:** `appUrl()` (line 22-29) hardcodes `https://app.pogrid.id` in production. During local dev, clicking CTA buttons takes you to production app, breaking the dev workflow.

### 2.3 Interactive PIN Simulator (Lines 686-853)

| Aspect | Finding | Severity |
|--------|---------|----------|
| State machine | `pin` -> `update` -> `success` | OK |
| PIN input | 4-digit, numpad 0-9 + C + OK | OK |
| Progress sim | 60% -> 80% (+2) -> 100% (complete) | OK |
| Send simulation | 700ms delay with spinner state | OK |
| Reset | Returns to PIN step | OK |
| i18n | All simulator text uses `t.*` keys | OK |

**Issue:** Simulator is a static demo -- no real backend. Visitors can "complete" a PO update without any real system. Should include a disclaimer or bridge to "Try it live."

**Issue:** No validation preventing "Complete" click directly from 60%. The +2 Units button is the only guided path.

### 2.4 Sectors Marquee (Lines 856-871)

| Aspect | Finding | Severity |
|--------|---------|----------|
| Animation | CSS `marqueeScroll`, 32s linear infinite | OK |
| Pause on hover | `animation-play-state: paused` | OK |
| Content | 8 sectors, doubled for seamless loop | OK |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` disables | OK |

**Issue:** Marquee is purely decorative. No links to sector-specific pages or case studies.

### 2.5 Pain Points Section (Lines 873-899)

| Aspect | Finding | Severity |
|--------|---------|----------|
| Layout | Numbered list 01-04, question + explanation | OK |
| Solution callout | Blue left border box with mission statement | OK |
| i18n | All text via `t.pain_items` | OK |

**Issue:** No data or statistics to back up the pain claims. Assertions without evidence.

### 2.6 How It Works (Lines 901-928)

| Aspect | Finding | Severity |
|--------|---------|----------|
| 3-step grid | Steps 1, 2, 3 with big numbers | OK |
| Cell hover | Blue top border inset on hover | OK |
| Outcome statement | Blue accent line + text | OK |

**Issue:** No link to live demo, video walkthrough, or documentation. "See how it works" has no next step except registering.

### 2.7 Features Grid (Lines 930-952)

| Aspect | Finding | Severity |
|--------|---------|----------|
| 6 features | 2x3 grid with icons, codes F.01-F.06 | OK |
| Icons | Inline SVG, no library | OK |
| i18n | All text via `t.features` | OK |

**Issue:** No screenshots or real product imagery. Features are abstract text descriptions.

### 2.8 Comparison Table (Lines 954-1000)

| Aspect | Finding | Severity |
|--------|---------|----------|
| 3-column table | Capability / Spreadsheet+WhatsApp / POgrid | OK |
| 6 comparison rows | Red Cross vs Green Check | OK |
| Mobile | `overflow-x-auto` with `min-w-[640px]` | OK |
| Visual accent | Blue left border on POgrid column | OK |

**Issue:** Binary comparison (bad vs good) with no nuance. "No Credit Card" row compares a payment method against a capability category.

### 2.9 Sectors + Proof Cards (Lines 1002-1025)

| Aspect | Finding | Severity |
|--------|---------|----------|
| 3 sector cards | CNC, Fabrication, Assembly/Stamping/Moulding | OK |
| Watermark numbers | Large `01`, `02`, `03` in background | OK |
| Icons | Custom inline SVG per sector | OK |

**Issue:** No real customer names, logos, or case study links. "PT Astra Otoparts" in hero mockup is not presented as a real customer.

### 2.10 Trust Band (Lines 1027-1046)

| Aspect | Finding | Severity |
|--------|---------|----------|
| 4 trust items | Tenant Isolation, Cloud, Setup, No Credit Card | OK |
| Icon + text layout | Horizontal flex | OK |

**Issue:** No security certifications, compliance badges, or third-party validation. Claims without evidence.

### 2.11 Pricing (Lines 1048-1108)

| Aspect | Finding | Severity |
|--------|---------|----------|
| Single plan | "Factory Plan" Rp250,000/month | OK |
| Annual billing | Rp3,000,000/year note | OK |
| 5 features listed | With `+` prefix | OK |
| CTA | Dark button to `/register` | OK |
| Badge | "Full Access" green badge | OK |

**Issue:** No monthly billing option shown. Rp250,000/month is only "billed annually" -- monthly rate would be higher. Lack of transparency could deter price-sensitive prospects.

**Issue:** No tier comparison. Single plan means no upsell path.

### 2.12 FAQ (Lines 1110-1146)

| Aspect | Finding | Severity |
|--------|---------|----------|
| 7 questions | Accordion style with chevron toggle | OK |
| Animation | `max-height` transition (0 to 400px) | OK |
| i18n | All text via `t.faqs` | OK |

**Issue:** `max-height: 400px` is a magic number. Long answers could clip on mobile.

### 2.13 Final CTA (Lines 1148-1183)

| Aspect | Finding | Severity |
|--------|---------|----------|
| Dark background | `bg-slate-950` with grid overlay | OK |
| Two CTAs | Register + WhatsApp | OK |
| Language toggle | Dark variant included | OK |

**Issue:** LangToggle in final CTA is below both buttons, likely to be missed.

### 2.14 Footer (Lines 1185-1247)

| Aspect | Finding | Severity |
|--------|---------|----------|
| 12-col grid | Logo (5), Product (2), Company (2), Legal (3) | OK |
| Social icons | WhatsApp, LinkedIn, Instagram | OK |
| Legal links | `/terms`, `/privacy` via Inertia `Link` | OK |
| Copyright | Dynamic year | OK |

**Issue:** LinkedIn and Instagram links are `href="#"` -- placeholder links.

---

## 3. Cross-Cutting Concerns

### 3.1 Accessibility

| Finding | Severity |
|---------|----------|
| Hamburger button: no `aria-expanded`, `aria-controls` | **Medium** |
| No skip-to-content link | **Medium** |
| Marquee: no `aria-label` or `role="marquee"` | **Low** |
| Dashboard mockup: pure visual, no `role="img"` or alt text | **Low** |
| Phone kiosk: interactive simulator not keyboard-navigable | **Medium** |
| Focus indicators: rely on global `focus-visible` from `app.css` | OK |
| Color contrast: `text-slate-400` on `bg-slate-50` passes AA | OK |

### 3.2 Performance

| Finding | Severity |
|---------|----------|
| Single 1,397-line component -- no code splitting | **Medium** |
| 3 Google Fonts loaded (Inter, IBM Plex Mono, Oswald) | **Medium** |
| No `loading="lazy"` on logo images | **Low** |
| Inline `<style>` block (~145 lines) -- no CSS caching | **Low** |
| No `defer`/`async` on font loading | **Low** |
| All SVG icons inline -- no sprite sheet | **Low** |

### 3.3 SEO

| Finding | Severity |
|---------|----------|
| Title, description, keywords, canonical | OK |
| Open Graph tags -- complete | OK |
| Twitter Card -- complete | OK |
| JSON-LD SoftwareApplication schema | OK |
| `og:image` uses `pogrid-logo.png` -- small, not ideal | **Low** |
| No `og:image:width`/`og:image:height` | **Low** |
| No structured data for FAQ section | **Low** |
| No `hreflang` for EN/ID versions | **Medium** |

### 3.4 Internationalization

| Finding | Severity |
|---------|----------|
| Two locale files (`en.json`, `id.json`) -- complete | OK |
| ~80 keys in `Landing_Landing` namespace | OK |
| `detectLang()` uses `pogrid_landing_lang` -- separate from app `pogrid_lang` | **Medium** |
| Language toggle writes both keys via `useEffect` | OK |
| WhatsApp pre-filled message localized | OK |

**Issue:** Landing page uses `pogrid_landing_lang` while app uses `pogrid_lang`. Language preference does not persist across landing-to-app transition.

### 3.5 Architecture

| Finding | Severity |
|---------|----------|
| 1,397-line single component -- violates hotspot budget | **High** |
| No sub-components extracted to `Components/` | **Medium** |
| 20+ inline SVG icon components in one file | **Medium** |
| Inline `<style>` block instead of CSS module | **Low** |
| No layout component -- landing renders own chrome | **Low** |
| Route is a closure, not a controller | **Low** |

---

## 4. Security

| Finding | Severity |
|---------|----------|
| No forms on landing page -- no CSRF exposure | OK |
| No user input rendered -- no XSS risk | OK |
| `target="_blank"` with `rel="noopener noreferrer"` on external links | OK |
| No analytics/tracking scripts visible | Info |

---

## 5. Recommendations

### P0 -- Critical (blocks conversion)

1. **Add mobile hero visual.** Dashboard mockup hidden `<1024px`, phone mockup hidden `<640px`. Mobile hero is text-only. Add a simplified product screenshot or single mockup for small screens.

2. **Fix social media placeholder links.** LinkedIn and Instagram `href="#"` should link to real profiles or be removed.

### P1 -- High (improves conversion and trust)

3. **Add real customer proof.** Replace hypothetical sector cards with actual customer names, logos, or anonymized case study data.

4. **Add FAQ structured data.** JSON-LD `FAQPage` schema for rich snippets.

5. **Unify language keys.** Merge `pogrid_landing_lang` into `pogrid_lang` for consistent preference across landing and app.

6. **Add monthly pricing option.** Show both monthly and annual rates.

### P2 -- Medium (improves maintainability)

7. **Extract sub-components.** Split into `Landing/` directory: `Hero.tsx`, `Simulator.tsx`, `PainPoints.tsx`, `HowItWorks.tsx`, `Features.tsx`, `Comparison.tsx`, `Pricing.tsx`, `FAQ.tsx`, `Footer.tsx`, `icons.tsx`.

8. **Add `aria-expanded` and `aria-controls` to mobile menu button.**

9. **Add `hreflang` tags for EN/ID versions.**

10. **Add `loading="lazy"` to images.**

### P3 -- Low (polish)

11. **Add `og:image:width`/`og:image:height`** and use a proper OG image (1200x630).

12. **Add a "See it in action" video or GIF** in How It Works section.

13. **Consider testimonials section** between Sectors and Trust Band.

14. **Add keyboard navigation to the PIN simulator.**

---

## 6. Metrics Summary

| Category | Score | Notes |
|----------|-------|-------|
| Content & Copy | 8/10 | Clear value prop, good pain points, strong CTA |
| Design & Layout | 8/10 | Consistent grid, good spacing, professional look |
| Responsiveness | 6/10 | Hero mockups hidden on mobile, pricing table OK |
| Accessibility | 6/10 | Missing ARIA attrs, no skip link, sim not keyboard-nav |
| Performance | 7/10 | No code splitting, 3 fonts, inline styles |
| SEO | 7/10 | Good meta/OG/JSON-LD, missing hreflang, FAQ schema |
| i18n | 7/10 | Complete translations, key mismatch with app |
| Architecture | 5/10 | Monolithic file, no extraction, inline everything |
| Security | 9/10 | No attack surface on static page |
| Conversion | 7/10 | Good CTA placement, missing mobile visual proof |

**Overall: 7.0/10**
