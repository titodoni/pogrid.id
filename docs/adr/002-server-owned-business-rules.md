# ADR-002 — Server-Owned Business Rules

**Status:** Accepted · **Date:** 2026-08-13

## Decision
All business rules have exactly one owner: the server. `config/workflow.php` holds the stage-role map, pre-production keywords, office-role list, and deadline-risk thresholds. React receives a client-safe copy via the shared Inertia `workflow` prop (bridged by `FlashMessages.tsx` → `Utils/workflow.ts`). Status vocabulary lives in `app/Enums/ItemStatus.php` / `PoStatus.php` and is enforced by PostgreSQL CHECK constraints in production.

## Rationale
The 2026-08 audits found 2–4 divergent copies of the same rules across PHP and JS (stage map, deadline rule, finance rule), causing UI/backend disagreement and a dead PO status transition.

## Consequences
- Changing a rule = edit config (and enum if vocabulary). Client updates itself via the prop.
- Never hardcode rule values in TS. Client-side checks are UX affordances; the server enforces.
