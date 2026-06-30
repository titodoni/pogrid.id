# DESIGN SPECIFICATION: Dashboard Matrix Data (POgrid.id)

**Document Version:** 1.0  
**Date:** June 30, 2026  
**Status:** Approved by User  
**Target Audience:** Office Roles (OWNER, ADMIN, SALES, MANAGER)

---

## 1. Executive Summary & Core Philosophy

POgrid.id is built as a **Live Progress & Delivery Punctuality Tracker** for SME manufacturing workshops. The core philosophy is to **eliminate the Owner's anxiety** by providing a single source of truth. Owners, Sales, and Managers should be able to answer any question about active orders, timelines, delays, and historical production performance **directly from the dashboard**, without having to walk to the factory floor or ask operators.

This specification describes the **Performance Matrix & Analytics Dashboard**, an interactive, meeting-ready, and print-friendly reporting tool integrated into the Office Dashboard view.

---

## 2. Terminology & Key State Transitions

To ensure metrics are precise and map to the physical workflow, the following business definitions are used:

* **Production Progress (0% to 100%)**: Calculated at the item level. Production is officially **100% finished** when the **QC stage** (and all other assigned stages such as `PURCHASING`, `CNC`, and `FABRICATION`) has been logged as completed (`progress_percent == 100.00`).
* **Delivery Status**: Tracked via Delivery Orders (`delivery_orders` and `do_items`). A PO is **Fully Delivered** when the sum of `delivered_qty` for all its items equals the sum of `target_qty`.
* **Closed Status (Paid)**: A PO transitions to **CLOSED** when it is completed, delivered, invoiced, and the status of its associated invoice transitions to `PAID` (or is manually closed by the Owner).
* **Purchasing Stage**: Treated as a core production stage. Outsource and raw material procurement progress directly impacts bottleneck metrics and production lead times.

---

## 3. User Interface Design

The analytics are integrated as a new **"Performance Matrix"** tab on the existing Office Dashboard page (`resources/js/Pages/Owner/Dashboard.tsx`).

### 3.1 Web layout Structure

```
+--------------------------------------------------------------------------------------+
|  POgrid.id                                                  [Settings] [Sign Out]    |
+--------------------------------------------------------------------------------------+
|  [ Open Alerts (3) ]   [ Active POs ]   [ Completed ]   [* Performance Matrix *]     |
+--------------------------------------------------------------------------------------+
|  TIME RANGE FILTER: [ This Week ] [ This Month ] [ This Year ]    [🖨️ Export PDF]    |
|                                                                                      |
|  +-------------------+  +-------------------+  +-------------------+  +-----------+  |
|  | On-Time Deliv. %  |  | Parts Manufactured|  | Active Risks      |  | Avg Delay |  |
|  |     87.5%         |  |   1,250 / 1,500   |  |   1 Stuck / 1 Rew |  |  1.8 Days |  |
|  |                   |  |                   |  |    (All Healthy)  |  |           |  |
|  | +-----------------+  +-------------------+  +-------------------+  +-----------+  |
|                                                                                      |
|  +------------------------------------------+  +----------------------------------+  |
|  | Production Output & Overdue Trends (SVG) |  | "Why Delayed" Reasons (SVG Pie)  |  |
|  |                                          |  |                                  |  |
|  |   [|||] [|||] [|||] [|||] [|||] (Output) |  |   ( ) Machine: 40%               |  |
|  |   ~~~o~~~~o~~~~o~~~~o~~~~o~~~ (Overdue)  |  |   ( ) Material: 30%              |  |
|  | +----------------------------------------+  +----------------------------------+  |
|                                                                                      |
|  +--------------------------------------------------------------------------------+  |
|  | Bottleneck Stage Analyzer                                                      |  |
|  | Stage        Active Items   Stuck Incidents   Rework Count   Avg. Cycle Time   |  |
|  | PURCHASING   3              1                 0              1.2 days          |  |
|  | CNC          5              4                 2              2.5 days          |  |
|  | FABRICATION  2              0                 0              3.1 days          |  |
|  | QC           1              0                 1 (loops)      0.5 days          |  |
|  | DELIVERY     0              0                 0              0.4 days          |  |
|  +--------------------------------------------------------------------------------+  |
|                                                                                      |
|  +--------------------------------------------------------------------------------+  |
|  | Active Delay & Risk Directory                                                  |  |
|  | PO Number    Client         Item           Progress   Deadline   Overdue       |  |
|  | PO-2026-004  Mega Steel     Gear Shaft     40%        2026-07-02 2 days late   |  |
|  |              *Stuck: CNC Machine Broken alert details*                         |  |
|  +--------------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------------+
```

### 3.1.2 Revisions & Enhanced UI Features
1. **Active Delay & Risk Directory**: 
   * A dedicated granular table listing every single delayed or stuck item currently active.
   * Lists the PO number, client name, item, progress percentage, deadline, days overdue, and the precise alert or stuck reasons.
   * **Interactive Navigation**: Clicking on the PO Number link in the table automatically switches the user back to the **Active POs** tab and auto-expands the corresponding PO card details.
