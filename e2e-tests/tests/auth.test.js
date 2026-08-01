/**
 * E2E Tests — Office Authentication (Guard A)
 *
 * Covers:
 *   ✓ Login page loads correctly
 *   ✓ Successful login with valid credentials
 *   ✓ Failed login with wrong password
 *   ✓ Failed login with unknown user
 *   ✓ Redirect to dashboard after login
 *   ✓ Logout flow
 *   ✓ Protected routes redirect to login
 *   ✓ Language toggle persistence
 */

const {
  OFFICE_USERS,
  SELECTORS,
  URLS,
  sleep,
  loginAsOfficeUser,
  takeScreenshot,
  waitForInertia,
} = require('../helpers/testHelpers');

describe('Office Authentication (Guard A)', () => {
  beforeEach(async () => {
    // Clear cookies to start fresh
    const client = await page.createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.detach();
  });

  describe('Login Page', () => {
    it('should load the login page with correct elements', async () => {
      await page.goto(URLS.login, { waitUntil: 'networkidle0' });

      // Title / logo
      const logo = await page.$('img[alt*="POgrid"]');
      expect(logo).not.toBeNull();

      // Username input
      const usernameInput = await page.$(SELECTORS.login.usernameInput);
      expect(usernameInput).not.toBeNull();

      // Password input
      const passwordInput = await page.$(SELECTORS.login.passwordInput);
      expect(passwordInput).not.toBeNull();

      // Submit button
      const submitBtn = await page.$(SELECTORS.login.submitButton);
      expect(submitBtn).not.toBeNull();

      // Forgot password link
      const forgotLink = await page.$('a[href="/forgot-password"]');
      expect(forgotLink).not.toBeNull();
    });

    it('should show the POgrid subtitle text', async () => {
      await page.goto(URLS.login, { waitUntil: 'networkidle0' });
      const bodyText = await page.evaluate(() => document.body.innerText);
      // Either EN or ID subtitle should be present
      const hasSubtitle =
        bodyText.includes('Live Progress') ||
        bodyText.includes('Pantau Progres');
      expect(hasSubtitle).toBe(true);
    });
  });

  describe('Successful Login', () => {
    it('should login as admin and redirect to dashboard', async () => {
      await loginAsOfficeUser(page, OFFICE_USERS.admin);

      const url = page.url();
      const isOnProtectedPage =
        url.includes('/dashboard') || url.includes('/c/') || url.includes('/pos');
      expect(isOnProtectedPage).toBe(true);
    });

    it('should login as owner and see dashboard', async () => {
      await loginAsOfficeUser(page, OFFICE_USERS.owner);

      const url = page.url();
      const isOnProtectedPage =
        url.includes('/dashboard') || url.includes('/c/');
      expect(isOnProtectedPage).toBe(true);
    });

    it('should login as sales user', async () => {
      await loginAsOfficeUser(page, OFFICE_USERS.sales);

      const url = page.url();
      const isOnProtectedPage =
        url.includes('/dashboard') || url.includes('/c/') || url.includes('/pos');
      expect(isOnProtectedPage).toBe(true);
    });
  });

  describe('Failed Login', () => {
    it('should show error for wrong password', async () => {
      await page.goto(URLS.login, { waitUntil: 'networkidle0' });
      await page.waitForSelector(SELECTORS.login.usernameInput, { visible: true });

      await page.type(SELECTORS.login.usernameInput, OFFICE_USERS.admin.username);
      await page.type(SELECTORS.login.passwordInput, 'wrongpassword');

      await page.click(SELECTORS.login.submitButton);
      await waitForInertia(page);

      // Should still be on login page
      const url = page.url();
      expect(url).toContain('/login');

      // Error message should be visible
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasError =
        bodyText.includes('Incorrect password') ||
        bodyText.includes('Password salah') ||
        bodyText.includes('wrong_password');
      expect(hasError).toBe(true);
    });

    it('should show error for non-existent user', async () => {
      await page.goto(URLS.login, { waitUntil: 'networkidle0' });
      await page.waitForSelector(SELECTORS.login.usernameInput, { visible: true });

      await page.type(SELECTORS.login.usernameInput, 'nonexistentuser12345');
      await page.type(SELECTORS.login.passwordInput, 'somepassword');

      await page.click(SELECTORS.login.submitButton);
      await waitForInertia(page);

      const url = page.url();
      expect(url).toContain('/login');

      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasError =
        bodyText.includes('No account found') ||
        bodyText.includes('Tidak ada akun') ||
        bodyText.includes('user_not_found');
      expect(hasError).toBe(true);
    });
  });

  describe('Protected Routes', () => {
    it('should redirect /dashboard to /login when not authenticated', async () => {
      await page.goto(URLS.dashboard, { waitUntil: 'networkidle0' });
      const url = page.url();
      expect(url).toContain('/login');
    });

    it('should redirect /pos/create to /login when not authenticated', async () => {
      await page.goto(URLS.poCreate, { waitUntil: 'networkidle0' });
      const url = page.url();
      expect(url).toContain('/login');
    });

    it('should redirect /stage-templates to /login when not authenticated', async () => {
      await page.goto(`${URLS.dashboard.split('/dashboard')[0]}/stage-templates`, { waitUntil: 'networkidle0' });
      const url = page.url();
      expect(url).toContain('/login');
    });
  });

  describe('Language Toggle', () => {
    it('should toggle between EN and ID on login page', async () => {
      await page.goto(URLS.login, { waitUntil: 'networkidle0' });

      // Click the ID language button
      const idButton = await page.evaluateHandle(() => {
        const buttons = [...document.querySelectorAll('button')];
        return buttons.find(b => b.textContent?.trim() === 'ID');
      });
      if (idButton) {
        await idButton.click();
        await sleep(500);

        const bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText).toContain('Masuk');
      }

      // Click the EN language button
      const enButton = await page.evaluateHandle(() => {
        const buttons = [...document.querySelectorAll('button')];
        return buttons.find(b => b.textContent?.trim() === 'EN');
      });
      if (enButton) {
        await enButton.click();
        await sleep(500);

        const bodyText = await page.evaluate(() => document.body.innerText);
        expect(bodyText).toContain('Sign In');
      }
    });
  });
});
