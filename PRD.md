# PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Project Name:** POgrid.id  
**Version:** 3.2 (Core Soul Edition)  
**Document Type:** Master Specification for AI Agent Integration  
**Core Paradigm:** Item-Centric, Zero-Block, Asynchronous Progress Tracking  

---

## 1. PRODUCT PHILOSOPHY & SCOPE LIMITATION (THE "SOUL" OF POGRID)
POgrid.id is **NOT** an ERP, MES, or inventory management system. It contains **NO Bill of Materials (BOM), NO raw material stock tracking, and NO warehouse management features.** The sole, absolute purpose of POgrid.id is to **eliminate the Owner's anxiety and instantly answer the client's ultimate question:** *"Where is my order right now, and will it be delivered on time?"*

It functions strictly as a **Live Progress & Delivery Punctuality Tracker** for SME manufacturing workshops (CNC, Fabrication, Machining) in Indonesia. It translates chaotic floor realities into clean, undeniable, real-time data.

---

## 2. FINAL TECH STACK ARCHITECTURE
To maintain near-zero operational costs on shared hosting while delivering high-end, real-time React interactivity, the system is locked to this exact stack:

| Layer | Technology Choice | Infrastructure Constraint Handling |
| :--- | :--- | :--- |
| **Backend Framework** | Laravel 11 (PHP 8.3) | Standard request/response cycle. |
| **Frontend Framework** | React 18 + TypeScript | Strict Type-Safety for AI agent generation. |
| **SSR Bridge** | Inertia.js v2 | Zero-API boilerplate SPA architecture. |
| **Styling Engine** | Tailwind CSS v4 | High-performance, token-driven modern styling. |
| **Database Engine** | PostgreSQL (Neon.tech) | Offloads heavy DB compute from shared hosting. |
| **Real-time Engine** | Pusher + Laravel Echo | Free-tier WebSockets via 3rd party (No local daemons). |
| **Queue Driver** | Database Driver (Cron-optimized) | Run via Cron: `queue:work --stop-when-empty` every 1 min. |
| **PDF Engine** | `laravel-dompdf` | Pure PHP-based server-side PDF compilation. |
| **PWA Layer** | Vite PWA Plugin | Caches frontend for fast operator phone loading. |
| **Super Admin Portal** | Filament v3 (Blade/Livewire) | Completely isolated under `/superadmin` (Detached from React). |
| **Hosting Deployment** | Shared Hosting (Hostinger) | Absolutely NO persistent background processes/daemons. |

---

## 3. DOMAIN LEVEL TENANCY & ROUTING
* **Single Database Multi-Tenancy:** Handled via row-level security using a global `TenantScope` filtering by `tenant_id` on all operational models.
* **Zero Subdomains:** Strictly NO wildcard subdomains to bypass shared hosting SSL/DNS limits. All traffic routes through `app.pogrid.id`.
* **Guard A (Standard Web Auth):** Owners, Drafters, Purchasing, and Finance login via Email + Password at `app.pogrid.id/login`.
* **Guard B (Path-Based Worker Auth):** Floor workers access `app.pogrid.id/c/{slug}` (e.g., `/c/teknik-mandiri`). They select their name from a clean dropdown/grid and enter a hashed 4-6 digit PIN using a large, touch-optimized on-screen numpad. 

---

## 4. CORE LOGIC: ITEM-CENTRIC & ZERO-BLOCK
Progress is monitored at the **Item Level**, never at the macro PO level.

### 4.1 Asynchronous Stage Pool (No Sequential Blocking)
When an item is created (e.g., *Shaft S45C*, Target: 20 pcs) and the Admin checks `[x] CNC` and `[x] FABRIKASI`, the database immediately spawns parallel entries in the `item_progress` table. 
* There is NO rigid sequence enforcement. 
* If the Welder (Fabrication) physically gets material and starts working before the CNC operator logs data, the system allows it. It reflects floor reality as-is without crashing or blocking.

