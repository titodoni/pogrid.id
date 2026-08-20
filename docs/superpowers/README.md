# Superpowers — Platform Admin Panel

**Status:** implemented (UI + backend + tests) · **URL:** `app.pogrid.id/superpowers`

Superpowers is the internal developer/superadmin console for the POGrid platform
itself. It is **not** part of any tenant. A superadmin is a POGrid developer, not
a factory user, and has no `tenant_id`, no role, and no post.

---

## 1. Getting in

### Create a superadmin

```bash
php artisan superpowers:create-admin \
  --name="Your Name" \
  --email=you@pogrid.id
```

The command will securely prompt for the password interactively. It then prints, **once**:

- the TOTP secret,
- an `otpauth://` URL to paste into Google Authenticator / Authy / 1Password,
- eight recovery codes.

Copy them before closing the terminal. The secret is encrypted at rest and the
recovery codes are stored as SHA-256 hashes, so **neither can be displayed
again** — see §6. If they are lost, delete the row and re-run the command.

There is intentionally no self-service registration and no seeder: accounts are
provisioned by hand on the server.

### Log in

1. Visit `/superpowers/login`, enter email + password.
2. If the account has TOTP (all accounts created by the command do), you are held
   at `/superpowers/2fa/challenge` until you enter a 6-digit code. Every
   protected route redirects there until the challenge is cleared.
3. On the challenge screen, "Gunakan recovery code" swaps to a recovery-code
   field. A recovery code works exactly once and is then consumed.

Login is throttled to 5 attempts/minute per email+IP (`login-platform`), as are
the TOTP and recovery endpoints. Deactivating an account (`is_active = false`)
logs the session out on its next request.

---

## 2. What each page does

| Page | Route | Purpose |
|---|---|---|
| Dashboard | `/superpowers` | Platform KPIs: tenant counts by state, users/POs/items totals, estimated MRR, queue + failed jobs, 24h email stats, recent superadmin activity, newest tenants. |
| Tenant | `/superpowers/tenants` | List/search/filter tenants; create, edit, suspend, activate, soft-delete, restore. Detail page shows the tenant's users and PO status breakdown. |
| Langganan | `/superpowers/subscriptions` | Plan/subscription view with estimated MRR, active count, readonly count. Filter by `active` / `readonly` / `deleted`. |
| System Health | `/superpowers/health` | DB, queue, storage, and cache probes; disk usage; backup list; "Buat backup" trigger. |
| Error Log | `/superpowers/logs` | Parsed tail of `storage/logs/laravel.log` with level badges and a whole-file ERROR count. |
| Email Delivery | `/superpowers/emails` | Cross-tenant outbound mail log with status filter and subject/recipient search. |
| Pengaturan | `/superpowers/settings` | Global maintenance mode toggle + operator-authored maintenance message. |

Every mutating action writes a row to `platform_activity_logs` (`tenant.created`,
`tenant.suspended`, `maintenance.toggled`, `backup.triggered`, `login`, …), which
is what the dashboard's activity feed reads.

---

## 3. Subscription states and what they gate

`Tenant::ACTIVE_STATUSES` is the single source of truth:

| Status | Login | Read | Mutate |
|---|---|---|---|
| `ACTIVE`, `PAID`, `SUBSCRIBED` | yes | yes | yes |
| `READONLY` — or **any** other value | yes | yes | **no (403)** |

Anything outside the active set is treated as read-only, so an unrecognised or
misspelled status fails closed rather than granting write access.
`CheckTenantReadonly` allows safe HTTP methods and rejects
POST/PUT/PATCH/DELETE with 403.

**Suspending a tenant** (subscription lapsed) sets `READONLY`; the factory can
still log in and read all their history, but cannot record progress or create
POs. **Activating** returns them to `ACTIVE`.

Use `Tenant::ASSIGNABLE_STATUSES` for validation and the query scopes
`activeSubscription()` / `readonlySubscription()` / `subscriptionFilter($token)`
rather than re-listing statuses. `subscriptionFilter` accepts `all`, `active`,
`readonly`, `deleted`, or a concrete status, and both the tenant and
subscription listings share it so their filters cannot drift apart.

---

## 4. Soft-delete and restore

Tenants use `SoftDeletes`. Deletion never destroys factory data.

- Superadmin: "Hapus" on the tenant detail page → soft-delete; "Pulihkan"
  restores it.
- Tenant owner (self-service): `POST /company/delete`, owner-only, soft-deletes
  their own tenant and logs them out.

The `tenants` resource routes are registered with
`->withTrashed(['show', 'edit', 'update', 'destroy'])`. Without that, a
soft-deleted tenant 404s on its own detail page and becomes unrecoverable
through the UI — keep it when touching `routes/superpowers.php`.

---

## 5. Global maintenance mode

Toggle at `/superpowers/settings`. When enabled, `CheckTenantMaintenance` throws
`ServiceUnavailableHttpException` for **any request that has tenant context**;
the handler in `bootstrap/app.php` renders the branded `Errors/503` Inertia page
with the operator's message and a `Retry-After` header.

