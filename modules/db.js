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


//-------------------
// Functions
//-------------------
async function connectDB() {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.DATABASE_URL}`);
    await log({ type: LOG_TYPE.INFO, msg: 'DB connected successfully', newline: true });
  } catch (error) {
    await log({ type: LOG_TYPE.FATAL, msg: `DB connection error: ${error}`, newline: true });
    process.exit(1);
  }
};



async function test() {
  // data schema must be defined
  const testSchema = new mongoose.Schema({
    test: { type: Boolean, required: true }
  });

  // define which schema you want to use
  const TestModel = mongoose.model('Test', testSchema);
  // add new data
  await TestModel.create({ test: true });
}



function onSaveEvent() {
  if (process.env.TEST_MODE) {
    // [TODO]: save on local JSON
  } else {
    // [TODO]: save on db
  }
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