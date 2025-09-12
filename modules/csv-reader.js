//-------------------
// Import
//-------------------
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { ebus, EVENT } from './eventbus.js';
import { fileURLToPath } from 'url';
import { GLOBAL_CONFIG } from './config.js';



//-------------------
// Consts
//-------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



//-------------------
// CSVReader Class
//-------------------
class CSVReader {
  constructor() {
    this.file_path = `../assets/${process.env.TEST_MODE ? 'test' : 'top-1m'}.csv`;
    this.csv_path = path.join(__dirname, this.file_path);
    this.batch_number = 0;
    this.results = [];
    this.stream = fs.createReadStream(this.csv_path).pipe(csv({ headers: ['id', 'domain'] }));
  }

  onStart = () => {
    this.stream.on('data', (data) => {
      this.results.push(data);

      if (this.results.length === GLOBAL_CONFIG.BATCH_SIZE) {
        this.stream.pause();
        this.batch_number++;
        ebus.emit(EVENT.BATCH_READY, { batch_number: this.batch_number, content: [...this.results] });
        this.results = [];
      }
    });

    ebus.on(EVENT.BATCH_NEXT, () => {
      this.stream.resume();
    });

    this.stream.on('end', () => {
      if (this.results.length > 0) {
        this.batch_number++;
        ebus.emit(EVENT.BATCH_READY, { batch_number: this.batch_number, content: [...this.results] });
        this.results = [];
      }
      ebus.emit(EVENT.READ_DONE);
    });
  }
}


//-------------------
// Usage
//-------------------
const csv_reader = new CSVReader();
ebus.on(EVENT.START, csv_reader.onStart);