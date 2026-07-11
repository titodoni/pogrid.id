# POgrid Matrix Dashboard Overhaul: Next TODOs & Roadmap

This document outlines the accomplishments from the current Matrix Dashboard Overhaul phase and lists the next prioritized tasks, improvements, and feature options for future development.

---

## 🏆 Accomplishments in Phase 1 & Enhancements

We have successfully overhauled the Owner Matrix Dashboard, Worker Floor Dashboard, and system-wide Authentication/Onboarding UI layouts:

### 1. Owner Matrix Dashboard Makeover
*   **Production Pipeline**: Restructured the visual pipeline flow to reflect the actual shop floor workflow (`Drafter` $\rightarrow$ `Purchasing` $\rightarrow$ `CNC / Milling / Welder / Helper (Productions)` $\rightarrow$ `QC` $\rightarrow$ `Finance` $\rightarrow$ `Delivery`).
*   **Telemetry KPIs & Comparison**: Implemented period-over-period comparisons (Current Month vs Previous Month) always visible for OTD Rate (On-Time Delivery), Manufactured Volume, and Lead Time.
*   **Interactive Drilldowns**: Enabled interactive click-through states on all KPI cards, stage metrics, and the Client Scoreboard. Clicking any metric applies a global filter to the Directory table below.
*   **Interactive PO & Item Directory Filters**:
    *   Added pill buttons to filter the directory: **Per Client (Default)**, **Marked (Rework / Trouble)**, **Delayed**, **On Time**, and **Close Due Date**.
    *   Grouped items dynamically by Client Name with clean section headers.
    *   Works in combination with drilldown filters (compound filtering).
*   **Active POs Tab Enhancements**:
    *   Added matching pill filters to the Active POs tab, filtering both POs and nested items simultaneously.
*   **Clarified Lifecycles & Status Badges**:
    *   Mapped raw database statuses and enums to descriptive, localized text:
        *   `MANUFACTURE` $\rightarrow$ `Produksi Internal / Manufactured`
        *   `BUYOUT` $\rightarrow$ `Beli Jadi / Buyout`
        *   `APPROVED` $\rightarrow$ `Gambar Disetujui / Drawing Approved`
        *   `READY` $\rightarrow$ `Bahan Baku Siap / Material Ready`
        *   `PROSES` $\rightarrow$ `Bahan Dipesan / Material Ordered`
        *   `IN_PROGRESS` $\rightarrow$ `Proses Produksi / In Production`
    *   Added quantity fractions next to progress percentages (e.g., `33% (1 / 3 pcs)`).
    *   Replaced generic rework warning indicators with specific rework reasons parsed from active DB alerts.

### 2. Pro-Grade Mobile UI/UX & Responsiveness Overhaul
*   **Tab Navigation Grid**: Replaced horizontal side-scrolling dashboard tabs with a responsive 3-column grid layout using short labels (`Alerts`, `Active`, `Done`, `Matrix`, `Team`) on mobile viewports.
*   **Wrap-Around PO Filters**: Refactored the PO Filter Bar on mobile to run a clean 2-column flex-wrap layout using short filter labels (`Semua`, `Ditandai`, `Terlambat`, `Tepat Waktu`, `Mendekati`), eliminating horizontal side-scrolling.
*   **Production Pipeline Grid Layout**: Refactored the stage timeline visualization in the Performance Matrix tab on mobile into a 2-column grid layout with arrows hidden, keeping stages fully visible on any screen width without side-scrolling.
*   **Interactive Summary Bar Pills**: Converted the static text summary pills (Issues, Delayed, Closing, Rework, Stuck) into interactive button elements. Clicking any pill switches to the corresponding tab and applies filters automatically (e.g., clicking "Rework" opens the Active tab and applies the "Marked" filter).
*   **Compact Single-Row Header**: Redesigned the main Owner header on mobile into a grid row, shrinking buttons and hiding the date/time display to save 50px of vertical viewport height.
*   **Truncated Terminal URL Chip**: Clamped the floor terminal URL element to truncate with ellipsis (`text-overflow: ellipsis`) and flex-shrink properly so the page does not overflow horizontally.
*   **PO & Item Directory Mobile Cards**: Designed a custom stacked card list layout for mobile viewports, avoiding wide table horizontal overflows by displaying PO info, item name, progress badges, deadline dates, and active delay notes cleanly.
*   **Bottleneck Analyzer Mobile Cards**: Split the Stage Analyzer table into a desktop table and a mobile-friendly card layout showing stage names, average cycle times, active item metrics, stuck counts, and rework statistics.
*   **Client Performance Board Mobile Cards**: Converted the Client Performance table on mobile into modern client profile cards displaying OTD metrics, active PO counts, and a bottom status grid with clear indicators for overdue, uninvoiced, and unpaid risks.
*   **Unambiguous Dashboard Dashes**: Replaced confusing green checkmarks (`✓`) in the Client Board columns (indicating zero outstanding items) with clean, muted dashes (`-`) to represent "none" cleanly and remove visual ambiguity.

