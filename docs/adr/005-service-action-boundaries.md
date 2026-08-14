# ADR-005 — Service Boundaries (No Repository/Manager/Processor Layers)

**Status:** Accepted · **Date:** 2026-08-13

## Decision
Domain operations live in narrowly scoped plain services — `ProgressService` (write pipelines), `StageGate` (stage authorization), `TelemetryService` (analytics/exports input), `ExportService`, `PoCompletionChecker`, `ActivityLogger`, `TenantManager`. Controllers orchestrate; models stay thin; observers own recalculation cascades. No repositories, managers, processors, or interface layers.

## Rationale
God files (`WorkerDashboardController` 1,946→841 LOC, `Owner/Dashboard.tsx` 4,203→2,610 LOC) were decomposed only where a real responsibility existed. Abstraction for its own sake is rejected.

## Consequences
- New business operations: extend an existing service when the domain matches; otherwise create a small named service.
- A new abstraction layer requires an ADR first.
