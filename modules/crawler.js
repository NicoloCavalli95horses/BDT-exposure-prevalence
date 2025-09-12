//----------------
// Import
//----------------
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

import { ebus, EVENT } from './eventbus.js';
import { GLOBAL_CONFIG } from './config.js';
import { LOG_TYPE, log, getExtensionFullPath } from './utils.js';
import { fileURLToPath } from 'url';



//----------------
// Consts
//----------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const log_path = path.join(__dirname, '../output/log.txt');
const evaluate_path = path.join(__dirname, './evaluate.js');

const local_extensions = await getExtensionFullPath(process.env.CHROME_EXTENSIONS_PATH);

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
    await fs.writeFile(log_path, ''); // clean log

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


  classToString = async (path) => {
    return await fs.readFile(path, 'utf-8');
  }


  injectClassIntoPageCtx = async (page) => {
    try {
      const str = await this.classToString(evaluate_path);
      await page.evaluateOnNewDocument(`${str} window.__privEvaluator = Evaluator;`);
    } catch (error) {
      await log({ type: LOG_TYPE.ERROR, msg: `Failed to inject "__privEvaluator" class: ${error}` });
    }
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


  optimizePage = async (page) => {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      // Prevent image, stylesheet, font and media from being loaded by the browser to save time
      const resourceType = req.resourceType();
      const blocked = ['image', 'stylesheet', 'font', 'media'];
      blocked.includes(resourceType) ? req.abort() : req.continue();
    });
  }


  processEntry = async (domain) => {
    let page = undefined;

    // Check target
    if (!domain) {
      await log({ type: LOG_TYPE.ERROR, msg: `Batch ${this.batch.batch_number} processing error: empty object` });
    }

    try {
      // Browse to domain
      page = await this.browser.newPage();
      await this.optimizePage(page);
      await this.injectClassIntoPageCtx(page);
      await this.handleNavigation(domain, page);
      // Evaluate domain
      const result = await this.evaluateDomain(domain, page);
      // Update batch result
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


  handleNavigation = async (domain, page) => {
    const MAX_ATTEMPTS = GLOBAL_CONFIG.MAX_NAVIGATION_ATTEMPTS;
    const TIMEOUT = GLOBAL_CONFIG.TIMEOUT;
    const protocols = ['https', 'http'];
    let last_error = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      for (const protocol of protocols) {
        const baseUrl = `${protocol}://${domain}`;
        try {
          await log({ type: LOG_TYPE.INFO, msg: `Attempt ${attempt}/${MAX_ATTEMPTS}: Navigating to ${baseUrl}` });
          await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: TIMEOUT });
          await log({ type: LOG_TYPE.INFO, msg: `Successfully navigated to ${baseUrl}` });
          return;
        } catch (error) {
          last_error = error;
          const errorMsg = error.message || '';
          const isNetError = errorMsg.startsWith('net::');
          const isTimeout = errorMsg.includes('TimeoutError');

          await log({
            type: LOG_TYPE.WARNING,
            msg: `Error navigating to ${baseUrl} (Attempt ${attempt}/${MAX_ATTEMPTS}): ${errorMsg}`
          });

          // If not retryable, quit all
          if (!isTimeout && !isNetError) {return};
        }
      }
    }
  };



  evaluateDomain = async (domain, page) => {
    // Evaluate domain
    const result = await page.evaluate(() => {
      const evaluator = new window.__privEvaluator();
      return evaluator.getResults();
    });
    await log({ type: LOG_TYPE.RESULT, msg: `[DOMAIN]: ${domain}, [JS FRAMEWORK]: ${result.detected_framework}, [DEV TOOLS ENABLED]: ${result.dev_tool_enabled}` });
    return result;
  }
}







