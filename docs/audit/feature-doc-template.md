# Feature Documentation Template (POGrid)

> Copy this template when adding a new POGrid feature. Keep it short and code-linked.
> Save as `docs/features/<feature-slug>.md` and link it from `README.md` §Documentation.

## 1. Summary

One-line: what the feature does and who it serves (Owner / Worker / Admin).

## 2. Why

Business trigger and the user anxiety/pain it removes. Link to the relevant PRD section.

## 3. UX Flow

- Entry point (route / page): `routes/web.php` → `resources/js/Pages/...`
- Key interactions (button → controller → observer → DB)

## 4. Backend

| Piece | Location |
|-------|----------|
| Controller / action | `app/Http/Controllers/...::method()` |
| Observer / cascade | `app/Observers/...` (if business logic) |
| Service | `app/Services/...` |
| Command (cron) | `app/Console/Commands/...` |
| Migration | `database/migrations/...` |
| Seeder / demo data | `database/seeders/...` |

## 5. Data Model Delta

List new/changed tables & columns (match PRD §11 style: entity, key fields, purpose).

## 6. Constraints & Guardrails

- Tenancy: does it respect `TenantScope`? Any `TenantManager::bypass()` needed?
- Auth guard: Office (password) or Floor (PIN)? Role gate?
- Real-time: does it broadcast? Is a client subscriber wired? (see GIT-34)
- i18n: add EN/ID `translations` + `localStorage('pogrid_lang')`?

## 7. Tests

- Feature test: `tests/Feature/...`
- Manual verify steps (demo tenant `teknik-mandiri`).

## 8. Drift Checklist (before merge)

- [ ] README / ARCHITECTURE / PRD updated if behavior changed
- [ ] New file paths referenced in docs actually exist
- [ ] No hardcoded absolute paths (use `.` / repo-relative)
- [ ] Added to README §Documentation table
