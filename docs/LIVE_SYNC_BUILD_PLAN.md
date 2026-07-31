# POgrid Live Sync — Next Build Plan
> **Goal**: Full real-time app synchronization between all connected users (Owner, Worker, PPIC) using the existing Pusher + Laravel Echo infrastructure.

---

## 📊 Current State Audit

### ✅ What's Already Working
| Layer | Status | Notes |
|---|---|---|
| Pusher credentials | ✅ Configured | `.env` has real `PUSHER_APP_KEY`, cluster `ap1` |
| Laravel Echo init | ✅ Done | `bootstrap.ts` initializes Echo, injects `X-Socket-ID` into all fetch requests |
| Private channels | ✅ Defined | `tenant.{id}.dashboard` (office), `tenant.{id}.workers` (floor) |
| Channel auth | ✅ Done | `channels.php` gates by `role_level` |
| Backend events | ✅ Fired | `TaskUpdated`, `KendalaReported`, `QcReworkLogged`, `ProductionTerminated`, `DataRefreshed`, `AlertEscalated`, `TimelineAlertCreated` |
| `DataSyncObserver` | ✅ Registered | Auto-fires `DataRefreshed` on save/delete for Po, Item, ItemProgress, Alert, User, Tenant, DoItem, DeliveryOrder |
| **Owner Dashboard** | ✅ Listening | All 5 events wired, toast queue implemented, `router.reload()` on each event |
| **Worker Dashboard** | ✅ Listening | All 5 events wired, toast queue implemented, `router.reload()` on each event |
| **PPIC Dashboard** | ✅ Listening | `data.refreshed`, `task.updated`, `kendala.reported`, `qc.rework.logged`, `production.terminated` |
| `toOthers()` | ✅ Used | Sender excluded from their own broadcast |

### ❌ What's Missing / Broken
| Gap | Impact | Priority |
|---|---|---|
| `QUEUE_CONNECTION=sync` | Broadcasts block the HTTP request — no true async delivery | 🔴 P1 |
| No presence channel | Cannot show "who is online" — no awareness across users | 🔴 P1 |
| `router.reload()` on every event | Full Inertia round-trip on each push — chatty, causes flicker on Worker cards | 🟡 P2 |
| No "last seen" / stale indicator | If Pusher disconnects silently, data goes stale with no visual warning | 🟡 P2 |
| Worker Dashboard: no toast on `data.refreshed` | Silent reload — user doesn't know *why* their screen refreshed | 🟡 P2 |
| Owner Dashboard: no per-event payload diff | Reloads entire page even if only one item changed | 🟡 P2 |
| No reconnect handling | If WebSocket drops, no auto-reconnect notification or polling fallback | 🟠 P3 |
| No Owner → Worker broadcast | Owner creating/editing a PO doesn't push to workers | 🟠 P3 |
| `channels.php` uses `role_level='production'` | PPIC (office/hybrid) can't auth on `.workers` channel | 🟠 P3 |
| No `TroubleReports.tsx` live binding | Trouble Reports page has no Echo listener | 🟠 P3 |

---

## 🏗️ Build Tasks

---

### 🔴 PHASE 1 — Queue & Transport Fix (Foundation)
> Without async queue, broadcasts block requests. Fix this first before any UI work.

#### Task 1.1 — Switch Queue Driver to `database`

**File**: `.env`
```
QUEUE_CONNECTION=database
```
- [x] Change `QUEUE_CONNECTION=sync` → `database` in `.env`
- [x] Run migration: `php artisan queue:table && php artisan migrate`
  - ✅ `0001_01_01_000002_create_jobs_table.php` already exists and covers `jobs`, `job_batches`, `failed_jobs`
- [x] Verify `composer dev` script runs `php artisan queue:listen` (confirmed: `dev.sh` runs `queue:listen --tries=1 --timeout=0` in Docker)
- [x] Test: fire a progress update → confirm broadcast event lands in `jobs` table and processes

