//-------------------
// Import
//-------------------
import { ebus, EVENT } from './eventbus.js';
import { log, LOG_TYPE } from './utils.js';
import mongoose from 'mongoose';



//-------------------
// Consts
//-------------------
ebus.on(EVENT.CONNECT_DB, connectDB);
ebus.on(EVENT.SAVE_DB, onSaveEvent);
ebus.on(EVENT.MAIN_DONE, onMainDone);


const batchSchema = new mongoose.Schema({
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



//-------------------
// Functions
//-------------------
async function connectDB() {
  try {
    await mongoose.connect(`${process.env.DATABASE_URL}`);
    await log({ type: LOG_TYPE.INFO, msg: 'DB connected successfully', newline: true });
  } catch (error) {
    await log({ type: LOG_TYPE.FATAL, msg: `DB connection error: ${error}`, newline: true });
    process.exit(1);
  }
};



async function saveToDB( {data, collectionName, schema} ) {
  const model = mongoose.model(collectionName, schema);

  try {
    await model.create(data);
    await log({ type: LOG_TYPE.INFO, msg: `Batch results saved to db successfully` });
  } catch (error) {
    await log({ type: LOG_TYPE.ERROR, msg: `DB saving error: ${error}` });
  }
}



async function onSaveEvent(data) {
  const collectionName = process.env.TEST_MODE ? 'tests' : 'domains';
  await saveToDB({data, collectionName, schema: batchSchema});
  ebus.emit(EVENT.BATCH_SAVED);
}


async function onMainDone() {
  try {
    await mongoose.connection.close()
    await log({ type: LOG_TYPE.INFO, msg: 'DB disconnected successfully'});
  } catch (error) {
    await log({ type: LOG_TYPE.FATAL, msg: `DB disconnection error: ${error}`});
    process.exit(1);
  }
  ebus.emit(EVENT.DB_DONE);
}