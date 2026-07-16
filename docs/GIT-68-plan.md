# GIT-68: GIT Tasks Job — Backlog Completion Plan

**Status:** Draft  
**Author:** CEO agent (gitarkopong)  
**Goal:** Complete all 13 referenced GIT tasks by delegating to specialized staff agents per the hiring plan.

---

## 1. Task Inventory

### POGrid Tasks (repo: `/home/tito/pogrid`)

| Issue | Title | Type | Priority |
|-------|-------|------|----------|
| GIT-60 | Deduplicate MILLING post (keep Milling, drop MILLING) | Backend (seed/migration) | Low |

### Paperclip Tasks (repo: `/home/tito/paperclip`)

| Issue | Title | Type | Priority |
|-------|-------|------|----------|
| GIT-16 | Merge duplicated permission logic in Worker ItemCard | Frontend (React) | High |
| GIT-17 | Create custom Inertia error pages for 403/404/419/500 | Frontend (React/Inertia) | High |
| GIT-18 | Add bulk selection/actions to Owner Dashboard items | Frontend (React) | High |
| GIT-19 | Success confirmation after forgot password submission | Frontend (React) | High |
| GIT-20 | Dashboard TDZ bug — useDashboardActivityAnimation TDZ | Frontend (React) | **Critical** |
| GIT-21 | Dashboard error state lacks retry action | Frontend (React) | **Critical** |
| GIT-23 | No unsaved-changes guard on any form page | Frontend (React) | High |
| GIT-24 | Auth page disabled button uses aria-disabled not disabled | Frontend (React/HTML) | High |
| GIT-26 | NewAgent useEffect for CEO defaults causes input flash | Frontend (React) | High |
| GIT-27 | Agents page filter-empty state uses plain `<p>` not EmptyState | Frontend (React) | High |
| GIT-28 | Activity page missing sub-query loading states | Frontend (React) | High |
| GIT-29 | Dashboard sub-queries lack loading placeholders | Frontend (React) | High |

---

## 2. Staffing Assignment

Per the hiring plan (`docs/hiring-plan.md`), specialized agents clear backlog in parallel:

### Backend Engineer → GIT-60
- Deduplicate MILLING post in POGrid seeders/migrations
- Files: `database/seeders/`, `app/Models/Post.php`
- Verify: `php artisan test --testsuite=Feature`

### Frontend Engineer → GIT-16 through GIT-29 (Paperclip)
These are all React/TypeScript/Inertia UI fixes in the Paperclip platform:
- GIT-20, GIT-21 (critical) — first priority
- GIT-16, GIT-17, GIT-18, GIT-19, GIT-23 (high) — second priority
- GIT-24, GIT-26, GIT-27, GIT-28, GIT-29 (high/low) — third priority
- Verify: check Paperclip build/lint

### QA Engineer → Tests for all fixes
- Verify each fix has a test or manual verification step
- Run full test suite before marking tasks done

---

## 3. Work Order

### Phase 1: Critical Bugs (1 session)
1. GIT-20 — Fix TDZ in `useDashboardActivityAnimation`
2. GIT-21 — Add retry button to dashboard error state

### Phase 2: High-priority UI (2-3 sessions)
3. GIT-16 — Merge permission logic in Worker ItemCard
4. GIT-17 — Custom error pages (403/404/419/500)
5. GIT-18 — Bulk selection/actions on Owner Dashboard
6. GIT-19 — Forgot password success confirmation
7. GIT-23 — Unsaved-changes guard on forms

### Phase 3: Polish (2 sessions)
8. GIT-24 — Disabled button: `aria-disabled` → `disabled`
9. GIT-26 — NewAgent input flash fix
10. GIT-27 — EmptyState component for Agents filter
11. GIT-28 — Loading states for Activity sub-queries
12. GIT-29 — Loading placeholders for Dashboard sub-queries

### Phase 4: POGrid (1 session)
13. GIT-60 — Deduplicate MILLING post

---

## 4. Delegation Strategy

Create child issues for each work phase, assign to the appropriate agent type:
- Phase 1-3 → Frontend Engineer (Paperclip repo)
- Phase 4 → Backend Engineer (POGrid repo)

Each child issue gets:
- Clear file paths and expected changes
- Verification command
- Single-agent scope (no cross-repo mixing)

---

## 5. Verification

| Check | Command |
|-------|---------|
| POGrid tests | `php artisan test --testsuite=Feature` |
| Paperclip build | TBD (check Paperclip `package.json`) |
| Formatting | `vendor/bin/pint` (POGrid), TBD (Paperclip) |

---

## 6. Risks

| Risk | Mitigation |
|------|-----------|
| Paperclip repo access | Use `/home/tito/paperclip` workspace; verify SSH permissions |
| Cross-repo context switching | Dedicated child issues per repo, never mixed |
| UI changes may need design review | Flag to CEO before merging any visual change |
