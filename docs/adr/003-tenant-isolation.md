# ADR-003 — Fail-Closed Tenant Isolation

**Status:** Accepted · **Date:** 2026-08-13

## Decision
Row-level tenancy via `tenant_id` + `TenantScope` + `BelongsToTenant` + static `TenantManager`. The scope is **fail-closed**: queries without tenant context throw `TenantContextMissingException`. Cross-tenant access only via `TenantManager::runWithoutScope()` (nest-safe, restores state in `finally`). Identity/session resolution is pre-tenant by design and uses the `tenant-safe-eloquent` auth provider.

## Rationale
Fail-open scoping meant any forgotten context set became a silent cross-tenant read; the PPIC slug-override bug proved the risk was real.

## Consequences
- New code paths must set context (HTTP via `SetTenant`; commands/jobs wrap explicitly).
- Static TenantManager requires per-request/daemon-free execution; adopting Octane or queue daemons requires revisiting this ADR.
