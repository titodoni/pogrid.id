# POgrid Audit Mitigation Proposal
**Date:** 2026-08-12
**To:** CTO
**From:** Antigravity (Engineering)
**Subject:** Mitigation Plan for Codebase Audit 2026-08-12

## 1. Executive Summary
We have reviewed and verified the findings from the recent external codebase audit. Out of the 7 critical vulnerabilities identified, we can confirm all of them are actively present in the codebase. 

The domain architecture itself remains sound. The critical issues stem from incomplete authorization gates, missing input validation on file uploads, and a lack of strict type-checking in the Vite build pipeline. We propose addressing all Critical (C1-C7) and High (H1-H4) findings in a focused two-week security sprint.

## 2. Review and Verification of Critical Findings
We have rechecked the code and confirmed the exact lines mentioned:
- **C1 (Auth Bypass via No-Op Middleware):** Verified in `EnsureEmailIsVerified.php:17` and `routes/web.php`. The middleware is effectively bypassed for all authenticated users because floor workers do not implement `MustVerifyEmail`.
- **C2 (Privilege Escalation):** Verified in `UserPolicy.php:13`. The `manage` policy only explicitly denies Manager/Sales, failing open for floor roles. Floor workers can create office accounts.
- **C3 (PIN Reset Account Takeover):** Verified in `PinResetController.php:55`. The `approvePinReset` method has no role authorization, and writes the new PIN in plaintext to `alerts`.
- **C4 (Cross-tenant IDOR in PPIC):** Verified in `PpicDashboardController.php`. Both `updatePo` and `updateItemPriority` fail to invoke `Gate::authorize('view-tenant')`.
- **C5 (Logo Upload RCE):** Verified in `OwnerDashboardController.php:81`. Files are moved using `getClientOriginalExtension()` directly to `public_path('uploads/logos')` without an `.htaccess` execution restriction.
- **C6 & C7 (Frontend Render Crashes):** Verified. `Worker/Dashboard.tsx` passes a non-existent `translations` prop to `ItemCard`. `ActiveDelayDirectory.tsx` references `setDirCollapsed` which is undefined in its scope.

## 3. Proposed Mitigation Plan (Sprint 1)

### Phase 1: Stop the Bleeding (Security & Crashes)
**Target: Next 48 Hours**

1. **Fix C5 (RCE in Logo Upload):** 
   - Refactor `OwnerDashboardController::updateCompanySettings` to use Laravel's `storePublicly()` which automatically generates safe hash filenames. 
   - Add a `.htaccess` file to `public/uploads/` with `php_flag engine off`.
2. **Fix C1 & C2 (Authorization Collapse):**
   - Replace the `verified` middleware gate on office routes with a dedicated `access-office` middleware checking `$user->role_level === 'office'`.
   - Update `UserPolicy::manage()` to explicitly deny non-owner roles from modifying office-level accounts.
3. **Fix C3 (PIN Reset Flow):**
   - Add `Gate::authorize('manage-users')` to `approvePinReset`. 
   - Stop storing the plaintext PIN in the alert message; flash it only once to the admin's session. Add rate-limiting to the request endpoint.
4. **Fix C4 (Cross-Tenant IDOR):**
   - Add `Gate::authorize('view-tenant', $tenant->id)` to `updatePo` and `updateItemPriority` in `PpicDashboardController`.
5. **Fix C6 & C7 (Frontend Crashes):**
   - Remove the undefined `translations` prop in `Worker/Dashboard.tsx` and refactor `ItemCard` to use the global `useTranslation` hook.
   - Pass the missing state variables (`dirCollapsed`, `setDirCollapsed`, etc.) from `OwnerDashboard` down to `ActiveDelayDirectory.tsx`.

### Phase 2: Infrastructure & Safety Nets
**Target: End of Week 1**

1. **Frontend Type Checking:** 
   - Add `"typecheck": "tsc --noEmit"` to our `package.json` build scripts so that the CI pipeline and `npm run build` will fail if there are TypeScript errors (preventing C6/C7 regressions).
2. **Rate Limiting (H2 & H3):**
   - Apply standard Laravel throttling (`throttle:5,1`) to the office `POST /login` route.
   - Enforce a 6-digit minimum PIN policy and add lockout logic after 5 failed attempts per user ID.
3. **Data Leakage (H1 & M1):**
   - Ensure `TenantManager::getTenantId()` is applied directly to raw queries in `WorkerDashboardController` telemetry exports.
   - Refactor `TenantScope` to fail closed (throw an exception or `whereRaw('1=0')`) when no tenant is set and bypass is not explicitly enabled.

Let me know if this proposal aligns with your expectations, and I will begin executing Phase 1 immediately.
