//-------------------
// Import
//-------------------
import { EventEmitter } from 'events';


//-------------------
// Consts
//-------------------
export const ebus = new EventEmitter();

export const EVENT = Object.freeze({
  START: 'start',                    // [job start] launch puppeteer
  BATCH_READY: 'batchReady',         // process current batch, stop reading CSV
  BATCH_PROCESSED: 'batchProcessed', // current batch processed, resume reading CSV
  DONE: 'done',                      // [job finished] close puppeteer
});