### 4.2 Quantity Input Logic
* **IF Target_Qty > 1:** Worker uses large `[ - ]` and `[ + ]` stepper buttons to log integers (e.g., finished 5 out of 20).
* **IF Target_Qty == 1:** Worker uses large percentage blocks (`0%`, `25%`, `50%`, `75%`, `100%`).

### 4.3 Operation-Based Weighted Progress Calculation
To protect server resources, item percentages are calculated via Eloquent Observers *only* when a worker saves progress, then saved as a flat value.
* **Formula (Qty > 1):** $$	ext{Item Progress (\%)} = rac{\sum 	ext{Completed Qty Across All Stages}}{	ext{Target Qty} 	imes 	ext{Total Checked Stages}} 	imes 100\%$$
* **Formula (Qty == 1):** $$	ext{Item Progress (\%)} = rac{\sum 	ext{Progress Percent Across All Stages}}{	ext{Total Checked Stages}}$$

---

## 5. REAL-TIME ALERT & PUNCTUALITY TRACKING
The system continuously evaluates time left until delivery to give the Owner an early warning system.
* $$	ext{Days Remaining} = 	ext{Global Deadline} - 	ext{Current Date}$$

### The Alert Matrix
* **🟢 GREEN (On Track):** No active stuck logs, timeline is healthy.
* **🟡 YELLOW (Approaching Risk):** `Days Remaining <= 3` AND `Item Progress < 70%`. Warns the owner to allocate overtime.
* **🟡 YELLOW (QC Rework):** QC logs `Reject_Qty > 0`. Instantly spawns a sub-stage marked 'REWORK'.
* **🔴 RED (Stuck/Kendala):** Floor operator clicks `[ ⚠️ LAPOR KENDALA ]` and selects an option (e.g., *Machine Broken*). Instantly broadcasts a flashy Red Toast Notification to the Owner Dashboard via Pusher. 
* **🔴 RED (Overdue):** `Current Date > Global Deadline` while progress is `< 100%`.

---

## 6. SUNK-COST CANCEL PROTECTION (BUSINESS GUARD)
* **IF Item Progress == 0%:** Owner can safely click `[ Cancel ]`. Item status transitions to `CANCELLED`.
* **IF Item Progress > 0%:** The raw material has physically been cut. The `Cancel` button is **DISABLED TOTAL** (Returns HTTP 403 at controller level).
* **Midway Termination:** The Owner must click `[ 🛑 TERMINATE_MIDWAY ]`. 
    * This instantly freezes the worker's mobile screen via Pusher (*"Production Halated by Owner"*).
    * It automatically dispatches a mandatory billing task to the Finance module: *"Generate Sunk-Cost Recovery Invoice for [X] completed pieces and wasted material."*

---

## 7. DATA MODEL BLUEPRINT
Every operational table MUST include a indexed `tenant_id` column.
* `tenants`: id, company_name, slug, subscription_status, trial_ends_at.
* `users`: id, tenant_id, name, email, password, pin (hashed), role (OWNER, WORKER, QC, etc).
* `pos`: id, tenant_id, po_number, client_name, global_deadline, status.
* `items`: id, tenant_id, po_id, item_name, target_qty, item_type (MANUFACTURE, BUY_OUT, SERVICE), required_stages (jsonb), progress_percent, status.
* `item_progress`: id, tenant_id, item_id, stage_name, completed_qty, progress_percent, status (PENDING, IN_PROGRESS, COMPLETED, STUCK).
* `alerts`: id, tenant_id, item_id, severity (RED, YELLOW, BLUE), message, is_resolved.
* `delivery_orders`: id, tenant_id, po_id, do_number, delivery_date.
* `do_items`: do_id, item_id, delivered_qty. (Sum of `delivered_qty` == `target_qty` triggers PO completion).
* `invoices`: id, tenant_id, delivery_order_id, invoice_number, total_amount, status, due_date. (Invoice generation is completely blocked unless at least one DO exists).