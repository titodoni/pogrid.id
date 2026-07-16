# Auth and Onboarding

Two authentication guards, chosen by entry point.

## Guard A — Office (password)
Standard email/password login for Owner and Admin from the office surface.

## Guard B — Worker (PIN)
Floor workers log in with a short PIN from their phone. No password, no email required. PIN is the only credential for the worker surface.

## Onboarding
New workers are created by an Admin/Owner and given a PIN. There is no self-signup. User management UI lives on the Owner Dashboard (see `NEXT_BUILD.md` Task 1 — User Management Card).

## Links

- Back to [[POGrid Wiki Home]]
- Who uses which guard: [[Roles and Access]]
- Detailed flows in `ARCHITECTURE.md` → [[Source Docs]]
