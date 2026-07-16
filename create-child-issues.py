import json
import urllib.request
import sys

API = "http://127.0.0.1:3100"
COMPANY = "dbdf57ac-cc93-4dd8-bf85-e9d5dd464d7c"
PARENT = "71170558-0e68-47d6-9bfc-2e825fd428a4"

def create(title, description, priority, mode):
    data = {
        "projectId": "3a4821a4-3c7c-4cba-ba6f-4afbc0199b12",
        "projectWorkspaceId": "9ca23886-b3ad-43e3-92d1-8afd03f95059",
        "parentId": PARENT,
        "title": title,
        "description": description,
        "priority": priority,
        "workMode": mode,
    }
    req = urllib.request.Request(
        f"{API}/api/companies/{COMPANY}/issues",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    resp = json.loads(urllib.request.urlopen(req).read())
    print(f"  {resp.get('identifier','??')}: {resp.get('title','')[:60]}")
    return resp["id"]

# Phase 1 - Critical
print("=== Phase 1: Critical Paperclip bugs ===")
create(
    "Phase 1: Fix critical Paperclip bugs (GIT-20, GIT-21)",
    "Fix 2 critical Paperclip platform bugs:\n\n"
    "1. GIT-20 — Dashboard TDZ bug: useDashboardActivityAnimation references recentActivity before declaration. Fix hoisting/ordering.\n"
    "2. GIT-21 — Dashboard error state lacks retry action. Add retry button to error boundary.\n\n"
    "Repo: /home/tito/paperclip\nPriority: Critical\nWork mode: implementation",
    "critical", "implementation"
)

# Phase 2 - High UI
print("=== Phase 2: High-priority UI fixes ===")
create(
    "Phase 2: High-priority Paperclip UI fixes (GIT-16, GIT-17, GIT-18, GIT-19, GIT-23)",
    "5 high-priority Paperclip UI fixes:\n\n"
    "1. GIT-16 — Merge duplicated permission logic in Worker ItemCard\n"
    "2. GIT-17 — Custom Inertia error pages for 403/404/419/500\n"
    "3. GIT-18 — Bulk selection/actions on Owner Dashboard items\n"
    "4. GIT-19 — Forgot password success confirmation\n"
    "5. GIT-23 — Unsaved-changes guard on all form pages\n\n"
    "Repo: /home/tito/paperclip\nPriority: High\nWork mode: implementation",
    "high", "implementation"
)

# Phase 3 - Polish
print("=== Phase 3: Polish ===")
create(
    "Phase 3: Paperclip UI polish (GIT-24, GIT-26, GIT-27, GIT-28, GIT-29)",
    "5 Paperclip UI polish tasks:\n\n"
    "1. GIT-24 — Auth disabled button uses aria-disabled instead of disabled\n"
    "2. GIT-26 — NewAgent useEffect for CEO defaults causes input flash\n"
    "3. GIT-27 — Agents page filter-empty state uses plain <p> not EmptyState\n"
    "4. GIT-28 — Activity page missing sub-query loading states for agents/members\n"
    "5. GIT-29 — Dashboard sub-queries for issues/projects have no loading placeholders\n\n"
    "Repo: /home/tito/paperclip\nPriority: High\nWork mode: implementation",
    "high", "implementation"
)

# Phase 4 - POGrid
print("=== Phase 4: POGrid ===")
create(
    "Phase 4: POGrid — Deduplicate MILLING post (GIT-60)",
    "Single POGrid task:\n\n"
    "GIT-60 — Deduplicate MILLING post (keep Milling, drop MILLING) in seeders.\n\n"
    "Repo: /home/tito/pogrid\nPriority: Low\nWork mode: implementation\n"
    "Verify: php artisan test --testsuite=Feature, vendor/bin/pint",
    "low", "implementation"
)

print("\nDone. 4 child issues created under GIT-68.")
