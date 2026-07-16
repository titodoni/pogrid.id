# Paperclip UI/UX Audit Report

**Issue:** GIT-9 — UI/UX flow audit
**Date:** 2026-07-16
**Pages Audited:** 16 core pages (Auth, Onwer, Worker)
**Total Findings:** 21

---

## Critical (3)

### C1. Dashboard `useDashboardActivityAnimation` TDZ bug
**File:** `resources/js/Pages/Owner/Dashboard.tsx:42`, `:106`
**Problem:** `const animatedActivityIds = useDashboardActivityAnimation(recentActivity)` at line 42 references `recentActivity` before its `const` declaration at line 106. In strict-mode JS/TS (ES modules), accessing a `const` in the temporal dead zone throws a ReferenceError.
**Fix:** Either hoist `recentActivity` above `animatedActivityIds`, or inline the memoized value.
**Severity:** Runtime crash on dashboard render with selected company.

### C2. Dashboard error state lacks retry action
**File:** `resources/js/Pages/Owner/Dashboard.tsx:157`
**Problem:** Error renders as `<p className="text-sm text-destructive">{error.message}</p>` — just red text. No retry button, no fallback UI.
**Impact:** User sees an error message with no way to recover without navigating away.
**Fix:** Add a `refetch()` call wrapped in a Button.

### C3. Company settings archive uses `window.confirm()`
**File:** `resources/js/Pages/Owner/Dashboard.tsx` (company settings section)
**Problem:** Archive company uses `window.confirm()` instead of a proper AlertDialog component consistent with the app's design system.
**Impact:** Inconsistent UX — no styling, no accessibility, no keyboard trap management.
**Fix:** Replace with `<AlertDialog>` component.

---

## High (7)

### H1. No unsaved-changes guard on any form page
**Files:** `CreatePo.tsx`, `Dashboard.tsx` (settings tabs)
**Problem:** Nowhere in the app is a `beforeunload` handler or route-level guard implemented for dirty forms. Navigating away from CreatePo after filling fields silently discards data.
**Fix:** Add route-level `useBlocker` or `beforeunload` for pages with dirty state.

### H2. Auth page disabled button accessibility
**File:** `resources/js/Pages/Auth/Login.tsx:170-174`
**Problem:** The submit button uses `aria-disabled` (not `disabled`) for validation-failed state, combined with `opacity-50` CSS. The native `disabled` attribute is only set for `mutation.isPending`. Screen readers may not correctly announce the disabled state.
**Fix:** Use proper `disabled={!canSubmit || mutation.isPending}`.

### H3. Navigation links use `<a>` causing full page reloads
**File:** `resources/js/Pages/Owner/Dashboard.tsx` (navigation links)
**Problem:** Dashboard navigation links use `<a href="...">` instead of Inertia `<Link>`, triggering full browser navigation instead of SPA client-side routing.
**Impact:** Slow navigation, loss of React state, full re-render.
**Fix:** Replace with `<Link href="...">` from `@inertiajs/react`.

### H4. CreatePo useEffect for defaults causes flash
**File:** `resources/js/Pages/Owner/CreatePo.tsx:127-131`
**Problem:** Default values are set in a `useEffect`, causing a flash of empty inputs before defaults populate.
**Fix:** Initialize state directly in `useState` instead of effect.

### H5. Worker Dashboard filter-empty state uses plain `<p>` not EmptyState
**File:** `resources/js/Pages/Worker/Dashboard.tsx` (filter sections)
**Problem:** "No items match the selected filter." renders as bare `<p>` tags rather than a proper empty state component.
**Fix:** Use a dedicated empty state component for filter-empty results.

### H6. Worker Dashboard missing sub-query loading states
**File:** `resources/js/Pages/Worker/Dashboard.tsx` (sub-queries)
**Problem:** Sub-queries have no loading state. If the main data loads before sub-entity data, entity names will show raw IDs before fetches complete.
**Fix:** Show loading state for sub-queries or merge them with the main query.