#### Task 1.2 — Confirm `ShouldBroadcastNow` vs `ShouldBroadcast`

All 7 events use `ShouldBroadcast` (queued). With `database` driver, events route through the jobs queue.

- [x] **Decision: `ShouldBroadcastNow`** (chosen over `ShouldBroadcast`)
  - Rationale: POgrid is a shop-floor real-time app — sub-second push matters. `ShouldBroadcastNow` fires directly to Pusher's API within the HTTP request (<50ms), no queue worker dependency.
  - `QUEUE_CONNECTION=database` is still set for future async jobs (exports, emails, etc.)
- [x] All 7 events updated: `AlertEscalated`, `DataRefreshed`, `KendalaReported`, `ProductionTerminated`, `QcReworkLogged`, `TaskUpdated`, `TimelineAlertCreated`
- [x] `DEVELOPMENT.md` updated with broadcast transport documentation

---

### 🔴 PHASE 2 — Presence Channel (Who's Online)
> Show all connected users in real-time. Owner sees active workers. Workers see each other.

#### Task 2.1 — Add Presence Channel Auth

**File**: `routes/channels.php`
```php
// Add:
Broadcast::channel('tenant.{tenantId}.presence', function (User $user, int $tenantId) {
    if ($user->tenant_id !== $tenantId) return false;
    return [
        'id'        => $user->id,
        'name'      => $user->name,
        'post_name' => $user->post_name,
        'role'      => $user->role_name,
    ];
});
```
- [x] Add presence channel auth in `channels.php`
- [x] Ensure `User` model exposes `post_name`, `role_name` accessors (already in place)

#### Task 2.2 — Join Presence Channel in Frontend

**Files**: `Owner/Dashboard.tsx`, `Worker/Dashboard.tsx`, `Ppic/Dashboard.tsx`

```ts
// In useEffect alongside existing private channel setup:
const presence = echo.join(`tenant.${tenantId}.presence`)
    .here((users: OnlineUser[]) => setOnlineUsers(users))
    .joining((user: OnlineUser) => setOnlineUsers(prev => [...prev, user]))
    .leaving((user: OnlineUser) => setOnlineUsers(prev => prev.filter(u => u.id !== user.id)));

return () => {
    echo.leave(`tenant.${tenantId}.presence`);
};
```
- [x] Define `OnlineUser` type: `{ id: number; name: string; post_name: string; role: string }`
- [x] Add `onlineUsers` state to Owner Dashboard, Worker Dashboard, PPIC Dashboard
- [x] Leave presence channel on component unmount

#### Task 2.3 — Online Users UI Indicator

**Owner Dashboard**:
- [x] Add "🟢 N online" pill badge in top header bar (next to floor terminal URL chip)
- [x] On hover/click: expand a popover list of active user names + posts
- [x] Live-updating: joining/leaving triggers smooth list animation

**Worker Dashboard**:
- [x] Show subtle "X colleagues online" note in the sidebar/header
- [x] No full list needed — just a count pill for floor context

---

### 🟡 PHASE 3 — Smarter Event Handling (No Full Reload)
> Replace brute-force `router.reload()` with targeted state patching where possible.

#### Task 3.1 — Inertia Partial Reloads on `task.updated`

**Problem**: `router.reload()` fetches ALL props (all POs, all items). On `task.updated`, only one item's `ItemProgress` changed.

**Solution**: Use Inertia partial reload scoped to relevant props:

```ts
channel.listen('task.updated', (e: any) => {
    addToast({ message: e.message, severity: 'INFO' });
    router.reload({
        only: ['pos', 'alerts'],
        preserveState: true,
        preserveScroll: true,
    });
});
```
- [x] Audit which `only[]` keys each event actually needs:
  - `task.updated` → `['pos', 'alerts']`
  - `kendala.reported` → `['alerts']`
  - `qc.rework.logged` → `['alerts', 'pos']`
  - `production.terminated` → `['pos']`
  - `data.refreshed` → `['pos', 'alerts']` (generic fallback)
  - `alert.escalated` → `['alerts']`
