//-------------------
// Import
//-------------------
import { EventEmitter } from 'events';


//-------------------
// Consts
//-------------------
export const ebus = new EventEmitter();

export const EVENT = Object.freeze({
  START: 'start',             // [job start] launch puppeteer
  BATCH_READY: 'batch-ready', // [batch ready] process current batch, stop reading CSV
  BATCH_NEXT: 'batch-next',   // [next batch request] current batch processed, resume reading CSV
  SAVE_DB: 'save-db',         // [save to db]
  BATCH_SAVED: 'batch-saved', // [current batch successfully saved]
  DONE: 'done',               // [job finished] close puppeteer
  RUN_TEST: 'run-test',       // [test] run Jest to validate test results
});