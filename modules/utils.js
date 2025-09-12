
//-------------------
// Import
//-------------------
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';


//-------------------
// Consts
//-------------------
export const LOG_TYPE = Object.freeze({
  DEBUG: 'debug',   // extra information for debug
  INFO: 'info',     // application status
  RESULT: 'result', // analysis result
  WARN: 'warn',     // potential error
  ERROR: 'error',   // handled error that requires attention
  FATAL: 'fatal',   // fatal error that blocks execution
  CONFIG: 'config'  // config info
});

const EXTENSION_ID = Object.freeze({
  react: "fmkadmapgofadopljbjfkapdkoienihi",
  angular: "ienfalfjdbdpebioblfackkekamfmbnh",
  vue: "nhdogjmejiglipccpnnnanhbledajbpd",
  svelte: "kfidecgcdjjfpeckbblhmfkhmlgecoff",
})

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const log_path = path.join(__dirname, '../output/log.txt');



//-------------------
// Functions
//-------------------
export async function log( {type, msg, newline} ) {
  const timestamp = new Date().toISOString();
    try {
    await fs.appendFile(log_path, `${newline ? '\n' : ''}[${timestamp}] [${type}]: ${msg}\n`);
  } catch (err) {
    console.error(`${LOG_TYPE.ERROR}. Unable to write log`, err);
  }
}


export async function getExtensionFullPath(basePath) {
  const paths = [];
  const extensionIds = Object.values(EXTENSION_ID);

  const readDir = async (extensionPath) => {
    try {
      const entries = await fs.readdir(extensionPath, { withFileTypes: true });
      const folders = entries.filter(dirent => dirent.isDirectory());
      if (folders.length === 1) {
        const fullPath = path.join(extensionPath, folders[0].name);
        return fullPath;
      } else {
        await log({
          type: LOG_TYPE.ERROR,
          msg: `${folders.length} folder(s) found in ${extensionPath}. Expected exactly 1.`,
        });
        return null;
      }
    } catch (error) {
      await log({
        type: LOG_TYPE.ERROR,
        msg: `Directory reading error at ${extensionPath}: ${error.message}`,
      });
      return null;
    }
  };

  // Usa for...of per gestire async/await in modo corretto
  for (const id of extensionIds) {
    const extensionPath = path.join(basePath, id);
    const resolvedPath = await readDir(extensionPath);
    paths.push(resolvedPath);
  }

  return paths;
}

