/*
  Puppeteer E2E: click the first Rollback button, confirm modal, and verify court emptied.
  Usage:
    APP_URL=http://localhost:3005 node ./scripts/e2e-rollback.js
  Or: node ./scripts/e2e-rollback.js http://localhost:3005
*/

const puppeteer = require('puppeteer');

async function findServer(urls) {
  const fetch = require('node-fetch');
  for (const u of urls) {
    try {
      const res = await fetch(u, { method: 'GET', redirect: 'manual', timeout: 3000 });
      /*
        Puppeteer E2E: click the first Rollback button, confirm modal, and verify court emptied.
        Usage:
          APP_URL=http://localhost:3005 node ./scripts/e2e-rollback.js
        Or: node ./scripts/e2e-rollback.js http://localhost:3005
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

          // Find first Rollback button
          const [rb] = await page.$x("//button[contains(normalize-space(.), 'Rollback')]");
          if (!rb) {
            console.error('No Rollback button found on page');
            await browser.close();
            process.exit(3);
          }

          console.log('Clicking Rollback button');
          await rb.click();

          // Wait for modal title
          await page.waitForSelector('#rollback-title', { visible: true });
          console.log('Rollback modal opened');

          // Optionally verify modal contents: players listed
          const modalText = await page.$eval('#rollback-title', el => el.textContent.trim());
          console.log('Modal title:', modalText);

          // Click Confirm Rollback
          const [confirmBtn] = await page.$x("//button[contains(normalize-space(.), 'Confirm Rollback')]");
          if (!confirmBtn) {
            console.error('Confirm button not found inside modal');
            await browser.close();
            process.exit(4);
          }

          /* Puppeteer E2E script (clean single copy) */

          /*
            Puppeteer E2E: click the first Rollback button, confirm modal, and verify court emptied.
            Usage:
              APP_URL=http://localhost:3005 node ./scripts/e2e-rollback.js
            Or: node ./scripts/e2e-rollback.js http://localhost:3005
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

              // Find first Rollback button
              const [rb] = await page.$x("//button[contains(normalize-space(.), 'Rollback')]");
              if (!rb) {
                console.error('No Rollback button found on page');
                await browser.close();
                process.exit(3);
              }

              console.log('Clicking Rollback button');
              await rb.click();

              // Wait for modal title
              await page.waitForSelector('#rollback-title', { visible: true });
              console.log('Rollback modal opened');

              // Optionally verify modal contents: players listed
              const modalText = await page.$eval('#rollback-title', el => el.textContent.trim());
              console.log('Modal title:', modalText);

              // Click Confirm Rollback
              const [confirmBtn] = await page.$x("//button[contains(normalize-space(.), 'Confirm Rollback')]");
              if (!confirmBtn) {
                console.error('Confirm button not found inside modal');
                await browser.close();
                process.exit(4);
              }

              console.log('Clicking Confirm Rollback');
              await confirmBtn.click();

              // Wait a bit for UI update
              await page.waitForTimeout(800);

              // Check for 'No players assigned' text to verify court emptied
              const noPlayers = await page.$x("//div[contains(., 'No players assigned')]");
              if (noPlayers.length > 0) {
                console.log('Success: found "No players assigned" on page — rollback likely applied');
                await browser.close();
                process.exit(0);
              }

              // Otherwise, check that at least one court shows no players by looking for 'Court 1' and adjacent "No players assigned"
              const courts = await page.$x("//div[contains(., 'Court')]");
              console.log('Found courts count:', courts.length);

              console.error('Could not detect court emptied state after Confirm. Inspect the page to debug.');
              await browser.close();
              process.exit(5);
            } catch (err) {
              console.error('Error during E2E run:', err);
              await browser.close();
              process.exit(10);
            }
          })();
