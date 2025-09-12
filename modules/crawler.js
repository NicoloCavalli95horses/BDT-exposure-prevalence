//----------------
// Import
//----------------
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

import { ebus, EVENT } from './eventbus.js';
import { evaluatePage } from './evaluate.js';
import { GLOBAL_CONFIG } from './config.js';
import { LOG_TYPE, log, optimizePage } from './utils.js';
import { fileURLToPath } from 'url';



//----------------
// Consts
//----------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, '../output/log.txt');
const local_extensions = [
  process.env.REACT_DEV_TOOL_PATH,
  process.env.VUE_DEV_TOOL_PATH,
  process.env.ANGULAR_DEV_TOOL_PATH,
  process.env.SVELTE_DEV_TOOL_PATH,
]


//----------------
// Crawler Class
//----------------
export class Crawler {
  constructor() {
    this.browser = undefined;
    this.job_ended = false;
    this.batch = {
      batch_number: 0,
      content: [],
      results: [],
    };
  }


  launchBrowser = async () => {
    await fs.writeFile(LOG_PATH, ''); // clean log

    this.browser = await puppeteer.launch({
      headless: false, // mandatory to use browser extensions
      executablePath: process.env.CHROME_PATH,
      pipe: true,
      enableExtensions: local_extensions,
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
    await log({ type: LOG_TYPE.CONFIG, msg: JSON.stringify(GLOBAL_CONFIG) });
    ebus.emit(EVENT.START);
  }

  onEndJob = () => {
    this.job_ended = true;
  }


  closeBrowser = async () => {
    await this.browser.close();
    await log({ type: LOG_TYPE.INFO, msg: 'Browser closed successfully', newline: true });
    ebus.emit(EVENT.MAIN_DONE);
  }

  onNextJob = async () => {
    await log({ type: LOG_TYPE.INFO, msg: `Batch completed ${this.batch.batch_number}, requesting batch ${this.batch.batch_number + 1}` });
    ebus.emit(EVENT.BATCH_NEXT);
  }


  onBatchReady = async (ev) => {
    let active_tab = [];

    // Update batch
    this.batch.batch_number = ev.batch_number;
    this.batch.content = ev.content;
    await log({ type: LOG_TYPE.INFO, msg: `Processing batch ${this.batch.batch_number}`, newline: true });

    // Process batch entries
    for (let i = 0; i < this.batch.content.length; i++) {
      const target = this.batch.content[i];

      if (active_tab.length < GLOBAL_CONFIG.MAX_TABS) {
        const entry_promise = this.processEntry(target.domain);
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
    await log({ type: LOG_TYPE.INFO, msg: `Batch ${this.batch.batch_number} processed successfully` });

    // Save batch results
    if (this.batch.results.length) {
      delete this.batch.content;
      ebus.emit(EVENT.SAVE_DB, this.batch);
      this.batch.content = [];
      this.batch.results = [];
    }

    // Close the browser after the last batch has been processed
    if (this.job_ended) {
      this.closeBrowser();
    }
  }


  processEntry = async (domain) => {
    let page = undefined;

    // Check target
    if (!domain) {
      await log({ type: LOG_TYPE.ERROR, msg: `Batch ${this.batch.batch_number} processing error: empty object` });
    }

    try {
      // Browse to domain
      const url = `https://${domain}`;
      await log({ type: LOG_TYPE.INFO, msg: `Navigate to ${url}` });
      page = await this.browser.newPage();
      await optimizePage(page);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: GLOBAL_CONFIG.TIMEOUT });

      // Evaluate domain
      const result = await page.evaluate(evaluatePage);
      await log({ type: LOG_TYPE.RESULT, msg: `[DOMAIN]: ${url}, [JS FRAMEWORK]: ${result.detected_framework}, [DEV TOOLS ENABLED]: ${result.dev_tool_enabled}` });
      if (result) {
        this.batch.results.push({ domain, ...result });
      }

    } catch (err) {
      await log({ type: LOG_TYPE.ERROR, msg: `${domain}: ${err.message}` });
    } finally {
      // Resolve promise and close current tab
      await page.close();
    }
  }
}