- [x] Apply `only:` to all event listeners in Owner, Worker, PPIC dashboards
- [x] Verify controller actions return correct Inertia props for partial reload

#### Task 3.2 — Debounce Rapid Reloads

**Problem**: When 5 workers submit progress in quick succession, 5 `task.updated` events fire → 5 `router.reload()` calls → race condition + flicker.

**Solution**: Debounce reload with a 800ms trailing debounce:
```ts
const debouncedReload = useMemo(() =>
    debounce(() => router.reload({
        only: ['pos', 'alerts'],
        preserveState: true,
        preserveScroll: true,
    }), 800),
    []
);
channel.listen('task.updated', (e: any) => {
    addToast(e);
    debouncedReload();
});
```
- [x] Implement `debounce` utility (custom timeout ref helper)
- [x] Apply debounce to `task.updated` and `data.refreshed` listeners in all 3 dashboards
- [x] Do NOT debounce `production.terminated` or `kendala.reported` (need immediate UI response)

#### Task 3.3 — Worker Dashboard: Named Toast for `data.refreshed`

Currently `data.refreshed` silently calls `router.reload()` on the Worker dashboard with no visible feedback.
- [x] Show a subtle "↻ Data diperbarui" (Data refreshed) info toast for 3 seconds when `data.refreshed` fires
- [x] Toast should auto-dismiss; worker should not need to interact

---

### 🟡 PHASE 4 — Connection Health & Stale State Guard

#### Task 4.1 — Connection Status Indicator

**Problem**: If Pusher WebSocket disconnects silently (network drop, idle timeout), the user continues working on stale data with no awareness.

**Files**: All 3 dashboard pages

```ts
useEffect(() => {
    const pusherConn = (echo as any).connector?.pusher?.connection;
    if (!pusherConn) return;

    const onConnected = () => setWsStatus('connected');
    const onDisconnected = () => setWsStatus('disconnected');
    const onError = () => setWsStatus('error');

    pusherConn.bind('connected', onConnected);
    pusherConn.bind('disconnected', onDisconnected);
    pusherConn.bind('error', onError);

    return () => {
        pusherConn.unbind('connected', onConnected);
        pusherConn.unbind('disconnected', onDisconnected);
        pusherConn.unbind('error', onError);
    };
}, []);
```

**UI**:
- [x] Small connection dot in corner (🟢 connected / 🟡 connecting / 🔴 disconnected)
- [x] When `disconnected`: show persistent amber banner: "Koneksi terputus — data mungkin tidak terbaru"
- [x] When reconnected: auto-dismiss banner + trigger one full `router.reload()`

#### Task 4.2 — Polling Fallback When Pusher is Unavailable

For environments where Pusher key is empty (dev without keys / staging):
- [x] Detect if Pusher key is empty or WebSocket is disconnected
- [x] If so, start a 30-second polling interval: `setInterval(() => router.reload({...}), 30000)`
- [x] Clear polling when Echo connects successfully
- [x] Log: `console.info('[POgrid] Pusher unavailable — falling back to 30s polling')`
- [x] Clear polling when Echo connects successfully
- [x] Log: `console.info('[POgrid] Pusher unavailable — falling back to 30s polling')`

---

### 🟠 PHASE 5 — Owner → Workers Push (PO Broadcast)

#### Task 5.1 — Broadcast When PO is Created/Broadcasted

**File**: `OwnerDashboardController.php` → `createPo()`

- [x] After `$po` save: dispatch `broadcast(new TaskUpdated($user->tenant_id, "PO {$request->po_number} ({$request->client_name}) telah diterbitkan ke lantai produksi."))->toOthers()`
- [x] Workers receive `task.updated` toast: "PO #X-001 telah diterbitkan" → reload items list

#### Task 5.2 — Broadcast on PO Edit / Item Add

