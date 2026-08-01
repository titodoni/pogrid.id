/**
 * Shared helpers & constants for POgrid E2E tests.
 *
 * All tests import from here so selectors & credentials live in one place.
 */

// ─── Base URL ────────────────────────────────────────────────────────────────
const BASE_URL = process.env.APP_URL || 'http://localhost:8000';

// ─── Test Credentials ────────────────────────────────────────────────────────
const OFFICE_USERS = {
  owner: { username: 'sari', password: 'poiuy', name: 'Sari Dewi' },
  admin: { username: 'budi', password: 'poiuy', name: 'Budi Santoso' },
  sales: { username: 'fitri', password: 'poiuy', name: 'Fitri Handayani' },
  manager: { username: 'dimas', password: 'poiuy', name: 'Dimas Ardiansyah' },
};

const WORKER_PIN = '0000';
const TENANT_SLUG = 'teknik-mandiri';

const WORKER_NAMES = [
  'Rina Wulandari',
  'Dewi Sartika',
  'Arief Prasetyo',
  'Hendra Gunawan',
  'Bambang Supriyadi',
  'Agus Hermawan',
  'Slamet Riyadi',
  'Joko Susilo',
];

// ─── Selectors ───────────────────────────────────────────────────────────────
const SELECTORS = {
  // Office Login page
  login: {
    usernameInput: '#username',
    passwordInput: '#password',
    submitButton: 'button[type="submit"]',
    forgotPasswordLink: 'a[href="/forgot-password"]',
    errorMessage: 'span[style*="color"]',
  },
  // Worker Login page  (/c/{slug})
  workerLogin: {
    workerCard: '[data-worker-id]',
    pinInput: 'input[type="password"]',
    submitButton: 'button[type="submit"]',
    searchInput: 'input[type="text"]',
    errorMessage: 'span[style*="color"]',
  },
  // Owner Dashboard
  dashboard: {
    container: '.login-card, [class*="dashboard"], main',
  },
};

// ─── URLs ────────────────────────────────────────────────────────────────────
const URLS = {
  login: `${BASE_URL}/login`,
  dashboard: `${BASE_URL}/dashboard`,
  poList: `${BASE_URL}/pos`,
  poCreate: `${BASE_URL}/pos/create`,
  users: `${BASE_URL}/users`,
  alerts: `${BASE_URL}/alerts`,
  workerLogin: `${BASE_URL}/c/${TENANT_SLUG}`,
  workerDashboard: `${BASE_URL}/c/${TENANT_SLUG}/dashboard`,
  forgotPassword: `${BASE_URL}/forgot-password`,
};

/**
 * Sleep helper replacement for page.waitForTimeout
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Log in as an office user via the /login form.
 * @param {import('puppeteer').Page} page
 * @param {{ username: string; password: string }} user
 */
async function loginAsOfficeUser(page, user) {
  await page.goto(URLS.login, { waitUntil: 'networkidle0' });
  await page.waitForSelector(SELECTORS.login.usernameInput, { visible: true });

  // Clear and type credentials
  await page.click(SELECTORS.login.usernameInput, { clickCount: 3 });
  await page.type(SELECTORS.login.usernameInput, user.username);
  await page.click(SELECTORS.login.passwordInput, { clickCount: 3 });
  await page.type(SELECTORS.login.passwordInput, user.password);

  // Submit via Inertia form
  await page.click(SELECTORS.login.submitButton);
  await waitForInertia(page);
  await sleep(500);
}

/**
 * Log out the current office user.
 * @param {import('puppeteer').Page} page
 */
async function logoutOfficeUser(page) {
  // Try clicking a logout button/link. The exact selector may vary;
  // fall back to navigating directly if the button isn't visible.
  try {
    const logoutBtn = await page.$('a[href*="logout"], button[onclick*="logout"]');
    if (logoutBtn) {
      await logoutBtn.click();
      await waitForInertia(page);
      return;
    }
  } catch (_) {
    // ignore
  }
  // POST to /logout via form submission
  await page.evaluate(() => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/logout';
    const csrf = document.querySelector('meta[name="csrf-token"]');
    if (csrf) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = '_token';
      input.value = csrf.getAttribute('content');
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
  });
  await waitForInertia(page);
}

/**
 * Take a screenshot and save it to the screenshots directory.
 * @param {import('puppeteer').Page} page
 * @param {string} name
 */
async function takeScreenshot(page, name) {
  const path = require('path');
  const dir = path.join(__dirname, '..', 'screenshots');
  const fs = require('fs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}-${Date.now()}.png`),
    fullPage: true,
  });
}

/**
 * Wait for Inertia page navigation to complete.
 * Inertia uses XHR instead of full page loads, so waitForNavigation may not
 * always trigger. This helper waits for network idle as a proxy.
 * @param {import('puppeteer').Page} page
 * @param {number} timeout
 */
async function waitForInertia(page, timeout = 5000) {
  await page.waitForNetworkIdle({ idleTime: 300, timeout }).catch(() => {});
}

module.exports = {
  BASE_URL,
  OFFICE_USERS,
  WORKER_PIN,
  TENANT_SLUG,
  WORKER_NAMES,
  SELECTORS,
  URLS,
  sleep,
  loginAsOfficeUser,
  logoutOfficeUser,
  takeScreenshot,
  waitForInertia,
};
