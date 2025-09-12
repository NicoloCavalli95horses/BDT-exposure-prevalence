//-------------------
// Import
//-------------------
import { ebus, EVENT } from './eventbus.js';
import { log, LOG_TYPE } from './utils.js';
import mongoose from 'mongoose';



//-------------------
// DBClass
//-------------------
class DB {
  constructor() {
    this.batchSchema = new mongoose.Schema({
      batch_number: {
        type: Number,
        required: true
      },
      results: {
        type: [
          {
            domain: {
              type: String,
              required: true
            },
            detected_framework: {
              type: String,
              required: true
            },
            dev_tool_enabled: {
              type: Boolean,
              required: true
            }
          }
        ],
        required: true
      }
    });

    this.models = {
      tests: mongoose.model('tests', this.batchSchema),
      domains: mongoose.model('domains', this.batchSchema),
    };
  }

  // Connect to DB
  connect = async () => {
    try {
      await mongoose.connect(`${process.env.DATABASE_URL}`);
      await log({ type: LOG_TYPE.INFO, msg: 'DB connected successfully', newline: true });
    } catch (error) {
      await log({ type: LOG_TYPE.FATAL, msg: `DB connection error: ${error}`, newline: true });
      process.exit(1);
    }
  };

  // Save to DB
  save = async (data) => {
    const collectionName = process.env.TEST_MODE ? 'tests' : 'domains';
    const model = this.models[collectionName];

    try {
      await model.create(data);
      await log({ type: LOG_TYPE.INFO, msg: `Batch results saved to db successfully` });
    } catch (error) {
      await log({ type: LOG_TYPE.ERROR, msg: `DB saving error: ${error}` });
    }

    ebus.emit(EVENT.BATCH_SAVED);
  }

  // Disconnect from DB
  disconnect = async () => {
    try {
      await mongoose.connection.close()
      await log({ type: LOG_TYPE.INFO, msg: 'DB disconnected successfully' });
    } catch (error) {
      await log({ type: LOG_TYPE.FATAL, msg: `DB disconnection error: ${error}` });
      process.exit(1);
    }
    ebus.emit(EVENT.DB_DONE);
  }
}


//-------------------
// Consts
//-------------------
const db = new DB();
ebus.on(EVENT.CONNECT_DB, db.connect);
ebus.on(EVENT.SAVE_DB, db.save);
ebus.on(EVENT.MAIN_DONE, db.disconnect);
