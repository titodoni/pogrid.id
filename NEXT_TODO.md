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

### 6. Partial Invoice & Finance UI
*   **Partial Invoice Support (Finance Dashboard)**: Added tri-state invoice status (UNINVOICED/PARTIAL/INVOICED) with dedicated purple badge, `invoiced_qty` input capped at `delivered_qty`, and "Invoice Full" / "Invoice Partial" selector buttons.
*   **Partial Payment Support**: Added PARTIAL_PAID payment status with indigo badge distinct from PAID/UNPAID.
*   **Finance Gate Delivery Check**: Finance requires `delivery_status != PENDING` — PARTIAL/DELIVERED delivery passes the gate.
*   **Auto-Cascade to CLOSED**: When all items in a PO reach `payment_status = PAID`, PO auto-transitions to `CLOSED`.
*   **Owner Dashboard Invoice Status Badges**: Added PARTIAL invoice/payment/delivery badges with distinct colors and qty fractions in item directory and matrix views.

### 7. Core Architecture & Layout Stability
*   **Global Layout Refactor**: Resolved an app-wide bug in [app.tsx](file:///home/tito/pogrid/resources/js/app.tsx) where the global default layout was defined as an inline anonymous wrapper, causing React to completely unmount and remount the entire page component tree on every Inertia props update. Defined a constant layout reference (`defaultLayout`) to keep components mounted, preserving state correctly.
*   **Preserved State across Operations**: Standardized Inertia AJAX requests on the worker floor dashboard to use `preserveState: true`, preventing card drawers from auto-collapsing when updating progress.
*   **Global Item Name Cleanup**: Implemented an Eloquent model accessor (`getItemNameAttribute`) in [Item.php](file:///home/tito/pogrid/app/Models/Item.php) to automatically strip stage suffixes (e.g. `(CNC)`, `(CNC + Fabrication)`) globally, updating all directories, summaries, and lists cleanly while preserving database integrity. Seeders were also cleaned.

---

## 🚀 Future Roadmap & Next TODOs

### ⚙️ 1. User Management & Admin UI [DONE]
- [x] **Worker Accounts Directory**:
    - User Management (Team) tab in Owner dashboard lists all floor workers with role/post filters.
- [x] **Edit User & PIN Management Modal**:
    - Modal for editing profiles, toggling Password/PIN login, changing credentials.
- [x] **PIN Reset Request Approval Panel**:
    - Dashboard UI widget for Admins to approve pending PIN reset requests (BLUE alerts).
- [x] **Delete Worker Flow**:
    - Delete action with confirmation dialog, self-deletion protection.

### 🔧 2. Backend Performance & Query Optimization [DONE]
- [x] **Add Database Indexes**:
    - Composite index migration added: `items(tenant_id, status, invoice_status, payment_status)`.
- [x] **Eager Loading Optimization**:
    - Relations optimized in `buildClientHealth()`, N+1 eliminated, verified via PerformanceMatrixTest.

### 📊 3. Telemetry & Reporting Upgrades
- [x] **CSV / Excel Telemetry Export** (GIT-51):
    - Add a "Export to Excel" button next to "Download PDF" on the Matrix view to download raw filtered tabular reports.
- [x] **Historical Rework Analytics** (GIT-71):
    - Implement a "Rework Logbook" telemetry tab to trace total rework counts per client, item, or production stage over the last 6 months to locate recurring quality control bottlenecks.

- [x] **Real-time Live Sync (Phases 1–7)**:
    - Implemented `ShouldBroadcastNow` instant delivery, presence channel online users pill & popover, scoped partial reloads, trailing 800ms debouncing, WebSocket health monitoring & warning banner, PO broadcast push, and E2E test suite. See [`docs/LIVE_SYNC_BUILD_PLAN.md`](docs/LIVE_SYNC_BUILD_PLAN.md).

> Pusher infrastructure & real-time live sync: 100% complete across all 7 phases.

### 👷 5. Worker Self-Monitoring (KPIs)
- [x] **Worker Performance History** (GIT-71):
    - Provide a "My Completed Tasks" sub-tab on the Worker floor dashboard so workers can view their completed items, average stage cycle times, and contribution metrics for self-monitoring.
