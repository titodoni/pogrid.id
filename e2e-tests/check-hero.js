const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 800 });
  await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0', timeout: 30000 });
  const info = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const cs = getComputedStyle(h1);
    const sheets = [...document.styleSheets].map(s => s.href || '(inline)');
    // find which rule wins for font-size
    let matched = [];
    for (const sh of document.styleSheets) {
      try {
        for (const r of sh.cssRules) {
          if (r.cssRules) { // layered
            for (const rr of r.cssRules) {
              if (rr.selectorText && h1.matches(rr.selectorText) && rr.style.fontSize) matched.push(sh.href + ' :: ' + rr.selectorText + ' -> ' + rr.style.fontSize);
            }
          }
          if (r.selectorText && h1.matches(r.selectorText) && r.style.fontSize) matched.push(sh.href + ' :: ' + r.selectorText + ' -> ' + r.style.fontSize);
        }
      } catch (e) {}
    }
    return {
      fontSize: cs.fontSize, fontWeight: cs.fontWeight, className: h1.className,
      sheets, matched: matched.slice(0, 20),
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