2. **Warning Engine**:
   * Evaluates and highlights deadlines and alerts using high-contrast pills:
     * **Yellow (Close Deadline)**: Triggered when `global_deadline` is <= 3 days in the future (shows `{N} more days` / `{N} hari lagi`).
     * **Red (Passed/Delayed)**: Triggered when `global_deadline` is in the past (shows `Delayed {N} days` / `Terlambat {N} hari`).
     * **Orange (Rework)**: Triggered when there is an active QC rework alert on the item (shows `Rework`).
     * **Green (Normal)**: Triggered for healthy timelines (shows `Normal`).
   * Warning engine pills are displayed uniformly on PO card summaries, expanded item details, and the worker/operator terminal task queue cards.
3. **Unified Command Center ("Peringatan Aktif")**:
   * Converted the standard unresolved alerts tab into a consolidated issues center.
   * Merges all active database alerts (trouble alerts, PIN resets) with computed delayed items, close deadlines, reworks, and stuck stages into a single, high-priority issues list.
   * Each issue card is badge-coded by type/severity and is interactive; clicking any PO-related issue card jumps the user directly to that PO card's expanded workspace in the active directory.
4. **Friendly KPI Metrics**:
   * Rephrased raw `"Red / Yel"` warnings in matrix metrics and PDF layouts into readable descriptors:
     * `All Healthy` / `Semua Aman` when risks are 0.
     * `{N} Stuck / {M} Rework` for active issues.

### 3.2 Dynamic Visual Design & Micro-Animations
* **Theme**: Sleek dark mode (`#090d16` background) with high-contrast text and vibrant accents:
  * **Emerald (`#10b981`)** for healthy, completed, or on-time states.
  * **Amber (`#f59e0b`)** for warnings, reworks, or yellow-risk states.
  * **Rose (`#ef4444`)** for stuck operators, overdue items, or red-risk alerts.
  * **Royal Blue (`#3b82f6`)** for standard processing and active quantities.
* **Inline SVG Charts**: Completely responsive SVG charts styled with Tailwind CSS v4 transition classes, rendering custom path tooltips on hover.
* **Micro-interactions**: Hover scaling on cards, smooth progress bar fill transitions, and alert pulsing.

### 3.3 "Meeting-Ready" Presentation Mode & Print CSS
* **Presentation Mode Toggle**: Clicking the `Presentation Mode` button hides all admin utilities (like settings dropdown, user lists, forms, and secondary navigation) and scales charts to fill the screen for easy reading on projectors.
* **Print CSS Layout (`@media print`)**:
  ```css
  @media print {
      body {
          background-color: #ffffff !important;
          color: #000000 !important;
      }
      .floor-terminal-box, 
      .tab-bar, 
      header, 
      button, 
      .settings-dropdown {
          display: none !important;
      }
      .po-accordion-body {
          display: block !important;
          page-break-inside: avoid;
      }
      .performance-matrix-container {
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
      }
  }
  ```

---

## 4. Backend Architecture & Aggregations

To optimize server CPU and DB query speeds on shared hosting, the dashboard reads pre-aggregated telemetry metrics.

### 4.1 SQL & Eloquent Queries
1. **On-Time Delivery Rate (OTDR)**:
   Calculates the ratio of completed POs whose final Delivery Order date was on or before its `global_deadline`.
2. **Manufactured Output Volume**:
   Sums up completed portions of active and completed items:
   $$\text{Output} = \sum (\text{items.target\_qty} \times \frac{\text{items.progress\_percent}}{100.0})$$
   for items with `item_type = 'MANUFACTURE'`.
3. **Bottleneck Metrics per Stage**:
   Analyzes the records in the `item_progress` table, grouping by `stage_name` (e.g. `PURCHASING`, `CNC`, etc.) to count occurrences of `STUCK` and `rework_progress` logs.
4. **Delay Reason Breakdown**:
   Extracts high-level frequency metrics from the `alerts` table based on common text patterns in the alert message string.

---

## 5. Security & Tenant Isolation

* **Strict Tenancy Isolation**: Handled via row-level security (`TenantScope` on all models). The controller executes calculations inside the scoped tenant context, preventing data leaks.
* **Role-Based Authorization**:
  * **OWNER**: Production matrix view + settings control (Add Admin, Change Password). Cannot create POs (403).
  * **ADMIN / SALES / MANAGER**: Production matrix view + PO creation/broadcasting. Cannot manage users.

---

## 6. Testing Requirements

* **Feature Isolation Tests**: Test that the Performance Matrix calculations accurately scope to the active tenant.
* **Aggregations Verification**: Test that:
  * Overdue POs are correctly classified when current date exceeds the deadline.
  * OTDR calculates correctly across varying PO deadline scenarios.
  * QC Rework correctly triggers Yellow warnings and spawns appropriate progress stages.
  * Purchasing delays reflect as stage bottlenecks.
* **Authorization Lockouts**: Verify that floor roles (Workers, QC) attempting to query matrix APIs are blocked (403).