Superpowers routes are unaffected because they run without tenant context — you
cannot lock yourself out of the panel by enabling maintenance. The sidebar shows
a persistent warning banner while it is active.

---

## 6. Security constraints (do not regress)

- **TOTP secret** is encrypted via model accessors and listed in `$hidden`.
  **Recovery codes** are SHA-256 hashed. Neither is logged, re-displayed after
  onboarding, or serialized into Inertia props. The `platformAdmin` shared prop
  exposes only `id`, `name`, `email`, `avatar_url`, `has_two_factor`.
- **Separate guard.** `PlatformAdmin` authenticates on the `platform` guard with
  the plain eloquent provider and deliberately does **not** use
  `BelongsToTenant`. A tenant session grants no platform access, and vice versa.
- **Cross-tenant reads** go through `TenantManager::runWithoutScope()` — the
  panel legitimately needs them, but each call site states why. TenantScope
  stays fail-closed (ADR-003).
- **Tenant audit trail stays tenant-only.** `activity_logs.user_id` is a FK to
  `users`, so `ActivityLogger` records only a tenant `User` as actor. Superadmin
  actions belong in `platform_activity_logs`.

---

## 7. Files

| Concern | Location |
|---|---|
| Routes | `routes/superpowers.php` (registered in `bootstrap/app.php` `then:`) |
| Controllers | `app/Http/Controllers/Superpowers/` (+ `Auth/`) |
| Guard middleware | `AuthenticatePlatformAdmin` (`platform.auth`), `RedirectIfPlatformAdmin` (`platform.guest`), `RequireTwoFactorChallenge` (`platform.2fa`) |
| Tenant-state middleware | `CheckTenantReadonly` (`tenant.readonly`), `CheckTenantMaintenance` (`tenant.maintenance`) |
| Models | `PlatformAdmin`, `PlatformActivityLog`, `PlatformSetting`, `Plan`, `EmailLog` |
| Pages | `resources/js/Pages/Superpowers/` |
| Shared UI | `SuperAdminShell`, `PageLayout`, `MetricCard`, `ServerPagination`, `resources/js/lib/superpowers.ts` |
| Entry point | `resources/js/superpowers.tsx` + `resources/views/superpowers.blade.php` |
| Tests | `tests/Feature/Superpowers/` (52 tests) |
| Provisioning | `php artisan superpowers:create-admin` |

The panel has its **own Vite entry and root view**. `HandleInertiaRequests::rootView()`
switches to `superpowers` for `superpowers/*`, so Superpowers renders through
Astryx (`@astryxdesign/core`) while tenant pages stay on Tailwind. Do not mix
the two design systems in one page tree.

Plan prices are stored as **integer cents** (`plans.price`); format with
`formatCents()` and never with floats.

---

## 8. Dependencies

| Package | Version | Used by |
|---|---|---|
| `pragmarx/google2fa` | ^8.0.3 | TOTP generation + verification |
| `spatie/laravel-backup` | ^9.0 | `backup:run`, backup listing on the Health page |

`spatie/laravel-backup` 9.x requires Laravel 12. `config/backup.php` is published and defaults to the
`local` disk.

---

## 9. Known gaps

- **Email failure logging.** The sent path works (`queued` → `sent` with a
  transport message id). A transport-level failure leaves the row at `queued`,
  because Laravel dispatches no "message failed" event — closing this needs a
  transport decorator or an equivalent seam.
- **2FA onboarding is CLI-only.** No in-app QR page; the `otpauth://` URL from
  `superpowers:create-admin` must be pasted or converted to a QR manually.
- **No password reset for superadmins.** Reprovision via the artisan command.

---

## 10. Testing

```bash
php artisan test tests/Feature/Superpowers/
```

Four files: `SuperpowersAuthTest` (guard separation, 2FA, secret handling,
throttle), `SuperpowersTenantManagementTest` (CRUD, suspend/activate,
soft-delete/restore, filters), `SuperpowersPlatformControlsTest` (readonly
enforcement, maintenance 503, MRR, flash types), `SuperpowersObservabilityTest`
(dashboard aggregates, email log, error log, health).

`SuperpowersTestCase` provides `createAdmin()`, `createAdminWithTotp()`,
`actingAsPlatformAdmin()`, and `makeTenant()`. Because the base `TestCase` resets
tenant state, fixtures must be created inside `runWithoutScope()` —
`makeTenant()` already does.

---

## 11. React 18 & Astryx UI Compatibility

`@astryxdesign/core` targets React 19 natively (using `use`, `useOptimistic`, and
direct `<Context value="...">` provider syntax). To maintain stability on React 18:

- **Automated Patcher:** `scripts/patch-astryx.mjs` runs automatically before
  `npm run dev` and `npm run build`. It:
  - Shims `use(Context)` to `useContext(Context)`.
  - Implements a synchronous React 18 fallback for `useOptimistic` to prevent
    spurious loading indicators during input typing.
  - Transforms React 19 `<SomeContext>` provider calls into `<SomeContext.Provider || SomeContext>`.
- `@stylexjs/stylex` is installed to support Astryx StyleX compiled styles.

