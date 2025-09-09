//-------------------
// Import
//-------------------
import { ebus, EVENT } from './eventbus.js';



//-------------------
// Consts
//-------------------
ebus.on(EVENT.SAVE_DB, onSaveEvent);



//-------------------
// Functions
//-------------------
function onSaveEvent() {
  if (process.env.TEST_MODE) {
    // [TODO]: save on local JSON
  } else {
    // [TODO]: save on db
  }
}