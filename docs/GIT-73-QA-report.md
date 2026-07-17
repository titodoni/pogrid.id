# GIT-73 — Backlog Feature Regression Tests: QA Report

**QA Engineer:** POGrid QA (agent 37c32010)
**Date:** 2026-07-17
**Scope:** Regression coverage for recently-shipped Backlog roadmap features, specifically the Performance Matrix export endpoints (GIT-51: CSV/Excel/PDF export).

## What was done

Added `tests/Feature/BacklogFeatureRegressionTest.php` covering the Matrix export feature:

| Test | Result | Notes |
|------|--------|-------|
| export csv requires authentication | PASS | Web `auth` guard redirects (302) — expected |
| export csv blocked for floor role | PASS | 403 for non-office role — correct gate |
| export csv allowed for office role | PASS | 200, text/csv, UTF-8 BOM, contains KPI + item rows |
| export csv defaults invalid range | PASS | `range=bogus` falls back to `month` |
| export pdf allowed for office role | PASS | 200, application/pdf, attachment disposition |
| export csv is tenant isolated | PASS | Tenant2's "Secret Client" NOT leaked into tenant1 CSV |
| **export xlsx allowed for office role** | **FAIL** | **500 TypeError — real regression (see below)** |

## BLOCKER BUG FOUND — XLSX export broken (GIT-51 regression)

**Symptom:** `GET /c/{slug}/export-xlsx` returns HTTP 500 for any office user.

**Root cause:** `app/Http/Controllers/WorkerDashboardController.php` builds XLSX rows with:
```php
$boldStyle = (new Style)->setFontBold();
$writer->addRow(Row::fromValues(['Metric','Value','Note'], $boldStyle));
```
The installed OpenSpout version exposes `Row::fromValues(array $cells, float $height = …, ?Style $style = …)`.
The style argument is the **3rd** parameter, not the 2nd. Passing `$boldStyle` as the 2nd arg binds it to `$height` (float), raising:
```
TypeError: OpenSpout\Common\Entity\Row::fromValues(): Argument #2 ($height) must be of type float,
OpenSpout\Common\Entity\Style\Style given, called in WorkerDashboardController.php:468
```

**Impact:** The "Export to Excel" button (GIT-51) on the Matrix tab is completely non-functional in production. CSV and PDF exports work.

**Suggested fix (for POGrid Engineer):**
Option A (keep bold header): replace `Row::fromValues($cells, $boldStyle)` with
`Row::fromValuesWithStyle($cells, $boldStyle)` (OpenSpout API exists at `Row::fromValuesWithStyle`).
Option B (drop bold): use `Row::fromValues($cells)` everywhere and remove `$boldStyle`.

The dead `new StyleManager(new Style)` call referenced in earlier stack traces is no longer in the file (already removed); only the `Row::fromValues` 2nd-arg misuse remains.

## Recommended next action

1. POGrid Engineer fixes `Row::fromValues` → `Row::fromValuesWithStyle` (or drops the style arg) in `exportXlsx()`.
2. Re-run `php artisan test --filter BacklogFeatureRegressionTest`; the XLSX test must turn green.
3. Manual smoke: click "Export to Excel" on Matrix tab, confirm a valid `.xlsx` downloads and opens.

## Disposition

**in_progress → blocked on POGrid Engineer for the XLSX fix.** Regression suite merged (CSV/PDF/tenant-isolation all green). One failing test documents the XLSX blocker until the coder patches `WorkerDashboardController::exportXlsx`.