### 3. Worker Floor Dashboard Updates
*   **Tactile Stepper Controls**: Redesigned completed quantity controls by splitting display text from action buttons and standardizing on a robust `44px` finger-friendly touch target with both increment (`+`) and decrement (`−`) step controls.
*   **Greeting Post Titles**: Modified the header greeting to show the active worker's specific post name next to their name (e.g., `Halo, Hendra Gunawan (CNC)` or `Halo, Bambang Supriyadi (Welder)`).
*   **Compact Rework Badges**: Compressed verbose rework status alerts into a concise `Rework (X pcs)` badge dynamically parsed using regex, saving critical horizontal screen real estate.
*   **Eliminated Sticky Mobile Hover**: Restructured card transitions to use touch-down scaling (`transform: scale(0.985)`) on mobile tap and restricted translate hover elevations strictly to desktop hover-supporting devices.
*   *   Applied identical localized lifecycle badges, detailed rework reason pills, and quantity fractions (`(1/3 pcs)`) to the worker task cards on the floor view.
*   *   Fixed mobile layouts to utilize dynamic viewport heights (`100dvh`) and scrollable panel wrappers, ensuring zero container clipping.

### 4. Auth & Onboarding UI Makeover
*   Overhauled onboarding registration (`Register.tsx`), password recovery (`ForgotPassword.tsx`), and resetting (`ResetPassword.tsx`) views.
*   Modernized elements using Zinc-Indigo branding palettes (`#09090b` and `#6366f1`), rounded input borders (`10px`), and standard entry transition animations (`animate-in`).

### 5. Core Architecture & Layout Stability
*   **Global Layout Refactor**: Resolved an app-wide bug in [app.tsx](file:///home/tito/pogrid/resources/js/app.tsx) where the global default layout was defined as an inline anonymous wrapper, causing React to completely unmount and remount the entire page component tree on every Inertia props update. Defined a constant layout reference (`defaultLayout`) to keep components mounted, preserving state correctly.
*   **Preserved State across Operations**: Standardized Inertia AJAX requests on the worker floor dashboard to use `preserveState: true`, preventing card drawers from auto-collapsing when updating progress.
*   **Global Item Name Cleanup**: Implemented an Eloquent model accessor (`getItemNameAttribute`) in [Item.php](file:///home/tito/pogrid/app/Models/Item.php) to automatically strip stage suffixes (e.g. `(CNC)`, `(CNC + Fabrication)`) globally, updating all directories, summaries, and lists cleanly while preserving database integrity. Seeders were also cleaned.

---

## 🚀 Future Roadmap & Next TODOs

### ⚙️ 1. User Management & Admin UI
- [ ] **Worker Accounts Directory**:
    - Add a User Management sub-tab in the Owner dashboard to list all floor workers, their active roles, and posts.
- [ ] **Edit User & PIN Management Modal**:
    - Allow administrators to edit worker profiles, toggle between Password and PIN login methods, and change credentials/PINs directly.
- [ ] **PIN Reset Request Approval Panel**:
    - Add a dashboard UI widget for Admins to view pending PIN reset requests (`BLUE` alerts) and approve them to automatically generate and display a new 4-digit PIN once.
- [ ] **Delete Worker Flow**:
    - Build a delete worker action with confirmation dialog, ensuring self-deletion protection.

### 🔧 2. Backend Performance & Query Optimization
- [ ] **Add Database Indexes**:
    - Create a database migration to add composite indexes on `items` for `(deleted_at, status, invoice_status, payment_status)` to optimize complex telemetry queries in [WorkerDashboardController.php](file:///home/tito/pogrid/app/Http/Controllers/WorkerDashboardController.php).
- [ ] **Eager Loading Optimization**:
    - Optimize relations to avoid N+1 query loops inside metrics generation functions (e.g. `buildClientHealth`).

### 📊 3. Telemetry & Reporting Upgrades
- [ ] **CSV / Excel Telemetry Export**:
    - Add a "Export to Excel" button next to "Download PDF" on the Matrix view to download raw filtered tabular reports.
- [ ] **Historical Rework Analytics**:
    - Implement a "Rework Logbook" telemetry tab to trace total rework counts per client, item, or production stage over the last 6 months to locate recurring quality control bottlenecks.

### 🔔 4. Realtime Push & Alerts
- [ ] **Pusher Channel Subscriptions**:
    - Bind React state to Pusher broadcast channels so Owner dashboard dashboards automatically slide in toast notifications when workers report a trouble/stuck alert (`Lapor Kendala`) on the floor.
- [ ] **Alert Escalation Rules**:
    - Set up automated warnings (e.g., mail or SMS notifications via log) if a `RED` alert remains unresolved for more than 24 hours.

### 👷 5. Worker Self-Monitoring (KPIs)
- [ ] **Worker Performance History**:
    - Provide a "My Completed Tasks" sub-tab on the Worker floor dashboard so workers can view their completed items, average stage cycle times, and contribution metrics for self-monitoring.
