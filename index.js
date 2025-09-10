//----------------
// Import
//----------------
import puppeteer from 'puppeteer';
import { ebus, EVENT } from './modules/eventbus.js';
import { evaluatePage } from './modules/evaluate.js';
import { LOG_TYPE, log, optimizePage } from './modules/utils.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GLOBAL_CONFIG } from './modules/config.js';
import './modules/service.js';
import './modules/db.js';


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
ebus.on(EVENT.READ_DONE, onEndJob);
ebus.on(EVENT.BATCH_SAVED, onNextJob);
ebus.emit(EVENT.CONNECT_DB);

launchBrowser();



//----------------
// Function
//----------------
async function launchBrowser() {
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
      '--disable-infobars',
    ],
  });

  await log({ type: LOG_TYPE.INFO, msg: 'Browser launched successfully' });
  ebus.emit(EVENT.START);
}



function onEndJob() {
  jobEnded = true;
}



async function closeBrowser() {
  await browser.close();
  await log({ type: LOG_TYPE.INFO, msg: 'Browser closed successfully', newline: true });
  ebus.emit(EVENT.MAIN_DONE);
}



async function onNextJob() {
  await log({ type: LOG_TYPE.INFO, msg: `Batch completed ${batch.number}, requesting batch ${batch.number + 1}` });
  ebus.emit(EVENT.BATCH_NEXT);
}



async function onBatchReady(ev) {
  let active_tab = [];

  // Update batch
  batch.number = ev.number;
  batch.content = ev.content;
  await log({ type: LOG_TYPE.INFO, msg: `Processing batch ${batch.number}`, newline: true });

  // Process batch entries
  for (let i = 0; i < batch.content.length; i++) {
    const target = batch.content[i];

    const tab_count = await browser.pages()?.length || 0;

    if (tab_count < GLOBAL_CONFIG.MAX_TABS) {
      const entry_promise = processEntry(target.domain);
      active_tab.push(entry_promise);

      entry_promise.then(() => {
        // Remove from the active tab
        active_tab = active_tab.filter(p => p !== entry_promise);
      })
    } else {
      // Wait for a tab to free
      await Promise.race(active_tab);
    }
  }

  // Wait for all the promises to complete
  await Promise.all(active_tab);
  await log({ type: LOG_TYPE.INFO, msg: `Batch ${batch.number} processed successfully` });

  // Save batch results
  if (batch.results.length) {
    ebus.emit(EVENT.SAVE_DB, {...batch});
    batch.content = [];
    batch.results = [];
  }

  // Close the browser after the last batch has been processed
  if (jobEnded) {
    closeBrowser();
  }
}


async function processEntry(domain) {
  let page = undefined;
  try {
    // Check target
    if (!domain) {
      await log({ type: LOG_TYPE.ERROR, msg: `Batch ${batch.number} processing error: empty object` });
    }
  
    // Browse to domain
    const url = `https://${domain}`;
    await log({ type: LOG_TYPE.INFO, msg: `Navigate to ${url}` });
    page = await browser.newPage();
    await optimizePage(page);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

    // Evaluate domain
    const result = await page.evaluate(evaluatePage);
    await log({ type: LOG_TYPE.RESULT, msg: `[DOMAIN]: ${url}, [JS FRAMEWORK]: ${result.detected_framework}, [DEV TOOLS ENABLED]: ${result.dev_tool_enabled}` });
    
    if (result) {
      batch.results.push(result);
    }

  } catch (err) {
    await log({ type: LOG_TYPE.ERROR, msg: `${domain}: ${err.message}` });
  } finally {
    // Resolve promise and close current tab
    await page.close();
  }
}