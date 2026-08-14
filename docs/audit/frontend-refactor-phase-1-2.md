# Frontend Design & Layout Refactor: Phase 1 & Phase 2

**Date:** 2026-08-14  
**Status:** Completed & Verified  
**Scope:** Single Header Architecture Unification, Layout Hierarchy, Global Auth Context, Subpage Header Standardization, Responsive UX

---

## 1. Executive Summary & Audit Findings

A comprehensive visual and DOM hierarchy audit of the POgrid frontend revealed several critical UI/UX bottlenecks:
1. **Header Clutter & Duplication (Phase 1):** The Owner Dashboard rendered two stacked header bars (~180px total height on desktop, >35% vertical viewport waste on mobile). The top `AppShell` header and the inner page `<header>` displayed redundant information (duplicate titles, duplicated theme pickers, duplicated search triggers, duplicated logout buttons).
2. **Subpage Header Inconsistencies (Phase 2):** Pages such as `/billing`, `/profile`, `/logs`, `/pos/create`, and `/rework-logbook` contained duplicate header elements, isolated language switchers, and ununified back buttons.
3. **Identity Resolution Gaps:** Secondary routes lacked explicit `auth.user` prop hydration, resulting in `AppShell` falling back to `"U User MEMBER"` placeholders.
4. **Mobile Navigation & Scroll Clipping:** Tabs on the dashboard lacked fluid horizontal scrolling on small viewports, causing tap-target squishing.
5. **Minor Visual & Typographic Flaws:** Floating unlabelled `"N/A"` OTDR metric on the summary bar and a double comma greeting string (`"Halo,, {name}"`) in the Indonesian locale.

---

## 2. Refactoring Implementations

### Phase 1: Single Header Architecture Unification & Layout Hierarchy
* **Owner Dashboard Header Removal:** Removed the redundant 90px inner header from [`resources/js/Pages/Owner/Dashboard.tsx`](file:///home/tito/pogrid/resources/js/Pages/Owner/Dashboard.tsx).
* **Direct AppShell Chrome Integration:** Augmented [`resources/js/Components/AppLayout.tsx`](file:///home/tito/pogrid/resources/js/Components/AppLayout.tsx) to forward:
  * `showClock={true}` (Live time display)
  * `onlineUsersCount` & `wsStatus` (Real-time WebSocket & team presence indicators)
  * `onSearchClick` (Global search modal trigger)
  * `actionButton` (Dynamic role-aware CTAs, e.g. `+ Tambah Admin` for Owner, `((•)) Rilis PO Baru` for Admin)
* **Compact Subbar & Horizontal Tab Scrolling:**
  * Embedded the Floor Terminal URL chip and live connection badge into a compact, non-intrusive subbar.
  * Added `overflow-x-auto scrollbar-none flex-nowrap` to `.tab-bar` ensuring fluid mobile interaction without layout distortion.
* **Mobile Vertical Space Reclaim:** Reclaimed ~35% of vertical viewport real estate on mobile devices by unifying all navigation and actions into a single 64px header.

### Phase 2: Global Auth Context & Subpage Standardization
* **Inertia Global Auth Sharing:** Updated [`app/Providers/AppServiceProvider.php`](file:///home/tito/pogrid/app/Providers/AppServiceProvider.php) to automatically share complete `auth.user` attributes (`id`, `name`, `username`, `email`, `role_name`, `role_level`, `post_name`, `post_display_name`, `is_owner`, `tenant_slug`).
* **Sidebar Profile Fallback Elimination:** [`resources/js/Components/AppShell.tsx`](file:///home/tito/pogrid/resources/js/Components/AppShell.tsx) computes `effectiveUser` from either explicit props or global Inertia auth props, ensuring consistent name, role badge, and avatar initials on all routes.
* **Subpage Header Unification:**
  * [`resources/js/Pages/Owner/Billing.tsx`](file:///home/tito/pogrid/resources/js/Pages/Owner/Billing.tsx): Clean `<AppLayout backUrl="/dashboard">`, removed duplicate inner header and localized toggle.
  * [`resources/js/Pages/Owner/Profile.tsx`](file:///home/tito/pogrid/resources/js/Pages/Owner/Profile.tsx): Streamlined layout with back navigation and clean subtitle.
  * [`resources/js/Pages/Owner/CreatePo.tsx`](file:///home/tito/pogrid/resources/js/Pages/Owner/CreatePo.tsx): Slotted `((•)) Rilis PO Baru` into `AppLayout.actionButton`.
  * [`resources/js/Pages/Owner/ReworkLogbook.tsx`](file:///home/tito/pogrid/resources/js/Pages/Owner/ReworkLogbook.tsx): Removed duplicate inner header; configured back navigation.
* **Polish & Typo Fixes:**
  * Labeled OTDR metric as `"Ketepatan (OTDR)"` with an em-dash (`—`) fallback.
  * Fixed Indonesian greeting string in [`resources/js/i18n/locales/id.json`](file:///home/tito/pogrid/resources/js/i18n/locales/id.json).

---

## 3. Verification & Compliance Matrix

| Gate / Test Suite | Result | Details |
|:---|:---|:---|
| **TypeScript Gate** (`npm run typecheck:ci`) | **PASSED** | 0 errors vs baseline 0 |
| **PHPUnit Test Suite** (`php artisan test`) | **PASSED** | 195 tests passed, 1,556 assertions |
| **Vite Production Build** (`npm run build`) | **PASSED** | Compiled in 1.89s with no chunk errors |
| **Visual Regression & E2E** (Puppeteer) | **VERIFIED** | Verified desktop (1440px) & mobile (390px) across Dashboard, Billing, Profile, Logs, and Create PO |

---

## 4. Architectural Invariants Maintained

1. **Server-Owned Business Rules:** Zero client-side replication of role/permission rules.
2. **Fail-Closed Tenancy:** All tenant boundaries and authorization gates preserved.
3. **Static Tailwind CSS Breakpoint Strings:** AppShell and AppLayout maintain static literal classes (`hidden md:flex`, `lg:hidden`, etc.) ensuring no scanner purging in Tailwind CSS v4.
