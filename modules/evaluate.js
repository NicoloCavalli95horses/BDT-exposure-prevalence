//-------------------
// Import
//-------------------



//-------------------
// Consts
//-------------------



//-------------------
// Functions
//-------------------

// This function is injected in the browser context by Puppetteer and serialized to be executed client-side
// Importing other modules is not possible here
export async function evaluatePage() {
  const REACT = 'react';
  const ANGULAR = 'angular';
  const VUE = 'vue';
  const SVELTE = 'svelte';
  let enabled = false;

  const isReact = () => {
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      for (const key in el) {
        if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
          return true;
        }
      }
    }
    return false;
  }

  const isVue = () => {
    return Array.from(document.querySelectorAll('[data-v-app]')).length || !!document.querySelector('#app')?.__vue_app__
  };

  const isAngular = () => { 
    return !!document.querySelector('app-root');
   };
  
  const isSvelte = () => { 
    
   };
  
  const framework = isReact() ? REACT
    : isVue() ? VUE
      : isAngular() ? ANGULAR
        : isSvelte() ? SVELTE
          : null;

  if (framework === REACT) {
    enabled = !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.rendererInterfaces?.get(1);
  } else if (framework === ANGULAR) {
    enabled = false;
  } else if (framework === VUE) {
    enabled = window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.enabled;
  } else if (framework === SVELTE) {
    enabled = false;
  }

  return {
    detected_framework: framework,
    dev_tool_enabled: enabled,
  }
}
