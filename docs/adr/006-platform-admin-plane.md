# ADR-006 — Platform Admin Plane Outside Tenancy

**Status:** Accepted · **Date:** 2026-08-15

## Decision
The Superpowers superadmin console (`/superpowers`) is a second authentication
plane inside the same monolith, not a tenant role:

1. **Own guard and model.** `PlatformAdmin` on the `platform` session guard, plain
   eloquent provider, **no** `BelongsToTenant`. A tenant session grants no
   platform access; a platform session grants no tenant access.
2. **Own audit table.** Superadmin actions write `platform_activity_logs`.
   `activity_logs` stays tenant-only (its `user_id` is a FK to `users`).
3. **Own front-end entry.** Separate Vite input + root view; Superpowers renders
   with Astryx while tenant pages stay on Tailwind.
4. **Mandatory second factor.** TOTP is provisioned at account creation
   (`superpowers:create-admin`); `platform.2fa` gates every protected route.
   Secrets are encrypted, recovery codes hashed, neither re-displayed.
5. **Cross-tenant reads are explicit.** The panel reads across tenants only via
   `TenantManager::runWithoutScope()`; TenantScope remains fail-closed (ADR-003).

## Rationale
Modelling superadmin as a high-privilege tenant role would have put an account
with cross-tenant reach inside the tenant identity system — one scope bug or one
role-check omission away from tenant data crossing boundaries, and impossible to
audit separately from factory activity. A separate plane makes the boundary
structural rather than conditional, consistent with ADR-004: privilege comes from
which guard resolved the request, not from a runtime role comparison.

Keeping it in the monolith (rather than a separate app) follows ADR-001: one
deployment target, and the panel needs the same models.

## Consequences
- Superadmins are provisioned by hand on the server. No registration, no seeder,
  no password reset; a lost TOTP secret means deleting and re-creating the row.
- Two design systems now coexist. They must not be mixed within one page tree;
  new Superpowers UI goes under `Pages/Superpowers/` with Astryx components.
- Platform-wide switches (`READONLY`, maintenance mode) reach tenant requests
  through middleware that keys off tenant context, so they cannot lock the panel
  itself out.
- Adding a third plane (e.g. reseller/partner) requires amending this ADR, not
  copying the pattern ad hoc.
