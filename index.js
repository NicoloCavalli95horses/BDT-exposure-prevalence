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
import './modules/service.js';
import './modules/db.js';


//----------------
// Consts
//----------------
let browser;
let jobEnded = false;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, './output/log.txt');
const MAX_TAB = 5;
const queue = [];

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
      '--disable-dev-shm-usage',
      '--disable-dev-tools',
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
  // Update batch
  batch.number = ev.number;
  batch.content = ev.content;
  await log({ type: LOG_TYPE.INFO, msg: `Processing batch ${batch.number}`, newline: true });

  // Process batch entries
  for (let i = 0; i < batch.content.length; i++) {
    const target = batch.content[i];
    const res = await processEntry(target);
    if (!res) { continue; }
  }

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


async function processEntry(target) {
  try {
    // Check target
    if (!target) {
      await log({ type: LOG_TYPE.ERROR, msg: `Batch ${batch.number} processing error: empty object` });
      return false;
    }
  
    // Browse to target domain
    const url = `https://${target.domain}`;
    await log({ type: LOG_TYPE.INFO, msg: `Navigate to ${url}` });
    const page = await browser.newPage();
    await optimizePage(page);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

    // Evaluate target domain
    const result = await page.evaluate(evaluatePage);
    await log({ type: LOG_TYPE.RESULT, msg: `[JS FRAMEWORK]: ${result.detected_framework}, [DEV TOOLS ENABLED]: ${result.dev_tool_enabled}` });
    
    if (result) {
      batch.results.push(result);
    }

    // Close current page
    await page.close();

    return true;

  } catch (err) {
    await log({ type: LOG_TYPE.ERROR, msg: `${target.domain}: ${err.message}` });
    return false;
  }
}