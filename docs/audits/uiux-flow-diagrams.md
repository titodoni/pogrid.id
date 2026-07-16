# POGrid UI/UX Flow Diagrams

Mermaid flowcharts of the audited UI flows. Paste these into any Mermaid-compatible renderer (GitHub markdown, mermaid.live, etc.).

---

## 1. Guard A — Office Auth Flow

```mermaid
flowchart TD
    A["/ (root)"] -->|redirect| B["/login (GET)"]
    B --> C["/login (POST)"]
    C -->|valid| D["/dashboard (Owner Dashboard)"]
    C -->|invalid| B

    B -.->|forgot password| E["/forgot-password (GET)"]
    E --> F["/forgot-password (POST)"]
    F -->|email sent| G["/reset-password/{token} (GET)"]
    G --> H["/reset-password (POST)"]
    H -->|success| B

    B -.->|register| I["/register (GET)"]
    I --> J["/register (POST)"]
    J -->|tenant created| B

    style A fill:#1e293b,stroke:#64748b,color:#fff
    style D fill:#2563eb,stroke:#3b82f6,color:#fff
```

## 2. Guard A — Owner Dashboard Flow

```mermaid
flowchart TD
    D["/dashboard"] --> TABS{"Tab Navigation"}
    TABS -->|Alerts| ALERTS["Alerts Panel<br/>PIN reset requests<br/>System notifications"]
    TABS -->|Active POs| ACTIVE["Active POs<br/>Item progress cards<br/>Stage status badges"]
    TABS -->|Completed| COMPLETED["Completed POs<br/>Delivery tracking<br/>Invoice status"]
    TABS -->|Client Board| CLIENTS["Client Performance Board<br/>Delivery punctuality<br/>Bottleneck analysis"]
    TABS -->|Team| TEAM["Team Management<br/>Create/edit users<br/>Role assignment"]
    TABS -->|Settings| SETTINGS["Settings<br/>Company info<br/>Workflow config<br/>Change password"]

    D -->|"Create PO"| CPO["/pos/create"]
    CPO -->|submit| D

    SETTINGS -->|archive company| CONFIRM{"window.confirm()<br/>(C3 - needs AlertDialog)"}
    SETTINGS -->|create user| USER["POST /users"]
    SETTINGS -->|update company| COMPANY["POST /company/update"]

    TEAM -->|edit user| EU["POST /users/{id}/update"]
    TEAM -->|delete user| DU["POST /users/{id}/delete"]

    D -->|logout| LOGOUT["POST /logout → /login"]

    style D fill:#2563eb,stroke:#3b82f6,color:#fff
    style CPO fill:#0d9488,stroke:#14b8a6,color:#fff
    style CONFIRM fill:#dc2626,stroke:#ef4444,color:#fff
```

## 3. Guard B — Floor (Worker) Auth Flow

```mermaid
flowchart TD
    W["/c/{slug} (GET)"] --> IS_AUTH{"Authenticated?"}
    IS_AUTH -->|no| PIN["PIN Login Form<br/>/c/{slug} (same route)"]
    PIN -->|POST /c/{slug}/login| VALID{"PIN correct?"}
    VALID -->|yes| DASH["Worker Dashboard<br/>/c/{slug}"]
    VALID -->|no, throttled 5/min| PIN

    IS_AUTH -->|yes| DASH

    PIN -.->|forgot PIN| FR["POST /c/{slug}/pin-reset/request"]
    FR -->|BLUE Alert created| ADMIN["Admin approves<br/>POST /pin-reset/{alertId}/approve"]
    ADMIN -->|new PIN shown once| PIN

    style W fill:#1e293b,stroke:#64748b,color:#fff
    style DASH fill:#2563eb,stroke:#3b82f6,color:#fff
    style FR fill:#0891b2,stroke:#06b6d4,color:#fff
```

## 4. Guard B — Worker Dashboard Flow

