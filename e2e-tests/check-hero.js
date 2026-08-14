const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1366, height: 800 },
  ];

  const results = [];
  for (const viewport of viewports) {
    await page.setViewport({ width: viewport.width, height: viewport.height });
    await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0', timeout: 30000 });

    const info = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const mobileVisual = document.querySelector('.hero-visual-mobile');
      const desktopVisual = document.querySelector('.dashboard-mockup');
      const menuButton = document.querySelector('[aria-controls="landing-mobile-menu"]');
      const head = document.head.innerHTML;
      const visible = (el) => {
        if (!el) return false;
        const cs = getComputedStyle(el);
        return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
      };

      return {
        h1FontSize: h1 ? getComputedStyle(h1).fontSize : null,
        h1FontWeight: h1 ? getComputedStyle(h1).fontWeight : null,
        mobileVisualVisible: visible(mobileVisual),
        desktopVisualVisible: visible(desktopVisual),
        menuAriaExpanded: menuButton ? menuButton.getAttribute('aria-expanded') : null,
        hasFaqSchema: head.includes('FAQPage'),
        hasOgDimensions: head.includes('og:image:width') && head.includes('og:image:height'),
        hasHreflang: head.includes('hreflang="id"') && head.includes('hreflang="en"'),
      };
    });

    results.push({ viewport: viewport.name, ...info });
  }

  const mobile = results.find((r) => r.viewport === 'mobile');
  const tablet = results.find((r) => r.viewport === 'tablet');
  const desktop = results.find((r) => r.viewport === 'desktop');

  if (!mobile.mobileVisualVisible || !tablet.mobileVisualVisible) {
    throw new Error('Mobile hero visual is not visible at mobile/tablet breakpoints');
  }
  if (!desktop.desktopVisualVisible || desktop.mobileVisualVisible) {
    throw new Error('Desktop hero visual breakpoint is incorrect');
  }
  if (!desktop.hasFaqSchema || !desktop.hasOgDimensions || !desktop.hasHreflang) {
    throw new Error('Landing SEO metadata is incomplete');
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
