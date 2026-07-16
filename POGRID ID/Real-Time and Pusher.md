# Real-Time and Pusher

POgrid.id is live, not polled.

- **Transport:** Pusher WebSockets push progress updates to the Owner dashboard and worker phones the moment an item changes.
- **Alerts:** Automatic timeline alerts fire on overdue, at-risk, and stuck items.
- **No polling:** the React SPA subscribes once; Laravel broadcasts via Pusher.

This is how the Owner answers *"where is my order, and will it be on time?"* without calling the floor.

## Links

- Back to [[POGrid Wiki Home]]
- What gets tracked: [[KPIs and OTD]]
- Powered by the [[Tech Stack]] (Pusher)
- Architecture detail in `ARCHITECTURE.md` → [[Source Docs]]
