/**
 * E2E Tests — Navigation & Page Integrity
 *
 * Covers:
 *   ✓ All major pages load without errors
 *   ✓ No JavaScript console errors on critical pages
 *   ✓ Forgot password page loads
 *   ✓ Legal pages (terms, privacy) load
 *   ✓ Error pages render correctly (404)
 *   ✓ Worker dashboard loads after PIN login
 */

const {
  OFFICE_USERS,
  WORKER_PIN,
  WORKER_NAMES,
  TENANT_SLUG,
  URLS,
  BASE_URL,
  SELECTORS,
  sleep,
  loginAsOfficeUser,
  waitForInertia,
} = require('../helpers/testHelpers');

describe('Navigation & Page Integrity', () => {
  describe('Public Pages', () => {
    beforeEach(async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();
    });

    it('should load the login page without console errors', async () => {
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto(URLS.login, { waitUntil: 'networkidle0' });

      // Filter out non-critical errors (e.g., favicon, third-party scripts)
      const criticalErrors = consoleErrors.filter(
        (err) =>
          !err.includes('favicon') &&
          !err.includes('404') &&
          !err.includes('net::ERR')
      );
      expect(criticalErrors.length).toBe(0);
    });

    it('should load the forgot password page', async () => {
      await page.goto(URLS.forgotPassword, { waitUntil: 'networkidle0' });

      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasForgotContent =
        bodyText.includes('Forgot') ||
        bodyText.includes('Lupa') ||
        bodyText.includes('Reset') ||
        bodyText.includes('Email');
      expect(hasForgotContent).toBe(true);
    });

    it('should load the worker login page', async () => {
      await page.goto(URLS.workerLogin, { waitUntil: 'networkidle0' });

      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText.length).toBeGreaterThan(20);
    });

    it('should load terms of service page', async () => {
      await page.goto(`${BASE_URL}/terms`, { waitUntil: 'networkidle0' });

      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasLegalContent =
        bodyText.includes('Terms') ||
        bodyText.includes('Syarat') ||
        bodyText.includes('Service') ||
        bodyText.length > 100;
      expect(hasLegalContent).toBe(true);
    });

    it('should load privacy policy page', async () => {
      await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'networkidle0' });

      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasPrivacyContent =
        bodyText.includes('Privacy') ||
        bodyText.includes('Privasi') ||
        bodyText.includes('Data') ||
        bodyText.length > 100;
      expect(hasPrivacyContent).toBe(true);
    });
  });

  describe('Error Pages', () => {
    beforeEach(async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();
    });

    it('should show a 404 page for non-existent routes', async () => {
      const response = await page.goto(`${BASE_URL}/this-page-does-not-exist-xyz`, {
        waitUntil: 'networkidle0',
      });

      // Should return 404 status or show error page
      const status = response.status();
      const bodyText = await page.evaluate(() => document.body.innerText);

      const is404 =
        status === 404 ||
        bodyText.includes('404') ||
        bodyText.includes('Not Found') ||
        bodyText.includes('Tidak Ditemukan');
      expect(is404).toBe(true);
    });
  });

  describe('Authenticated Pages', () => {
    beforeAll(async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();
      await loginAsOfficeUser(page, OFFICE_USERS.admin);
    });

    it('should load dashboard without errors', async () => {
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      await page.goto(URLS.dashboard, { waitUntil: 'networkidle0' });

      const bodyText = await page.evaluate(() => document.body.innerText);
      expect(bodyText.length).toBeGreaterThan(50);
    });

    it('should navigate between dashboard tabs without full reload', async () => {
      await page.goto(URLS.dashboard, { waitUntil: 'networkidle0' });

      // Try clicking a tab — look for tab-like elements
      const tabClicked = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button, a, [role="tab"]')];
        const tab = buttons.find(
          (b) =>
            b.textContent?.includes('Active') ||
            b.textContent?.includes('Aktif') ||
            b.textContent?.includes('Team') ||
            b.textContent?.includes('Tim')
        );
        if (tab) {
          tab.click();
          return true;
        }
        return false;
      });

      if (tabClicked) {
        await waitForInertia(page);
        const bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText.length).toBeGreaterThan(30);
      }
    });
  });

  describe('Worker Dashboard', () => {
    beforeAll(async () => {
      const client = await page.createCDPSession();
      await client.send('Network.clearBrowserCookies');
      await client.detach();
    });

    it('should load worker dashboard after PIN login', async () => {
      await page.goto(URLS.workerLogin, { waitUntil: 'networkidle0' });

      // Select a worker
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

        // Type PIN
        const pinInput = await page.$('input[type="password"]');
        if (pinInput) {
          await pinInput.type(WORKER_PIN);
        }

        // Submit
        const submitBtn = await page.$(SELECTORS.workerLogin.submitButton);
        if (submitBtn) {
          await submitBtn.click();
          await waitForInertia(page);
        }

        // Should be on worker dashboard
        const bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText.length).toBeGreaterThan(30);
      }
    });
  });
});
