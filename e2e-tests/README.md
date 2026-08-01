# POgrid E2E Tests

AI-powered end-to-end tests built with **Puppeteer** and **Jest**, following the approach from [release.com/blog/ai-powered-e2e-testing](https://release.com/blog/ai-powered-e2e-testing).

## Architecture

```
e2e-tests/
├── helpers/
│   └── testHelpers.js    # Shared selectors, credentials, login/logout helpers
├── tests/
│   ├── auth.test.js       # Office login (Guard A) — login/logout/errors/lang
│   ├── worker-auth.test.js# Worker PIN login (Guard B) — PIN/search/errors
│   ├── dashboard.test.js  # Owner dashboard — tabs/content/mobile
│   ├── po-management.test.js # PO CRUD — list/create/detail/owner restriction
│   └── navigation.test.js # Page integrity — 404/console errors/legal pages
├── screenshots/           # Auto-generated on failures (gitignored)
├── jest.config.js
├── jest-puppeteer.config.js
├── package.json
└── README.md
```

## Prerequisites

1. **Node.js** ≥ 18
2. **Laravel dev server** running at `http://localhost:8000`
3. **Database seeded** with `php artisan db:seed`

## Setup

```bash
cd e2e-tests
npm install
```

## Running Tests

Start your Laravel server first:

```bash
# Terminal 1 — Laravel server
cd /home/tito/pogrid
php artisan serve

# Terminal 2 — E2E tests
cd /home/tito/pogrid/e2e-tests
npm test
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_URL` | `http://localhost:8000` | Base URL of the running app |
| `HEADLESS` | `true` | Run Chrome in headless mode (`false` to see browser) |
| `SLOWMO` | `0` | Slow down Puppeteer actions by N ms (for debugging) |

### Run Specific Test Suites

```bash
npm run test:auth        # Office authentication only
npm run test:worker      # Worker PIN login only
npm run test:dashboard   # Dashboard tests only
npm run test:po          # PO management tests only
```

### Run Against Production

```bash
APP_URL=https://app.pogrid.id npm test
```

### Debug Mode (visible browser + slow)

```bash
HEADLESS=false SLOWMO=100 npm test
```

## Test Coverage

| Suite | What It Tests |
|-------|---------------|
| **auth** | Office login/logout, wrong password, unknown user, protected routes, language toggle |
| **worker-auth** | Worker PIN login, wrong PIN, worker search/filter, tenant branding |
| **dashboard** | Dashboard tabs (alerts/active/completed), content verification, mobile responsiveness |
| **po-management** | PO list, seeded data display, PO creation (admin), owner restriction (403) |
| **navigation** | Console error checking, forgot password, legal pages, 404 error page, worker dashboard flow |

## Key Design Decisions

1. **External server** — Tests connect to an already-running Laravel instance rather than starting one. This avoids complexity with Vite/SSR and keeps the test runner simple.

2. **Inertia-aware waits** — Since POgrid uses Inertia.js (XHR-based navigation), tests use `waitForNetworkIdle` instead of `waitForNavigation` where appropriate.

3. **Bilingual assertions** — All assertions check for both EN and ID text since the app is dual-language.

4. **Centralized helpers** — All selectors and credentials live in `testHelpers.js` so changes to the UI only require updates in one place.

5. **Screenshots on demand** — Use `takeScreenshot(page, 'name')` in any test for debugging.
