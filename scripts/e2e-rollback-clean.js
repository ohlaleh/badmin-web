/*
  Puppeteer E2E (clean): click the first Rollback button, confirm modal, and verify court emptied.
  Usage:
    APP_URL=http://localhost:3005 node ./scripts/e2e-rollback-clean.js
*/

const puppeteer = require('puppeteer');

async function findServer(urls) {
  const fetch = require('node-fetch');
  for (const u of urls) {
    try {
      const res = await fetch(u, { method: 'GET', redirect: 'manual' });
      if (res.status < 500) return u;
    } catch (e) {
      // ignore
    }
  }
  return null;
}

(async () => {
  const argUrl = process.argv[2];
  const envUrl = process.env.APP_URL;
  const defaults = [envUrl, argUrl, 'http://localhost:3005', 'http://localhost:3004', 'http://localhost:3003', 'http://localhost:3000'].filter(Boolean);
  const tryUrls = Array.from(new Set(defaults));

  const server = await findServer(tryUrls);
  if (!server) {
    console.error('No running server found at tried URLs:', tryUrls);
    process.exit(2);
  }

  console.log('Using server:', server);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    await page.goto(server, { waitUntil: 'networkidle2' });
    console.log('Page loaded');

    const [rb] = await page.$x("//button[contains(normalize-space(.), 'Rollback')]");
    if (!rb) {
      console.error('No Rollback button found on page');
      await browser.close();
      process.exit(3);
    }

    await rb.click();
    await page.waitForSelector('#rollback-title', { visible: true });
    console.log('Rollback modal opened');

    const [confirmBtn] = await page.$x("//button[contains(normalize-space(.), 'Confirm Rollback')]");
    if (!confirmBtn) {
      console.error('Confirm button not found inside modal');
      await browser.close();
      process.exit(4);
    }

    await confirmBtn.click();
    await page.waitForTimeout(800);

    const noPlayers = await page.$x("//div[contains(., 'No players assigned')]");
    if (noPlayers.length > 0) {
      console.log('Success: found "No players assigned" on page — rollback likely applied');
      await browser.close();
      process.exit(0);
    }

    console.error('Could not detect court emptied state after Confirm. Inspect the page to debug.');
    await browser.close();
    process.exit(5);
  } catch (err) {
    console.error('Error during E2E run:', err);
    await browser.close();
    process.exit(10);
  }
})();