```mermaid
flowchart TD
    DASH["Worker Dashboard<br/>/c/{slug}"] --> FILTER{"Role-based filter"}
    FILTER -->|Drafter| DRAFTER["Design status updates<br/>POST /items/{id}/drafter-status"]
    FILTER -->|Purchasing| PURCH["Purchasing status<br/>POST /items/{id}/purchasing-status"]
    FILTER -->|Machining/Fab| PROD["Production progress<br/>POST /progress/{id}/update"]
    FILTER -->|QC| QC["QC rework logs<br/>POST /progress/{id}/rework"]
    FILTER -->|Delivery| DEL["Delivery tracking"]
    FILTER -->|Finance| FIN["Finance status<br/>POST /items/{id}/finance"]

    DASH -->|Cancel last| UNDO["POST /progress/{id}/cancel-last-update"]
    DASH -->|Report issue| KENDALA["POST /progress/{id}/kendala"]

    DASH -->|Archive| ARCH["/c/{slug}/archive"]
    DASH -->|Troubles| TROUB["/c/{slug}/trouble-reports"]
    DASH -->|Profile| PROF["/c/{slug}/profile"]
    DASH -->|Export PDF| PDF["/c/{slug}/export-pdf"]

    style DASH fill:#2563eb,stroke:#3b82f6,color:#fff
    style ARCH fill:#64748b,stroke:#94a3b8,color:#fff
```

## 5. Complete UI Flow Map (Simplified)

```mermaid
flowchart LR
    subgraph AUTH["Guard A: Office"]
        LOGIN["/login"]
        REG["/register"]
        FP["/forgot-password"]
        RP["/reset-password/{token}"]
    end

    subgraph OWNER["Guard A: Owner"]
        DASH["/dashboard"]
        CPO["/pos/create"]
    end

    subgraph WORKER["Guard B: Floor"]
        C["/c/{slug}"]
        CL["/c/{slug} (PIN form)"]
        CW["/c/{slug} (dashboard)"]
        CA["/c/{slug}/archive"]
        CT["/c/{slug}/trouble-reports"]
    end

    LOGIN -->|auth| DASH
    REG --> LOGIN
    FP --> RP --> LOGIN
    DASH --> CPO

    CL -->|auth| CW
    CW --> CA
    CW --> CT
    C -->|guest| CL
    C -->|auth| CW

    DASH -.->|navigate to tenant| C

    style DASH fill:#2563eb,stroke:#3b82f6,color:#fff
    style CW fill:#2563eb,stroke:#3b82f6,color:#fff
```

## Finding-to-Diagram Cross-Reference

| Finding | Diagram | Element |
|---|---|---|
| C1. TDZ bug | Owner Dashboard | `animatedActivityIds` / `recentActivity` ordering |
| C2. No retry on error | Owner Dashboard | Error state rendering |
| C3. window.confirm() | Owner Dashboard Flow | Settings → Archive (red node) |
| H1. No unsaved guard | Owner Dashboard, CreatePo | Form navigation edges |
| H2. Disabled btn a11y | Guard A Auth Flow | Login form submit button |
| H3. `<a>` full reloads | Owner Dashboard Flow | Tab navigation edges |
| H4. CreatePo flash | Owner Dashboard Flow | CreatePo form initialization |
| H5. Filter empty state | Worker Dashboard Flow | Role-based filter paths |
| H6. Sub-query loading | Worker Dashboard Flow | Dashboard data loading |
| H7. Unguarded queries | Owner Dashboard Flow | Dashboard charts section |
| M1. No keyboard help | All flows | Global shortcut overlay missing |
| M2. Missing empty states | Owner Dashboard Flow | Dashboard sub-sections |
| M3. No password toggle | Guard A Auth Flow | Login password field |
| M4. Cancel no confirm | Owner Dashboard Flow | CreatePo cancel edge |
| M5. No pagination | Worker Dashboard Flow | Item list in dashboard |
| M6. Inconsistent empty | All flows | Zero-data states across pages |
