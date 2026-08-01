/**
 * jest-puppeteer configuration for POgrid E2E tests.
 *
 * Allows tests to run against a live server (local or remote) via
 * the APP_URL environment variable. No server is launched by jest-puppeteer
 * itself — the Laravel dev server must already be running.
 *
 * Usage:
 *   APP_URL=http://localhost:8000 npm test
 *   APP_URL=https://app.pogrid.id npm test
 */

/** @type {import('jest-puppeteer').JestPuppeteerConfig} */
module.exports = {
  launch: {
    headless: process.env.HEADLESS !== 'false',
    slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO, 10) : 0,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,800',
    ],
    defaultViewport: {
      width: 1280,
      height: 800,
    },
  },
  // Do NOT let jest-puppeteer start a server — we rely on an external one.
  // server: undefined,
};
