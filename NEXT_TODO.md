# POgrid Matrix Dashboard Overhaul: Next TODOs & Roadmap

This document outlines the accomplishments from the current Matrix Dashboard Overhaul phase and lists the next prioritized tasks, improvements, and feature options for future development.

---

## 🏆 Accomplishments in Phase 1 & Enhancements

We have successfully overhauled the Owner Matrix Dashboard and Worker Floor Dashboard:

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

### 2. Worker Floor Dashboard Updates
*   Applied identical localized lifecycle badges, detailed rework reason pills, and quantity fractions (`(1/3 pcs)`) to the worker task cards on the floor view.

---

## 🚀 Future Roadmap & Next TODOs

### 🔧 1. Backend Performance & Query Optimization
- [ ] **Add Database Indexes**:
    - Add composite indexes on `items` for `(deleted_at, status, invoice_status, payment_status)` to optimize complex telemetry queries in [WorkerDashboardController.php](file:///home/tito/pogrid/app/Http/Controllers/WorkerDashboardController.php).
- [ ] **Eager Load Optimization**:
    - Further optimize lazy relations to avoid N+1 queries during telemetry calculation under high item counts.

### 📊 2. Telemetry & Reporting Upgrades
- [ ] **CSV / Excel Telemetry Export**:
    - Add a "Export to Excel" button next to "Download PDF" on the Matrix view to download raw filtered tabular reports.
- [ ] **Historical Rework Analytics**:
    - Implement a "Rework Logbook" telemetry tab to trace total rework counts per client, item, or production stage over the last 6 months to locate recurring quality control bottlenecks.

### 🔔 3. Realtime Push & Alerts
- [ ] **Pusher Channel Subscriptions**:
    - Bind Vue/React state to Pusher broadcast channels so Owner dashboard dashboards automatically slide in toast notifications when workers report a trouble/stuck alert (`Lapor Kendala`) on the floor.
- [ ] **Alert Escalation Rules**:
    - Set up automated warnings (e.g., mail or SMS notifications via log) if a `RED` alert remains unresolved for more than 24 hours.

### 👷 4. Worker Self-Monitoring (KPIs)
- [ ] **Worker Performance History**:
    - Provide a "My Completed Tasks" sub-tab on the Worker floor dashboard so workers can view their completed items, average stage cycle times, and contribution metrics for self-monitoring.
