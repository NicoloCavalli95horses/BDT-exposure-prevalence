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
  CONNECT_DB: 'connect-db',   // [connect to db]
  SAVE_DB: 'save-db',         // [save to db]
  BATCH_SAVED: 'batch-saved', // [current batch successfully saved]
  READ_DONE: 'read-done',     // [reading job finished]
  MAIN_DONE: 'main-done',     // [closing puppeteer]
  DB_DONE: 'db-done',         // [closing db]
});