/**
 * E2E Tests — Multi-Tenant Isolation (Test-First / TDD Approach)
 *
 * Following the "Test-First Prompting" pattern from Endor Labs:
 * https://www.endorlabs.com/learn/test-first-prompting-using-tdd-for-secure-ai-generated-code
 *
 * RED PHASE:   Tests written FIRST to define expected tenant isolation behavior.
 *              Each test describes a security invariant that MUST hold.
 * GREEN PHASE: The application's TenantScope, TenantManager, and middleware
 *              are the "implementation" that makes these tests pass.
 * REFACTOR:    Any failure here means a tenant isolation regression — fix the app.
 *
 * Security concerns tested (mapped to CWE):
 *   - CWE-284: Improper Access Control (cross-tenant data access)
 *   - CWE-639: Authorization Bypass Through User-Controlled Key (slug manipulation)
 *   - CWE-200: Exposure of Sensitive Information (data leakage between tenants)
 *   - CWE-862: Missing Authorization (unauthenticated tenant access)
 *
 * Covers:
 *   ✓ Tenant A user sees only Tenant A data
 *   ✓ Worker login is scoped to the correct tenant slug
 *   ✓ Cross-tenant slug access is blocked for workers
 *   ✓ New tenant registration creates isolated environment
 *   ✓ Newly registered tenant has zero data from other tenants
 *   ✓ Office user from Tenant A cannot see Tenant B dashboard
 *   ✓ Session isolation between tenants
 */

const {
  BASE_URL,
  OFFICE_USERS,
  WORKER_PIN,
  WORKER_NAMES,
  TENANT_SLUG,
  SELECTORS,
  URLS,
  sleep,
  loginAsOfficeUser,
  logoutOfficeUser,
  takeScreenshot,
  waitForInertia,
} = require('../helpers/testHelpers');

// ─── Second Tenant (registered dynamically during tests) ─────────────────────
function createTenantB() {
  const ts = Math.floor(Math.random() * 899999 + 100000).toString();
  const slug = `b${ts}`;
  return {
    companyName: `Tenant B ${ts}`,
    slug,
    ownerName: 'Owner B',
    email: `owner.b.${ts}@test.local`,
    username: `ownerb${ts}`,
    password: 'Secure1234',
  };
}

