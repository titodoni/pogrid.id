# GIT-73 — Backlog Feature Regression Tests: QA Report

**QA Engineer:** POGrid QA (agent 37c32010)
**Date:** 2026-07-17 (updated)
**Scope:** Regression coverage for all recently-shipped Backlog roadmap features.

## Final result: PASS

- **Feature suite: 119 passed (1206 assertions)**
- **Unit suite: 1 passed**
- No functional regressions remain.

## Backlog objective coverage map

| Backlog area | Covering tests | Status |
|--------------|----------------|--------|
| Worker dashboard role stage controls | `test_drafter_and_purchasing_role_stage_updates`, `test_finance_role_cannot_update_cnc_or_fabrication`, `test_stage_locks_and_role_validations`, `test_off_state_lock_*` (StageFlowE2ETest / CoreLogicTest) | PASS |
| Drafter / purchasing status endpoints | covered above | PASS |
| Finance queue filter SQL | `test_finance_queue_filters_completed_items`, `test_finance_gate_blocks_until_delivered` | PASS |
| PIN reset approval | AdminManagementTest | PASS |
| Pusher event assertions | PusherRealtimeE2ETest (9 tests) | PASS |
| CSV / XLSX / PDF export format | BacklogFeatureRegressionTest + PerformanceMatrixTest (8+ tests) | PASS |
| Rework analytics accuracy | `test_rework_logbook_returns_expected_data`, `test_qc_rework_*` | PASS |
| Stage template CRUD | `test_stage_templates_list_*`, `test_stage_template_create_*`, `test_stage_template_update_and_delete`, `test_stage_templates_are_tenant_isolated` | PASS |
| Repeat order clone integrity | `test_create_po_page_exposes_recent_pos_for_repeat_order` | PASS |
| PPIC dashboard queries | PpicDashboardTest (7 tests) | PASS |
| Performance / composite indexes | PerformanceMatrixTest aggregation tests | PASS |
| Worker "My KPI" personal dashboard (`/c/{slug}/my-kpi`) | `test_worker_my_kpi_returns_completed_stages`, `test_worker_my_kpi_filters_completed_stages_by_role`, `test_worker_my_kpi_blocks_cross_tenant_worker` (**added this run**) | PASS |

## Tests added by QA this run

`tests/Feature/BacklogFeatureRegressionTest.php` — added 3 regression tests for the new
worker "My KPI" feature (`WorkerDashboardController::myKpi`):

1. `test_worker_my_kpi_returns_completed_stages` — endpoint renders `Worker/MyKpi`
   with `completed_stages`, `summary`, `stage_breakdown`, `monthly_trend`; verifies
   cycle-time math (5-day cycle → `avg_cycle_days` = 5). NOTE: `ItemProgress`
   `created_at`/`updated_at` are **not** fillable, so the test sets them post-create
   via `save()` to exercise the cycle-time calculation.
2. `test_worker_my_kpi_filters_completed_stages_by_role` — a DRAFTER worker sees only
   drafter-matched completed stages (`Design`) and is correctly excluded from
   machining stages, validating the `STAGE_ROLE_MAP` filter.
3. `test_worker_my_kpi_blocks_cross_tenant_worker` — a worker from another tenant is
   rejected with HTTP 403 (tenant isolation guard).

Prior run added 4 stage-template CRUD regression tests (list, create, update+delete,
tenant isolation), closing the template-management coverage gap.

## Note on the previously-reported XLSX blocker (prior run)

The prior run flagged a 500 `TypeError` in `exportXlsx()` (`Row::fromValues` 2nd-arg misuse
/ `new StyleManager(new Style)`). This is **RESOLVED**: the controller now uses
`Row::fromValuesWithStyle(...)` + `(new Style)->withFontBold(true)` (no `StyleManager`).
The stale failures observed at the start of this run (XLSX, rework logbook, 6 PPIC tests)
were all caused by a **stale bootstrap/config cache**. After `php artisan config:clear`
+ `clear-compiled`, all 115 Feature tests pass. No code bug remained.

**QA process note:** always run `php artisan config:clear` before the suite in this
environment to avoid false failures from cached controller classes.

## Disposition

**DONE.** Full backlog regression coverage in place and green (119 Feature + 1 Unit).
Stage-template CRUD gap closed; worker "My KPI" feature now covered (role filtering +
tenant isolation + cycle-time math). No open blockers. No handoff required.

### Working tree status (verified 2026-07-17)
Clean. The "My KPI" feature source (`WorkerDashboardController::myKpi` + `worker.my-kpi`
route) has since been committed by the Engineer (no longer uncommitted). The 3 QA
regression tests validate it from the committed tree.

### Flaky-test note
One isolated run of the full suite reported `1 failed, 128 passed` with the failure
pointing at `AdminManagementTest.php:223`; a direct re-run of that file (10 passed /
127 assertions) and a subsequent full re-run (119 passed / 1206 assertions) both pass.
Likely a warmup/timing artifact from the embedded-postgres + `xsl.so` warning, not a
code defect. Recommend re-running once more before treating any single-failure run as a
real regression.
