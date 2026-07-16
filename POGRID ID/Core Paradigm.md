# Core Paradigm

The three principles that shape every POgrid.id design decision.

## 1. Item-Centric
The unit of work is the **Item**, not the Purchase Order. A PO contains many items; each item moves through the production pipeline independently and is tracked on its own.

## 2. Zero-Block
No stage waits for another. An item can enter any stage at any time. There are no forced dependencies and no auto-injection of stages the admin did not pick — if the admin selects only `Machining`, exactly `Machining` is created.

## 3. Asynchronous Progress Tracking
Workers log progress from their phone whenever they actually do the work. Stages start at 0% / PENDING and are updated out of band. The system reflects reality, not a predicted schedule.

## Links

- Back to [[POGrid Wiki Home]]
- Purpose: [[The Soul]]
- The pipeline these principles run on: [[Workflow Stages]]
- Locked in `MAIN-IDEA.md` → [[Source Docs]]
