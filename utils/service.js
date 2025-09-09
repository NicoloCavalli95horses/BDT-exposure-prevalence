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
const FILE_PATH = `../assets/${process.env.TEST_MODE ? 'test' : 'top-1m'}.csv`;
const BATCH_SIZE = 100;
let number = 0;
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
      number++;
      ebus.emit(EVENT.BATCH_READY, {number, content: [...results]} );
      results = [];
    }
  });



  ebus.on(EVENT.BATCH_NEXT, () => {
    stream.resume();
  });



  stream.on('end', () => {
    if (results.length > 0) {
      number++;
      ebus.emit(EVENT.BATCH_READY, {number, content: [...results]});
      results = [];
    }
    // End process
    ebus.emit(EVENT.DONE);
  });
}