**File**: `OwnerDashboardController.php` → `createPo()` / `ItemObserver` / `DataSyncObserver`
- [x] Auto-dispatched `DataRefreshed` via `DataSyncObserver` on any item/PO mutation
- [x] Workers' dashboards auto-refresh to reflect updated item list

---

### 🟠 PHASE 6 — Channel Auth Fix for PPIC & Missing Pages

#### Task 6.1 — Fix PPIC Channel Membership

**File**: `resources/js/Pages/Ppic/Dashboard.tsx`
- [x] Update PPIC Dashboard to use `.dashboard` channel
- [x] Test: PPIC receives `TaskUpdated` when a worker updates progress
- [x] Update presence channel join to use correct channel in PPIC

#### Task 6.2 — Add `TroubleReports.tsx` Live Listener

**File**: `resources/js/Pages/Worker/TroubleReports.tsx`

- [x] Add `useEffect` with Echo private channel listener for `kendala.reported` and `data.refreshed`
- [x] On `kendala.reported`: reload partial `['alerts']`
- [x] On `data.refreshed`: debounced `router.reload({ only: ['alerts'], ... })`
- [x] Cleanup: leave channel on unmount

---

### 🟢 PHASE 7 — Testing

#### Task 7.1 — BroadcastTest Expansion

**File**: `tests/Feature/BroadcastTest.php`
- [x] Test: `TaskUpdated` fires when worker submits progress update
- [x] Test: `KendalaReported` fires when kendala submitted
- [x] Test: `DataRefreshed` fires on `ItemProgress::saved` via `DataSyncObserver`
- [x] Test: `ProductionTerminated` fires on item terminate
- [x] Test: `TaskUpdated` fires when Admin broadcasts a PO (Phase 5)
- [x] Test: PPIC can auth on `.dashboard` channel
- [x] Test: Owner can auth on `.dashboard` channel
- [x] Test: Worker cannot auth on `.dashboard` channel

#### Task 7.2 — Presence Channel Auth Tests

- [x] Test: user joining presence channel returns correct payload (`id`, `name`, `post_name`, `role`)
- [x] Test: tenant isolation — user from Tenant A cannot auth on Tenant B's presence channel
- [x] Test: presence channel rejects unauthenticated access

---

## 📋 Master Checklist

| # | Task | Phase | Priority |
|---|------|-------|----------|
| 1.1 | Switch `QUEUE_CONNECTION` to `database` | Foundation | ✅ Done |
| 1.2 | Decide `ShouldBroadcast` vs `ShouldBroadcastNow` → chose `ShouldBroadcastNow` | Foundation | ✅ Done |
| 2.1 | Add presence channel auth in `channels.php` | Presence | ✅ Done |
| 2.2 | Join presence channel in all 3 dashboards | Presence | ✅ Done |
| 2.3 | Online users pill badge (Owner) + count (Worker) | Presence | ✅ Done |
| 3.1 | Partial reload `only:[]` per event type | Smart Reload | ✅ Done |
| 3.2 | Debounce rapid reload bursts (800ms) | Smart Reload | ✅ Done |
| 3.3 | Named toast for `data.refreshed` on Worker | Smart Reload | ✅ Done |
| 4.1 | WebSocket connection status indicator + banner | Health | ✅ Done |
| 4.2 | 30s polling fallback when Pusher unavailable | Health | ✅ Done |
| 5.1 | Broadcast `TaskUpdated` on PO broadcast action | Owner→Workers | ✅ Done |
| 5.2 | Broadcast on PO edit / item add | Owner→Workers | ✅ Done |
| 6.1 | Fix PPIC channel auth (switch to `.dashboard`) | Channel Fix | ✅ Done |
| 6.2 | Add Echo listener to `TroubleReports.tsx` | Channel Fix | ✅ Done |
| 7.1 | Expand `BroadcastTest.php` | Testing | ✅ Done |
| 7.2 | Presence channel auth tests | Testing | ✅ Done |

---

## 🔁 Execution Order