### H7. Dashboard synchronous sub-queries unguarded
**File:** `resources/js/Pages/Owner/Dashboard.tsx` (charts section)
**Problem:** Sub-queries have no placeholder/loading state. Dashboard sections that depend on them render with empty arrays until queries resolve, causing chart elements to appear mid-animation.
**Fix:** Use `placeholderData: (prev) => prev` pattern or coalesce to empty arrays.

---

## Medium (6)

### M1. No keyboard shortcut help overlay
**Files:** App-wide
**Problem:** The app uses shortcuts but there is no help overlay or keyboard shortcut reference.
**Fix:** Add a `?` key handler or help panel.

### M2. Dashboard missing empty states within sub-sections
**File:** `resources/js/Pages/Owner/Dashboard.tsx`
**Problem:** Individual sub-sections (recent activity, charts) have no empty states when their respective data arrays are empty.
**Fix:** Add inline empty-state messaging per section.

### M3. Auth page no password visibility toggle
**File:** `resources/js/Pages/Auth/Login.tsx:150-163`
**Problem:** Password field is `type="password"` with no show/hide button.
**Fix:** Add a toggle button (eye icon) next to the password field.

### M4. CreatePo cancel button lacks confirmation
**File:** `resources/js/Pages/Owner/CreatePo.tsx` (cancel action)
**Problem:** Cancel navigates immediately with no "Discard changes?" prompt.
**Fix:** Check for dirty form state before navigating.

### M5. Worker Dashboard no pagination / infinite scroll
**File:** `resources/js/Pages/Worker/Dashboard.tsx`
**Problem:** Item list results are limited with no "Load more" button or infinite scroll.
**Fix:** Add pagination controls or infinite scroll.

### M6. Inconsistent empty state between pages
**Files:** Various
**Problem:** Different pages handle zero-data differently. Some use custom layouts, others lack empty states entirely.
**Fix:** Standardize on a shared empty state component.

---

## Low (5)

### L1. Dashboard entity name map incomplete
**File:** `resources/js/Pages/Owner/Dashboard.tsx` (entity resolution)
**Problem:** Entity name resolution only covers limited types. Activities referencing other entity types will show raw IDs.
**Fix:** Extend entity name resolution to cover all entity types.

### L2. Dashboard "Save changes" button disappears on save
**File:** `resources/js/Pages/Owner/Dashboard.tsx` (settings section)
**Problem:** After saving, the save button disappears until another change is made. User gets no persistent "saved" confirmation.
**Fix:** Keep the button visible with a "Saved" checkmark state.

### L3. Worker Dashboard filter options derived from current page only
**File:** `resources/js/Pages/Worker/Dashboard.tsx` (filters)
**Problem:** Filter dropdown populates from current page data only — values may be missing if not present on page 1.
**Fix:** Fetch available filter options separately or always show all known values.

### L4. Worker Dashboard view toggle no focus ring
**File:** `resources/js/Pages/Worker/Dashboard.tsx` (view toggle)
**Problem:** The view toggle button group has no visible focus indicator for keyboard navigation.
**Fix:** Add `focus-visible:ring-2` to toggle buttons.

### L5. CreatePo role picker missing ARIA listbox pattern
**File:** `resources/js/Pages/Owner/CreatePo.tsx` (role picker)
**Problem:** The role selection popover uses `<button>` elements without `role="option"` or `aria-selected`.
**Fix:** Add proper ARIA attributes for listbox/option pattern.

---

## Child Issues Created

### Done
- [GIT-10](/GIT/issues/GIT-10) — Fix dead item.alerts reference in Worker Dashboard
- [GIT-11](/GIT/issues/GIT-11) — Split Owner Dashboard into sub-components
- [GIT-12](/GIT/issues/GIT-12) — Fix stale closure + double-submit issues in forms

