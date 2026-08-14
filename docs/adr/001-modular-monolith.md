# ADR-001 — Server-Rendered Monolith (Inertia), No API Layer

**Status:** Accepted · **Date:** 2026-08-13 (retrospective record)

## Decision
POgrid is a Laravel 11 monolith with Inertia.js + React. No separate API, no microservices, no SPA split.

## Rationale
One team, one deployment target (shared hosting), server-driven workflows. Audits (2026-08-12/13) found the monolith is the right size; complexity came from hotspots, not the style.

## Consequences
- New capabilities ship as controllers + services + Inertia pages.
- A future mobile/third-party client would justify a narrow API via ADR amendment — extract actions then, not preemptively.
