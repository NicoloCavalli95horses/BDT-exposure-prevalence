//-------------------
// Import
//-------------------



//-------------------
// Consts
//-------------------
export const GLOBAL_CONFIG = Object.freeze({
  MIN_SUCCESSES: 100,        // Unaccessible domains are discarted until N domains are successfully analized. May be higher depending on the batch size and on the number of tabs
  MAX_TABS: 5,               // Opened at the same time on Puppeteer
  BATCH_SIZE: 10,            // Size of the group of domains to analyze. Failure rate is first calculated per batch
  TIMEOUT: 15000,            // Waiting limit
  MAX_NAVIGATION_ATTEMPTS: 3 // For each protocol ['http', 'https']
});
