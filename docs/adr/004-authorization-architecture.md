# ADR-004 — Structural Authorization

**Status:** Accepted · **Date:** 2026-08-13

## Decision
Authorization is enforced by architecture, not developer memory:
1. Route-group middleware — office group: `auth` + `can:access-office` + `verified` (order matters: role boundary before verification).
2. Gates/policies as the second, resource-specific layer (`view-tenant`, `manage-ppic`, `approve-pin-reset`, `log-rework`, `update-finance`, …).
3. `User` implements `MustVerifyEmail` with the framework `verified` middleware.

## Rationale
Pre-remediation, authz was opt-in per controller method; several mutating endpoints (PPIC writes, PIN approval) had none.

## Consequences
- Every new mutating route declares its gate at the route or controller entry point.
- New office routes inherit `access-office` automatically by group placement.