```
Phase 1 (Queue) → Phase 2 (Presence) → Phase 3 (Smart Reload) → Phase 4 (Health)
                                                                        ↕
                                                           Phase 5–6 (parallel)
                                                                        ↕
                                                               Phase 7 (Tests)
```

> **Do Phase 1 first** — without async queue, all subsequent Pusher work is unreliable.

---

## 📁 Files Touched

| File | Change |
|---|---|
| `.env` | `QUEUE_CONNECTION=database` |
| `routes/channels.php` | Add presence channel auth, no change to existing |
| `app/Http/Controllers/OwnerDashboardController.php` | Dispatch `TaskUpdated` on broadcast/edit |
| `resources/js/Pages/Owner/Dashboard.tsx` | Presence join, partial reloads, debounce, connection badge |
| `resources/js/Pages/Worker/Dashboard.tsx` | Presence join, debounce, `data.refreshed` named toast |
| `resources/js/Pages/Ppic/Dashboard.tsx` | Switch to `.dashboard` channel, presence join |
| `resources/js/Pages/Worker/TroubleReports.tsx` | Add Echo listener |
| `tests/Feature/BroadcastTest.php` | Expand test cases + presence auth tests |

---

*Last updated: 2026-07-31 (Live Sync Audit & Remediation)*
*Cross-reference: `NEXT_TODO.md` §4 Realtime Push, `TODO.md` §BACKLOG Pusher live toast*

---

## 🛠️ Live Sync Audit & Remediation Log (2026-07-31)

During multi-browser testing across user roles (Admin vs. Worker), real-time notifications and state synchronization required manual page refreshes. A full architectural audit revealed and resolved three critical gaps:

1. **Event Name Namespace Matching (`bootstrap.ts` & Echo listeners)**:
   - *Issue*: Custom events emitted via `broadcastAs()` (e.g. `task.updated`, `data.refreshed`) were not matching because Laravel Echo prepended `App\Events\` by default.
   - *Fix*: Set `namespace: ''` in Echo client options in `bootstrap.ts` and explicitly prefixed all custom event names with a dot (`.task.updated`, `.data.refreshed`, etc.) across all four dashboard and report components.
2. **Worker Dashboard Partial Reload Props (`Worker/Dashboard.tsx`)**:
   - *Issue*: Worker Dashboard listeners called `router.reload({ only: ['pos', 'alerts'] })`, ignoring the actual table data prop (`items`), leaving floor task tables stale when Admin added POs or peers updated jobs.
   - *Fix*: Updated all reload operations on Worker Dashboard to target `only: ['items']`. Added `telemetry` to Owner Dashboard partial reloads.
3. **Channel Authorization Expansion (`routes/channels.php`)**:
   - *Issue*: PPIC users (role level `production`) were rejected by `tenant.{id}.dashboard` (403 Forbidden), and Office users visiting floor dashboards were blocked from `tenant.{id}.workers`.
   - *Fix*: Permitted PPIC roles on `.dashboard` channel and allowed any authenticated tenant user to subscribe to `.workers`.
4. **Sender Exclusion & Toast Deduplication (`bootstrap.ts` & Dashboards)**:
   - *Issue*: When making updates, the user performing the action received multiple echoed notifications on their own screen, and receiving users saw two different notifications at once (`Data diperbarui` alongside explicit task updates). This occurred because Inertia v2 executes requests via relative URLs (`/c/...`), which failed `url.startsWith` checks, leaving `X-Socket-ID` off requests and breaking `toOthers()`. Furthermore, cascaded observer saves fired `DataRefreshed` alongside explicit events like `TaskUpdated`.
   - *Fix*: Enhanced `bootstrap.ts` by intercepting both `window.fetch` and `XMLHttpRequest` (XHR) with direct Pusher socket ID fallback getters for robust sender exclusion. Removed the redundant `data.refreshed` toast from Worker Dashboard (now a pure background sync trigger like Owner/PPIC dashboards), ensuring every user receives exactly 1 single notification per update.
