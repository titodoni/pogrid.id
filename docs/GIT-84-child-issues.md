# GIT-84: Child Issues for Remaining Refactoring

Created: 2026-07-16
Parent: GIT-84 (fix error)

## Why these exist

The GIT-84 fix included scope creep — CSS variable refactoring and features beyond the parse-error fix, done without prior communication. These child issues track the remaining work separately.

## Issue 1: Complete CSS variable refactoring across remaining frontend files

**Description:** The engineer converted ~10 frontend files from hardcoded colors to CSS variables (`var(--color-pg-*)`), but several files still have hardcoded hex/rgba values. Convert remaining files.

**Files remaining with hardcoded colors (counts):**
- Owner/CreatePo.tsx: ~91 occurrences
- Worker/Archive.tsx: ~40 occurrences
- Auth/ResetPassword.tsx: ~26 occurrences
- Worker/TroubleReports.tsx: ~43 occurrences (partial conversion done)
- Worker/Login.tsx: ~31 occurrences (partial conversion done)
- Auth/Register.tsx: ~45 occurrences (partial conversion done)
- Auth/ForgotPassword.tsx: ~25 occurrences (partial conversion done)
- Owner/Profile.tsx: ~38 occurrences (partial conversion done)
- Worker/Dashboard.tsx: ~132 occurrences (partial conversion done)
- Owner/Dashboard.tsx: ~104 occurrences remaining
- Error pages (403, 404, 419, 500): minor cleanup

**Suggested priority:** Medium
**Work mode:** implementation
**Verify:** Build + visual diff review

## Issue 2: Worker login rate-limiting feature (was added without issue tracking)

**Description:** Worker/Login.tsx was modified to add rate-limiting countdown after failed PIN attempts. This feature was added during GIT-84 scope creep and needs its own tracking, review, and backend rate-limit enforcement.

**Files touched:** resources/js/Pages/Worker/Login.tsx (+78 lines)

**Suggested priority:** Medium
**Work mode:** implementation
**Verify:** Build + manual login flow test

## Issue 3: Verify CSS variables are defined in app.css for all themes

**Description:** The CSS variables were defined in app.css's `:root`, but the converted files use variables like `var(--color-pg-bg)`, `var(--color-pg-text)`, etc. Verify all used variables are defined, and check if dark/light theme switching needs separate variable sets.

**Suggested priority:** Low
**Work mode:** implementation