### Backlog (waiting for board decision)
- [GIT-13](/GIT/issues/GIT-13) — Add Ctrl+K search shortcut to Owner Dashboard
- [GIT-14](/GIT/issues/GIT-14) — Add attempt-countdown UI to Worker PIN login
- [GIT-15](/GIT/issues/GIT-15) — Add localStorage draft persistence to PO creation form
- [GIT-16](/GIT/issues/GIT-16) — Merge duplicated permission logic in Worker ItemCard
- [GIT-17](/GIT/issues/GIT-17) — Create custom Inertia error pages for 403/404/419/500
- [GIT-18](/GIT/issues/GIT-18) — Add bulk selection/actions to Owner Dashboard items
- [GIT-19](/GIT/issues/GIT-19) — Add success confirmation after forgot password submission

---

## Pages Audited

| Route | Page | Guard | Status |
|---|---|---|---|
| `/login` | Login.tsx | Auth (guest) | Audited |
| `/forgot-password` | ForgotPassword.tsx | Auth (guest) | Audited |
| `/reset-password/{token}` | ResetPassword.tsx | Auth (guest) | Audited |
| `/register` | Register.tsx | Auth (guest) | Audited |
| `/dashboard` | Owner/Dashboard.tsx | Auth (office) | Audited |
| `/pos/create` | Owner/CreatePo.tsx | Auth (office) | Audited |
| `/dashboard` (profile) | Owner/Profile.tsx | Auth (office) | Audited |
| `/c/{slug}` | Worker/Dashboard.tsx | Tenant (guest→auth) | Audited |
| `/c/{slug}` (login) | Worker/Login.tsx | Tenant (guest) | Audited |
| `/c/{slug}/archive` | Worker/Archive.tsx | Tenant (auth) | Audited |
| `/c/{slug}/trouble-reports` | Worker/TroubleReports.tsx | Tenant (auth) | Audited |
| `/c/{slug}/profile` | Worker/Profile (via ProfileController) | Tenant (auth) | Audited |

## UI Flows Map

### Guard A: Office (email/password)

```
/ → /login (redirect)
  ├── /register (onboarding)
  ├── /forgot-password
  │   └── /reset-password/{token}
  └── /login (POST) → /dashboard
        ├── /pos/create (PO creation form)
        ├── /dashboard (Owner view)
        │   ├── Alerts tab
        │   ├── Active POs tab
        │   ├── Completed POs tab
        │   ├── Client Performance Board
        │   ├── Bottleneck Stage Analyzer
        │   ├── Team Management
        │   └── Settings (company, workflow, users)
        ├── /logout
        └── /c/{slug} (tenant gateway - PIN auth)
```

### Guard B: Floor (PIN auth)

```
/c/{slug}
  ├── /c/{slug} (GET - shows PIN login for guests)
  │   └── POST /c/{slug}/login (PIN auth, throttled 5/min)
  │       └── → /c/{slug} (Worker Dashboard)
  │             ├── Item list (role-filtered)
  │             ├── Progress updates
  │             ├── QC rework logs
  │             ├── Kendala (issue) reports
  │             ├── /c/{slug}/archive (archived POs)
  │             ├── /c/{slug}/trouble-reports
  │             ├── /c/{slug}/profile
  │             └── /c/{slug}/pin-reset/request
  │                 └── → BLUE Alert → Admin approves → new PIN displayed
  └── /c/{slug}/pin-reset/request (guest)
```

## Routes & Auth Architecture

**Guard A** (office): email/username + password at `/login`. Uses standard Laravel session auth.

**Guard B** (floor): PIN login at `/c/{slug}`, throttled 5 req/min. Privilege escalation blocks office roles from PIN login.

### Roles
- **Office**: Owner, Admin, Sales, Manager — access via `/login`
- **Floor**: Purchasing, Finance, Drafter, Machining, Fabrication, QC, Delivery, Production — access via `/c/{slug}/login`

### Key Auth Flows
- **Forgot Password** (Guard A): `Password::reset()` with `ResetPasswordNotification`. Links in `storage/logs/laravel.log` (mail driver: `log`).
- **Forgot PIN** (Guard B): Worker request → BLUE Alert → Admin approves → new 4-digit PIN displayed once.
