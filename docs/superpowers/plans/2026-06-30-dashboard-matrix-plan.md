# IMPLEMENTATION PLAN: Dashboard Matrix Data (POgrid.id)

**Version:** 1.0  
**Date:** June 30, 2026  
**Status:** Draft for Review  
**Target Architecture:** Laravel 11 + Inertia.js v2 + React 18 + TypeScript + Tailwind v4 + Vite 8  

---

## 1. Executive Summary & Architecture Overview

This document outlines the step-by-step implementation plan for adding the **Performance Matrix & Analytics Dashboard** to POgrid.id. It specifies how telemetry metrics are pre-aggregated on the backend, filtered dynamically by a time-range filter, displayed in a sleek dark-themed React UI page with responsive inline SVG charts and micro-animations, prepared for meeting presentation screens, styled for professional physical printing, and exported as a formal PDF.

All operations must strictly respect **Tenant Isolation** using the row-level [TenantScope](file:///C:/Users/titod/Documents/pogrid/app/Models/Scopes/TenantScope.php) and [TenantManager](file:///C:/Users/titod/Documents/pogrid/app/Services/TenantManager.php) context.

---

## 2. Step-by-Step Implementation Steps

### Phase 1: Route & Controller Changes (Backend Telemetry)

1. **Register the PDF Export Route**
   - File: [web.php](file:///C:/Users/titod/Documents/pogrid/routes/web.php)
   - Add a new route inside the `Route::middleware('auth')` group:
     ```php
     Route::get('/dashboard/export-pdf', [OwnerDashboardController::class, 'exportPdf'])->name('dashboard.export-pdf');
     ```

2. **Add Telemetry Computations inside Controller**
   - File: [WorkerDashboardController.php](file:///C:/Users/titod/Documents/pogrid/app/Http/Controllers/WorkerDashboardController.php)
   - In the `index()` method (line 52-65), inside the `if (in_array(strtoupper($user->role), $officeRoles))` conditional block, compute pre-aggregated telemetry metrics based on the query parameter `?range=week|month|year` (defaulting to `month` if not provided).
   - Implement the following queries/calculations scoped automatically to the current tenant:
     - **On-Time Delivery Rate (OTDR)**: Count completed POs where the maximum delivery date of their associated delivery orders is less than or equal to `global_deadline`, divided by total completed POs.
     - **Manufactured Output Volume**: Sum of `(items.target_qty * items.progress_percent / 100.0)` for items where `item_type = 'MANUFACTURE'`. Return both the completed sum and the total target quantity sum.
     - **Active Risks**: Counts of unresolved alerts (`is_resolved = false`) grouped by severity (`RED` and `YELLOW`).
     - **Average Delay (in Days)**: For all POs matching the scope:
       - If completed: Calculate delay as `max(0, final_delivery_date - global_deadline)`.
       - If active/overdue: Calculate delay as `max(0, now() - global_deadline)`.
       - Compute the average across all overdue or delayed orders.
     - **Production Output & Overdue Trends (for inline SVG charts)**:
       - Daily/weekly/monthly datapoints based on the `range` filter.
       - Output: Delivered quantities summed from `do_items` matching the date intervals.
       - Overdue: Cumulative active POs where `global_deadline` is in the past relative to each interval.
     - **"Why Delayed" Reasons (for SVG Pie chart)**:
       - Match unresolved alert messages for keyword patterns: `"Machine"/"Mesin"`, `"Material"/"Bahan"`, `"Rework"/"Reject"`, `"Absence"/"Pekerja"`, and other categories.
     - **Bottleneck Stage Analyzer**:
       - Iterate over production stages (`PURCHASING`, `CNC`, `FABRICATION`, `QC`, `DELIVERY`).
       - Compute active items (`IN_PROGRESS` or `PENDING` in [ItemProgress](file:///C:/Users/titod/Documents/pogrid/app/Models/ItemProgress.php)), stuck incidents (RED alerts count matching stage name), rework count (YELLOW alerts count matching stage name), and average cycle time (average difference between `created_at` and `updated_at` for `COMPLETED` records, converted to days).
   - Pass these calculated results as a new key `telemetry` in the Inertia render props.

3. **Implement PDF Generation Method in OwnerDashboardController**
   - File: [OwnerDashboardController.php](file:///C:/Users/titod/Documents/pogrid/app/Http/Controllers/OwnerDashboardController.php)
   - Add the `exportPdf(Request $request)` method:
     - Validate the time-range parameter.
     - Perform identical calculations to retrieve metrics, trend statistics, and bottleneck analyzer stats.
     - Load a custom print-optimized PDF Blade view: `Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.performance-matrix', $data)->download('performance-matrix.pdf')`.

---

### Phase 2: Blade View Creation (PDF Template)

1. **Create the PDF Blade Template**
   - File: `resources/views/pdf/performance-matrix.blade.php` (directory: `C:/Users/titod/Documents/pogrid/resources/views/pdf`)
   - Style a clean, professional, high-contrast, black-and-white print-friendly HTML design:
     - Document header with POgrid.id logo, company name, generation timestamp, and selected time range filter context.
     - Key Performance Indicator Grid: OTDR %, Manufactured Parts Count, Active Risks Count, and Average Delay.
     - Bottleneck Analyzer stage breakdown (rendered in a clear `<table>` with borders).
     - Breakdown of Delay Reasons.
     - Signature/Verification block for meetings.

---

### Phase 3: React UI Page Integration

1. **Update Owner Translations for Dual Language Support**
   - File: [Dashboard.tsx](file:///C:/Users/titod/Documents/pogrid/resources/js/Pages/Owner/Dashboard.tsx)
   - Add translation mappings in both `translations.en` and `translations.id` for:
     - Tab button: `Performance Matrix` / `Matriks Kinerja`
     - On-Time Delivery Card: `On-Time Deliv. %` / `% Pengiriman Tepat Waktu`
     - Parts Manufactured Card: `Parts Manufactured` / `Bagian Diproduksi`
     - Active Risks Card: `Active Risks` / `Risiko Aktif`
     - Avg Delay Card: `Avg Delay` / `Rata-rata Keterlambatan`
     - Range filters: `This Week` / `Minggu Ini`, `This Month` / `Bulan Ini`, `This Year` / `Tahun Ini`
     - Analyzer Headers: `Bottleneck Stage Analyzer` / `Analisis Tahap Hambatan (Bottleneck)`, `Stage` / `Tahap`, `Active Items` / `Item Aktif`, `Stuck Incidents` / `Insiden Stuck`, `Rework Count` / `Jumlah Rework`, `Avg. Cycle Time` / `Rata-rata Waktu Siklus`
     - Chart Labels: `Production Output & Overdue Trends` / `Tren Output Produksi & Keterlambatan`, `"Why Delayed" Reasons` / `Alasan Keterlambatan`
     - Button actions: `Export PDF` / `Ekspor PDF`, `Presentation Mode` / `Mode Presentasi`, `Exit Presentation` / `Keluar Mode Presentasi`

2. **Add tab interface for the Performance Matrix**
   - File: [Dashboard.tsx](file:///C:/Users/titod/Documents/pogrid/resources/js/Pages/Owner/Dashboard.tsx)
   - Add `'matrix'` as a valid tab state value: `activeTab === 'matrix'`.
   - Update tab rendering controls to render the metrics container when selected.

3. **Construct the Performance Matrix View Components**
   - Build a layout wrapper with a class `.performance-matrix-container`.
   - **Time Filter & Export Bar**:
     - Buttons to change range selection (triggering Inertia reloads via `router.get(window.location.pathname, { range: newRange })`).
     - "Presentation Mode" button toggling `isPresentationMode` boolean state.
     - "Export PDF" button redirecting window location to the backend download route.
   - **Metrics Card Row**:
     - 4 interactive responsive boxes displaying OTDR percentage, Parts Completed Ratio, Active Red/Yellow Risk counts, and Average Delay Days.
     - Add hover transition scaling (`scale-102` / `hover:shadow-md`) and accent outlines.
   - **Inline Responsive SVG Charts**:
     - **Production & Overdue Chart**: Draw an inline SVG containing:
       - Multi-bar chart representing production output numbers per day/week/month (colored Royal Blue `#3b82f6` or Emerald `#10b981`).
       - Line overlay path representing the overdue backlog numbers (colored Rose `#ef4444`).
       - SVG tooltips appearing on cursor hover.
     - **Why Delayed Pie Chart**: Draw a segmented SVG circle with slice paths computed dynamically from percentages, complete with a clean color legend matching the reason categories (Machine, Material, QC Reject, Operator Absence, Other).
   - **Bottleneck Stage Analyzer Table**:
     - Build a responsive table containing stage metrics. Highlight stages experiencing excessive rework counts (YELLOW) or stuck incidents (RED).

---

### Phase 4: CSS Layout & Print Stylesheets

1. **Add Presentation Mode Styles & Print Styling**
   - File: [app.css](file:///C:/Users/titod/Documents/pogrid/resources/css/app.css)
   - Append style definitions:
     - Hide navigation headers, settings options, and workers' PIN terminal cards during presentation mode.
     - Force charts to scale to 100% width/height during presentation mode.
     - Add the `@media print` rules specified in the design spec to completely hide interactive web controls and optimize contrast on white background for physical paper print layouts.

---

### Phase 5: Feature & Integration Testing

1. **Create the Testing Class**
   - File: `tests/Feature/PerformanceMatrixTest.php` (directory: `C:/Users/titod/Documents/pogrid/tests/Feature`)
   - Define standard testing methods:
     - `test_matrix_dashboard_access_restricted_to_office_roles()`: Verify that `OWNER`, `ADMIN`, `SALES`, and `MANAGER` roles can successfully view dashboard props, while floor operator roles receive a `403` error.
     - `test_metrics_isolated_to_active_tenant()`: Seed mock data across multiple tenants and assert that calculations only reflect data belonging to the authenticated tenant.
     - `test_on_time_delivery_rate_calculation()`: Verify calculation formula under both perfect delivery scenarios and overdue delivery scenarios.
     - `test_manufactured_volume_calculation_precision()`: Seed multiple manufacturing items with varying quantities and progress percentages, verifying the expected summed completion count matches calculations.
     - `test_bottleneck_stage_analyzer_aggregations()`: Check stats counts for stuck alerts, QC rework counts, and verify average cycle-time calculation logic.
     - `test_time_range_filter_queries()`: Assert that changing range params filter queries and aggregates data matching the designated week, month, and year timestamp scopes.
     - `test_pdf_export_downloads_correct_document()`: Verify route returns a PDF response header for authorized users.

---

## 3. Risk Mitigation & Implementation Safety

> [!IMPORTANT]
> **Tenancy Context Scope Safety**
> Ensure all calculations inside controller functions are run after `TenantManager::setTenantId($tenant->id)` has been invoked to guarantee that global scopes are fully applied and prevent any potential cross-tenant leakage.

> [!TIP]
> **Performance Optimization on DB Reads**
> When computing cycle times and stage breakdowns, retrieve collection data using Eloquent's `select` projection columns rather than loading full model relationships. This optimizes memory consumption when running on resource-constrained shared hosting environments.

> [!WARNING]
> **Vite Compilation & Tailwind v4 Config**
> Remember that the project uses Tailwind v4 with the `@tailwindcss/vite` plugin (no `tailwind.config.js` exists). Customize any variables or class extensions directly inside [app.css](file:///C:/Users/titod/Documents/pogrid/resources/css/app.css) or using inline style variables.

---

## 4. Verification Checklists

### Backend Readiness Check
- [ ] Routes are registered and protected by authentication guards in [web.php](file:///C:/Users/titod/Documents/pogrid/routes/web.php).
- [ ] Pre-aggregations are calculated within tenant-scoping context in [WorkerDashboardController.php](file:///C:/Users/titod/Documents/pogrid/app/Http/Controllers/WorkerDashboardController.php).
- [ ] PDF export endpoint loads the `pdf.performance-matrix` view and serves the PDF file binary.

### Frontend UI/UX Check
- [ ] Active selection filter state is persisted to `localStorage` under `pogrid_lang`.
- [ ] Toggle buttons switch interface text between English and Bahasa Indonesia.
- [ ] SVG charts scale correctly on mobile and desktop viewports.
- [ ] Hover tooltips appear on SVG path overlays.
- [ ] Presentation Mode expands layouts to full viewport when clicked.
- [ ] Print preview page-breaks are properly structured using `@media print`.

### Test Suite Validation Check
- [ ] Run `composer test` and verify that all pre-existing tests and new Performance Matrix tests compile and pass successfully.
