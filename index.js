//----------------
// Import
//----------------
import puppeteer from 'puppeteer';
import './utils/read_csv.js'; // executed first
import { ebus, EVENT } from './utils/eventbus.js';



//----------------
// Consts
//----------------
let browser;
let jobEnded = false;

ebus.on(EVENT.BATCH_READY, onBatchReady);
ebus.on(EVENT.DONE, onEndJob);


launchtBrowser();

//----------------
// Function
//----------------
async function launchtBrowser() {
  browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
    ],
    // dumpio: true, // debug log
  });
  console.log('[START] Browser launched successfully.\n');
  ebus.emit(EVENT.START); // start reading CSV when browser is ready
}

function onEndJob() {
  jobEnded = true;
}

async function closeBrowser() {
  await browser.close();
  console.log('\n[END] Browser closed successfully.');
}


async function onBatchReady(ev) {
  for (let i = 0; i < ev.length; i++) {
    const target = ev[i];

    // Check target
    if (!target) {
      console.error('[BATCH PROCESSING ERROR] empty object');
    }

    try {
      const url = `https://${target.domain}`;
      console.log(`[NAVIGATE] ${url}`);

      const page = await browser.newPage();

      await page.goto('about:blank');
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

      console.log('loaded', await page.title())

      // const rdt = await page.evaluate(() => {
      //   // undefined: puppetteer does not have react dev tool installed
      //   return window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.rendererInterfaces;
      // });
      // console.log(`[React Dev Tool]: ${!!rdt}`);

    } catch (err) {
      console.error(`[ERROR] ${target.domain}: ${err.message}`);
      continue;
    }
  }

  if (jobEnded) {
    // Close the browser after the last batch has been processed
    closeBrowser();
  }
}

