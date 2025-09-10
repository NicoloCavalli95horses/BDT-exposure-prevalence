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
// Importing external modules is not possible here
export async function evaluatePage() {
  const REACT = 'react';
  const ANGULAR = 'angular';
  const VUE = 'vue';
  const SVELTE = 'svelte';
  const EMBER = 'ember';
  let dev_tool_enabled = false;

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
    return !!window.__svelte && !!document.querySelectorAll('[class*="svelte-"]').length;
  };

  const isEmber = () => {
    return false;
  }

  const detected_framework = isReact() ? REACT
    : isVue() ? VUE
      : isAngular() ? ANGULAR
        : isSvelte() ? SVELTE
          : isEmber() ? EMBER
            : 'unknown';

  switch (detected_framework) {
    case REACT:
      // Not disabled by default in production
      dev_tool_enabled = !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.rendererInterfaces?.get(1);
      break;

    case ANGULAR:
      // Disabled by default in production
      dev_tool_enabled = !!window.ng;
      break;

    case VUE:
      // Disabled by default in production
      dev_tool_enabled = window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.dev_tool_enabled;
      break;

    case SVELTE:
      // Svelte Dev Tool is currently not supported on v.5. Still, we can assess existing websites using deprecated versions
      dev_tool_enabled = !!window.__SVELTE_DEVTOOLS_GLOBAL_HOOK__?.svelte?.components[0];
      break;

    case EMBER:
      // [TO-DO]
      dev_tool_enabled = false;
      break;

    default:
      dev_tool_enabled = false;
      break;
  }

  return { detected_framework, dev_tool_enabled }
}
