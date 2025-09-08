//----------------
// Import
//----------------
import puppeteer from 'puppeteer';
import './utils/read_csv.js'; // executed first
import { ebus, EVENT } from './utils/eventbus.js';
import { detectEnabledBrowserDevTool } from './utils/detect_bdt.js';
import { LOG_TYPE, log, optimizePage } from './utils/utils.js';


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
    headless: false, // mandatory to use browser extensions
    executablePath: process.env.CHROME_PATH,
    pipe: true,
    enableExtensions: [process.env.REACT_DEV_TOOL_PATH],
    args: [
      '--no-sandbox',
      `--load-extension='${process.env.REACT_DEV_TOOL_PATH}'`,
      '--disable-gpu',
      '--start-minimized',
      '--disable-software-rasterizer',
      '--disable-accelerated-2d-canvas',
      '--disable-dev-shm-usage',
      '--disable-dev-tools',
      '--disable-infobars',
    ],
  });

  await log({ type: LOG_TYPE.INFO, msg: 'Browser launched successfully' });
  ebus.emit(EVENT.START); // start reading CSV when browser is ready
}



function onEndJob() {
  jobEnded = true;
}



async function closeBrowser() {
  await browser.close();
  await log({ type: LOG_TYPE.INFO, msg: 'Browser closed successfully' });
}



async function onBatchReady(ev) {
  for (let i = 0; i < ev.length; i++) {
    const target = ev[i];

    // Check target
    if (!target) {
      await log({ type: LOG_TYPE.ERROR, msg: "Batch processing error. Empty object" });
    }

    try {
      // Browse to target domain
      const url = `https://${target.domain}`;
      await log({ type: LOG_TYPE.INFO, msg: `Navigate to ${url}` });
      const page = await browser.newPage();
      await optimizePage(page);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

      // Evaluate target domain
      const results = await page.evaluate(detectEnabledBrowserDevTool);

      // Save results
      // [TO DO]

      // Close current page
      await page.close();

    } catch (err) {
      await log({ type: LOG_TYPE.ERROR, msg: `${target.domain}: ${err.message}` });
      continue;
    }
  }

  if (jobEnded) {
    // Close the browser after the last batch has been processed
    closeBrowser();
  }
}

