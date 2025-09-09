//----------------
// Import
//----------------
import puppeteer from 'puppeteer';
import './utils/service.js'; // executed first
import './test/results.test.js'; // executed in test mode
import { ebus, EVENT } from './utils/eventbus.js';
import { evaluatePage } from './utils/evaluate.js';
import { LOG_TYPE, log, optimizePage } from './utils/utils.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';



//----------------
// Consts
//----------------
let browser;
let jobEnded = false;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, './output/log.txt');

const batch = {
  number: 0,
  content: [],
  results: [],
};

ebus.on(EVENT.BATCH_READY, onBatchReady);
ebus.on(EVENT.DONE, onEndJob);
ebus.on(EVENT.BATCH_SAVED, onNextJob);


launchtBrowser();



//----------------
// Function
//----------------
async function launchtBrowser() {
  await fs.writeFile(LOG_PATH, ''); // clean log

  browser = await puppeteer.launch({
    headless: false, // mandatory to use browser extensions
    executablePath: process.env.CHROME_PATH,
    pipe: true,
    enableExtensions: [
      process.env.REACT_DEV_TOOL_PATH,
      process.env.VUE_DEV_TOOL_PATH,
      process.env.ANGULAR_DEV_TOOL_PATH,
      process.env.SVELTE_DEV_TOOL_PATH,
    ],
    args: [
      '--no-sandbox',
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
  await log({ type: LOG_TYPE.INFO, msg: 'Browser closed successfully', newline: true });
}



async function onNextJob() {
  await log({ type: LOG_TYPE.INFO, msg: `Batch completed ${batch.number}, requesting batch ${batch.number + 1}` });
  ebus.emit(EVENT.BATCH_NEXT);
}



async function onBatchReady(ev) {
  batch.number = ev.number;
  batch.content = ev.content;
  await log({ type: LOG_TYPE.INFO, msg: `Processing batch ${batch.number}`, newline: true });

  for (let i = 0; i < batch.content.length; i++) {
    const target = batch.content[i];

    // Check target
    if (!target) {
      await log({ type: LOG_TYPE.ERROR, msg: `Batch ${batch.number} processing error: empty object` });
    }

    try {
      // Browse to target domain
      const url = `https://${target.domain}`;
      await log({ type: LOG_TYPE.INFO, msg: `Navigate to ${url}` });
      const page = await browser.newPage();
      await optimizePage(page);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

      // Evaluate target domain
      const result = await page.evaluate(evaluatePage);
      await log({ type: LOG_TYPE.RESULT, msg: `[JS FRAMEWORK]: ${result.detected_framework}, [DEV TOOLS ENABLED]: ${result.dev_tool_enabled}` });
      batch.results.push(result);

      // Close current page
      await page.close();

    } catch (err) {
      await log({ type: LOG_TYPE.ERROR, msg: `${target.domain}: ${err.message}` });
      continue;
    }
  }

  await log({ type: LOG_TYPE.INFO, msg: `Batch ${batch.number} processed successfully` });

  if (batch.results.length) {
    // Save batch results
    ebus.emit(EVENT.SAVE_DB, batch);
    batch.content = [];
    batch.results = [];
  }

  if (jobEnded) {
    // Close the browser after the last batch has been processed
    closeBrowser();
  }
}

