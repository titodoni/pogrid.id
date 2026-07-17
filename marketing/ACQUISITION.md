# POgrid.id — Growth Engine: Acquisition Channels & Attribution

**Issue:** [GIT-7](/372ce8c9-120e-4183-83db-d30df9b5a34b/issues/GIT-7)
**Owner (build):** PATRICK (CTO) · **Owner (strategy):** ERASMUS (CEO)
**Status:** scaffolding live · attribution wired · channels defined

## 1. Public surface (separate from app auth)

- **Marketing site:** `pogrid.id` (apex) — static, Bahasa Indonesia, built in `marketing/`.
  Deploys to the apex host, fully independent of the SaaS app at `app.pogrid.id`.
- **App:** `app.pogrid.id` — signup/onboarding (owned by [GIT-3](/372ce8c9-120e-4183-83db-d30df9b5a34b/issues/GIT-3) / [GIT-6](/372ce8c9-120e-4183-83db-d30df9b5a34b/issues/GIT-6)).
- **Flow:** landing CTA → `app.pogrid.id/register?utm_source=…&utm_medium=…&utm_campaign=…`
  The marketing JS persists first-touch UTM in `localStorage` and re-decorates every signup
  link so the channel survives browsing.

## 2. Attribution instrumentation (channel → signup)

Captured at registration and persisted on the `tenants` row:

| Column | Source |
|--------|--------|
| `attribution_source` | `utm_source` |
| `attribution_medium` | `utm_medium` |
| `attribution_campaign` | `utm_campaign` |
| `attribution_content` | `utm_content` |
| `attribution_ref` | `ref` / `referral` |
| `attributed_at` | timestamp when any param present |

- Migration: `database/migrations/2026_07_17_110000_add_attribution_to_tenants_table.php`
- Controller: `app/Http/Controllers/RegistrationController.php` (validates + stores)
- Frontend: `resources/js/Pages/Auth/Register.tsx` forwards query params into the POST.

**Measurement query (once live):**
```sql
SELECT attribution_source, attribution_medium, COUNT(*) AS signups
FROM tenants
WHERE attributed_at IS NOT NULL
GROUP BY 1, 2 ORDER BY 3 DESC;
```

## 3. Acquisition channels

Definitions + tracked share links live in `marketing/acquisition-links.json`.
CEO owns execution; CTO supplies the infrastructure and these pre-tagged links.

| Channel | utm_source | Audience | Owner |
|---------|-----------|----------|-------|
| WhatsApp komunitas owner | `whatsapp` | Grup WA pemilik bengkel makloon | ERASMUS |
| Instagram / TikTok | `instagram` / `tiktok` | Konten bisnis lokal UMKM | ERASMUS |
| Grup seller Tokopedia/Shopee | `marketplace` | Seller yang outsource ke makloon | ERASMUS |
| Direct outreach | `direct` | Bengkel target teridentifikasi | ERASMUS |

## 4. Next steps to reach 100+ users

1. CEO executes the 4 channels using the pre-tagged links above (no engineering needed per send).
2. CTO deploys `marketing/` to apex `pogrid.id` (see DEPLOY below).
3. Once signups land, run the measurement query to double down on the best channel.
4. Hand creative/landing conversion experiments to [GIT-6](/372ce8c9-120e-4183-83db-d30df9b5a34b/issues/GIT-6) (activation UX).

## 5. Deploy the marketing site (apex host)

Static files in `marketing/` → upload to the `pogrid.id` document root (separate from
`app.pogrid.id` which points at the Laravel `public/`). No build step; plain HTML/CSS/JS.

```
marketing/   →  pogrid.id  (document root)
  index.html
  assets/styles.css
  assets/app.js
  assets/favicon.svg
  acquisition-links.json
```
