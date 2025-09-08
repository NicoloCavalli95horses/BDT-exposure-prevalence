
//-------------------
// Import
//-------------------
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';


//-------------------
// Consts
//-------------------
export const LOG_TYPE = Object.freeze({
  DEBUG: 'debug',   // extra information for debug
  INFO: 'info',     // application status
  RESULT: 'result', // analysis result
  WARN: 'warn',     // potential error
  ERROR: 'error',   // handled error that requires attention
  FATAL: 'fatal',   // fatal error that blocks execution
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, '../output/log.txt');



//-------------------
// Functions
//-------------------
export async function optimizePage(page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    // Prevent image, stylesheet, font and media from being loaded by the browser to save time
    const resourceType = req.resourceType();
    const blocked = ['image', 'stylesheet', 'font', 'media'];
    if (blocked.includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });
}


export async function log( {type, msg} ) {
  const timestamp = new Date().toISOString();
    try {
    await fs.appendFile(LOG_PATH, `[${timestamp}] [${type}]: ${msg}\n`);
  } catch (err) {
    console.error(`${LOG_TYPE.ERROR}. Unable to write log`, err);
  }
}