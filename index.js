//----------------
// Import
//----------------
import { ebus, EVENT } from './modules/eventbus.js';
import { Crawler } from './modules/crawler.js';
import './modules/csv-reader.js';
import './modules/db.js';


//----------------
// Consts
//----------------
ebus.emit(EVENT.CONNECT_DB);

const crawler = new Crawler();
crawler.launchBrowser();

ebus.on(EVENT.BATCH_READY, crawler.onBatchReady);
ebus.on(EVENT.READ_DONE, crawler.onEndJob);
ebus.on(EVENT.BATCH_SAVED, crawler.onNextJob);