let TENANT_B = createTenantB();
let TENANT_B_URLS = {
  workerLogin: `${BASE_URL}/c/${TENANT_B.slug}`,
  workerDashboard: `${BASE_URL}/c/${TENANT_B.slug}/dashboard`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// RED PHASE — Define what tenant isolation MUST look like
// ═══════════════════════════════════════════════════════════════════════════════

describe('Multi-Tenant Isolation (Test-First / TDD)', () => {

  // ─── 1. Tenant A Data Scoping ──────────────────────────────────────────────
  describe('CWE-284: Tenant A Data Scoping', () => {
    beforeAll(async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();
      await loginAsOfficeUser(page, OFFICE_USERS.admin);
    });

    it('should show Tenant A data (Teknik Mandiri) when logged in as Tenant A user', async () => {
      await page.goto(URLS.dashboard, { waitUntil: 'networkidle0' });

      const bodyText = await page.evaluate(() => document.body.innerText);
      // Must see tenant A's company name or data
      const hasTenantAData =
        bodyText.includes('Teknik Mandiri') ||
        bodyText.includes('PO-2026') ||
        bodyText.includes('Astra') ||
        bodyText.includes('Budi');
      expect(hasTenantAData).toBe(true);
    });

    it('should show Tenant A POs on the active tab', async () => {
      await page.goto(`${URLS.dashboard}?tab=active`, { waitUntil: 'networkidle0' });

      const bodyText = await page.evaluate(() => document.body.innerText);
      // Seeded POs belong to Teknik Mandiri — they should be visible
      const hasSeededData =
        bodyText.includes('PO-2026') ||
        bodyText.includes('Shaft') ||
        bodyText.includes('Bracket') ||
        bodyText.includes('Astra') ||
        bodyText.includes('Indonesia Jaya');
      expect(hasSeededData).toBe(true);
    });
  });

  // ─── 2. Worker Login Tenant Scoping ────────────────────────────────────────
  describe('CWE-639: Worker Login is Scoped to Tenant Slug', () => {
    beforeEach(async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();
    });

    it('should show only Tenant A workers on /c/teknik-mandiri', async () => {
      await page.goto(URLS.workerLogin, { waitUntil: 'networkidle0' });

      const bodyText = await page.evaluate(() => document.body.innerText);

      // Tenant A workers should be present
      let tenantAWorkersFound = 0;
      for (const name of WORKER_NAMES) {
        if (bodyText.includes(name)) tenantAWorkersFound++;
      }
      expect(tenantAWorkersFound).toBeGreaterThan(0);
    });

    it('should return 404 for a non-existent tenant slug', async () => {
      const response = await page.goto(
        `${BASE_URL}/c/nonexistent-company-xyz-12345`,
        { waitUntil: 'networkidle0' }
      );

      const status = response.status();
      const bodyText = await page.evaluate(() => document.body.innerText);

      // Should be 404 — no tenant with this slug
      const isBlocked =
        status === 404 ||
        bodyText.includes('404') ||
        bodyText.includes('Not Found') ||
        bodyText.includes('Tidak Ditemukan');
      expect(isBlocked).toBe(true);
    });

    it('should not expose Tenant A workers on a wrong slug', async () => {
      const response = await page.goto(
        `${BASE_URL}/c/some-other-company`,
        { waitUntil: 'networkidle0' }
      );

      const bodyText = await page.evaluate(() => document.body.innerText);

      // Should NOT contain Tenant A worker names
      let tenantAWorkersLeaked = 0;
      for (const name of WORKER_NAMES) {
        if (bodyText.includes(name)) tenantAWorkersLeaked++;
      }
      expect(tenantAWorkersLeaked).toBe(0);
    });
  });

  // ─── 3. New Tenant Registration & Isolation ────────────────────────────────
  describe('CWE-200: New Tenant Registration Creates Isolated Environment', () => {
    let registrationSucceeded = false;

    it('should load the registration page', async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();

      await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0' });

      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasRegForm =
        bodyText.includes('Register') ||
        bodyText.includes('Daftar') ||
        bodyText.includes('Company') ||
        bodyText.includes('Perusahaan');
      expect(hasRegForm).toBe(true);
    });

    it('should register a new tenant (Tenant B)', async () => {
      TENANT_B = createTenantB();
      TENANT_B_URLS = {
        workerLogin: `${BASE_URL}/c/${TENANT_B.slug}`,
        workerDashboard: `${BASE_URL}/c/${TENANT_B.slug}/dashboard`,
      };

      // Ensure user is logged out so guest middleware allows /register access
      await logoutOfficeUser(page).catch(() => {});
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();

      await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => {
        try { localStorage.clear(); sessionStorage.clear(); } catch (_) {}
      });

      await page.focus('#company_name');
      await page.keyboard.type(TENANT_B.companyName);
      await sleep(300);

      // Explicitly set unique slug to prevent unique:tenants,slug database conflict
      await page.focus('#slug');
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(TENANT_B.slug);
      await sleep(200);

      await page.focus('#name');
      await page.keyboard.type(TENANT_B.ownerName);
      await sleep(200);

      await page.focus('#email');
      await page.keyboard.type(TENANT_B.email);
      await sleep(200);

      await page.focus('#password');
      await page.keyboard.type(TENANT_B.password);
      await sleep(200);

      await page.focus('#password_confirmation');
      await page.keyboard.type(TENANT_B.password);
      await sleep(200);

      // Submit form via Inertia
      await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      });
      await waitForInertia(page);
      await sleep(1500);

      // Check if we were redirected (registration success)
      const url = page.url();
      registrationSucceeded =
        url.includes('/selamat-datang') ||
        url.includes('/dashboard') ||
        !url.includes('/register');

      if (!registrationSucceeded) {
        const bodyText = await page.evaluate(() => document.body.innerText);
        const errorSpans = await page.evaluate(() => {
          const els = document.querySelectorAll('span');
          return [...els].map(e => e.innerText).filter(t => t.length > 0).join(' | ');
        });
        console.log('Registration failed. Current URL:', url);
        console.log('Spans preview:', errorSpans);
      }

      expect(registrationSucceeded).toBe(true);
    });

    it('should show empty data for newly registered Tenant B (no data leakage)', async () => {
      if (!registrationSucceeded) {
        console.log('Skipping — registration did not succeed');
        return;
      }

      // After registration, we should be logged in as Tenant B owner
      await page.goto(URLS.dashboard, { waitUntil: 'networkidle0' });
      const url = page.url();

      // If we're on the dashboard, check it has NO Tenant A data
      if (url.includes('/dashboard') || url.includes('/selamat-datang')) {
        const bodyText = await page.evaluate(() => document.body.innerText);

        // MUST NOT contain Tenant A's data
        expect(bodyText).not.toContain('Teknik Mandiri');
        expect(bodyText).not.toContain('PO-2026-001');
        expect(bodyText).not.toContain('PO-2026-002');
        expect(bodyText).not.toContain('PT Astra Otoparts');
        expect(bodyText).not.toContain('CV Indonesia Jaya');
        expect(bodyText).not.toContain('Shaft S45C');
      }
    });

    it('should not show Tenant A workers on Tenant B worker login page', async () => {
      if (!registrationSucceeded) {
        console.log('Skipping — registration did not succeed');
        return;
      }

      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();

      const response = await page.goto(TENANT_B_URLS.workerLogin, {
        waitUntil: 'networkidle0',
      });

      const bodyText = await page.evaluate(() => document.body.innerText);

      // MUST NOT contain Tenant A worker names
      for (const name of WORKER_NAMES) {
        expect(bodyText).not.toContain(name);
      }
    });
  });

  // ─── 4. Cross-Tenant Session Isolation ─────────────────────────────────────
  describe('CWE-862: Cross-Tenant Session Isolation', () => {
    it('Tenant A office user cannot access Tenant B worker dashboard via slug', async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();

      // Login as Tenant A office user
      await loginAsOfficeUser(page, OFFICE_USERS.admin);

      // Try to access a different tenant's worker dashboard
      await page.goto(`${BASE_URL}/c/some-random-tenant/dashboard`, {
        waitUntil: 'networkidle0',
      });

      const url = page.url();
      const bodyText = await page.evaluate(() => document.body.innerText);

      // Should be blocked — 404, 403, or redirected
      const isBlocked =
        url.includes('/login') ||
        bodyText.includes('404') ||
        bodyText.includes('403') ||
        bodyText.includes('Not Found') ||
        bodyText.includes('Forbidden');
      expect(isBlocked).toBe(true);
    });

    it('Tenant A worker session cannot access Tenant B worker slug', async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();

      // Login as Tenant A worker
      await page.goto(URLS.workerLogin, { waitUntil: 'networkidle0' });

      // Select a worker and login
      const workerSelected = await page.evaluate((names) => {
        const els = document.querySelectorAll('[data-worker-id], button, div');
        for (const el of els) {
          for (const name of names) {
            if (el.textContent?.includes(name)) {
              el.click();
              return true;
            }
          }
        }
        return false;
      }, WORKER_NAMES);

      if (workerSelected) {
        await sleep(500);
        const pinInput = await page.$('input[type="password"]');
        if (pinInput) await pinInput.type(WORKER_PIN);

        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await waitForInertia(page);
        }
      }

      // Now try accessing a DIFFERENT tenant's worker page
      await page.goto(`${BASE_URL}/c/different-tenant/dashboard`, {
        waitUntil: 'networkidle0',
      });

      const bodyText = await page.evaluate(() => document.body.innerText);

      // MUST NOT see Tenant A's production data on another slug
      const isIsolated =
        !bodyText.includes('Shaft S45C') &&
        !bodyText.includes('Flange Plate') &&
        !bodyText.includes('Special Bracket');
      expect(isIsolated).toBe(true);
    });
  });

  // ─── 5. Slug Manipulation Attacks ──────────────────────────────────────────
  describe('CWE-639: Slug Manipulation Attacks', () => {
    beforeEach(async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();
    });

    it('should reject SQL-injection-like slugs', async () => {
      const maliciousSlugs = [
        "teknik-mandiri' OR '1'='1",
        'teknik-mandiri%27%20OR%20%271%27%3D%271',
        '../teknik-mandiri',
        'teknik-mandiri/../../admin',
      ];

      for (const slug of maliciousSlugs) {
        const response = await page.goto(`${BASE_URL}/c/${slug}`, {
          waitUntil: 'networkidle0',
        });

        const status = response.status();
        const bodyText = await page.evaluate(() => document.body.innerText);

        // Must NOT return Tenant A worker data
        let dataLeaked = false;
        for (const name of WORKER_NAMES) {
          if (bodyText.includes(name)) {
            dataLeaked = true;
            break;
          }
        }

        // Should either 404/500 or show no data — never leak
        expect(dataLeaked).toBe(false);
      }
    });

    it('should not expose tenant data via path traversal in slug', async () => {
      const traversalSlugs = [
        '..%2f..%2fadmin',
        '..\\..\\admin',
        '%00teknik-mandiri',
        'teknik-mandiri%00',
      ];

      for (const slug of traversalSlugs) {
        const response = await page.goto(`${BASE_URL}/c/${encodeURIComponent(slug)}`, {
          waitUntil: 'networkidle0',
        });

        const bodyText = await page.evaluate(() => document.body.innerText);

        // No Tenant A data should appear
        expect(bodyText).not.toContain('Sari Dewi');
        expect(bodyText).not.toContain('Budi Santoso');
      }
    });
  });

  // ─── 6. API-Level Tenant Isolation ─────────────────────────────────────────
  describe('CWE-284: API-Level Tenant Boundary Enforcement', () => {
    it('unauthenticated request to /dashboard should not leak any tenant data', async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();

      await page.goto(URLS.dashboard, { waitUntil: 'networkidle0' });

      const url = page.url();
      // Should redirect to login
      expect(url).toContain('/login');

      // And the redirect should not expose any tenant data in the page
      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).not.toContain('PO-2026-001');
      expect(bodyText).not.toContain('Shaft S45C');
      expect(bodyText).not.toContain('PT Astra Otoparts');
    });

    it('unauthenticated request to /pos/create should not leak PO form/data', async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();

      await page.goto(URLS.poCreate, { waitUntil: 'networkidle0' });

      const url = page.url();
      expect(url).toContain('/login');
    });

    it('unauthenticated request to /stage-templates should not leak template data', async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();

      await page.goto(`${BASE_URL}/stage-templates`, { waitUntil: 'networkidle0' });

      const url = page.url();
      expect(url).toContain('/login');

      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText).not.toContain('Sari Dewi');
      expect(bodyText).not.toContain('Budi Santoso');
      expect(bodyText).not.toContain('Fitri Handayani');
    });
  });

  // ─── 7. Concurrent Tenant Session Isolation ────────────────────────────────
  describe('CWE-200: Concurrent Session Data Isolation', () => {
    it('should maintain separate sessions for different users across tabs', async () => {
      // Login as Tenant A admin in main page
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();

      await loginAsOfficeUser(page, OFFICE_USERS.admin);
      await page.goto(URLS.dashboard, { waitUntil: 'networkidle0' });

      const mainPageContent = await page.evaluate(() => document.body.innerText);

      // Tenant A user should see Tenant A data
      const hasTenantAData =
        mainPageContent.includes('Teknik Mandiri') ||
        mainPageContent.includes('Dashboard') ||
        mainPageContent.includes('PO');
      expect(hasTenantAData).toBe(true);

      // Open an incognito page (simulates different user/session)
      const context = await browser.createBrowserContext();
      const incognitoPage = await context.newPage();

      // In incognito, access worker login for the same tenant
      await incognitoPage.goto(URLS.workerLogin, { waitUntil: 'networkidle0' });

      const incognitoContent = await incognitoPage.evaluate(
        () => document.body.innerText
      );

      // Worker page should show its own view, not the admin dashboard
      expect(incognitoContent).not.toContain('Dashboard');

      // Clean up
      await incognitoPage.close();
      await context.close();
    });
  });
});
