//-------------------
// Import
//-------------------
import { log } from "./utils.js";

//-------------------
// Consts
//-------------------


//-------------------
// Functions
//-------------------
export async function detectEnabledBrowserDevTool() {
  const REACT = 'react';
  const ANGULAR = 'angular';
  const VUE = 'vue';
  const SVELTE = 'svelte';

  const framework = () => {
    const isReact = !!Array.from(document.body.querySelectorAll("*")).find((node) => node._reactRootContainer);
    const isAngular = false; //to do
    const isVue = false;
    const isSvelte = false;

    return isReact ? REACT
      : isVue ? VUE
        : isAngular ? ANGULAR
          : isSvelte ? SVELTE
            : undefined;
  };

  const f = framework();
  const enabled = false;

  if (f === REACT) {
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook && hook.rendererInterfaces) {
      enabled = [...hook.rendererInterfaces.values()].some(renderer => renderer != null);
    };
  } else if (f === ANGULAR) {

  } else if (f === VUE) {

  } else if (f === SVELTE) {

  }

  await log({ type: LOG_TYPE.RESULT, msg: `[JS FRAMEWORK]: ${framework}, [DEV TOOLS ENABLED]: ${enabled}` });
}
