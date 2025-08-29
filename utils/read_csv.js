//-------------------
// Import
//-------------------
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { ebus, EVENT } from './eventbus.js';
import { fileURLToPath } from 'url';



//-------------------
// Consts
//-------------------
const FILE_PATH = '../assets/test.csv';
const BATCH_SIZE = 100;
let results = [];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, FILE_PATH);
const stream = fs.createReadStream(csvPath).pipe(csv( {headers: ['id', 'domain']} ));

// Start process when browser is ready
ebus.on(EVENT.START, onStart);



function onStart() {
  stream.on('data', (data) => {
    results.push(data);

    if (results.length === BATCH_SIZE) {
      stream.pause();
      ebus.emit(EVENT.BATCH_READY, [...results]);
      results = [];
    }
  });



  ebus.on(EVENT.BATCH_PROCESSED, () => {
    stream.resume();
  });



  stream.on('end', () => {
    if (results.length > 0) {
      ebus.emit(EVENT.BATCH_READY, [...results]);
    }
    // End process
    ebus.emit(EVENT.DONE);
  });
}
