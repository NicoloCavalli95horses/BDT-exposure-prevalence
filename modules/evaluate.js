//-------------------
// Import
//-------------------



//-------------------
// Consts
//-------------------
const REACT = 'react';
const ANGULAR = 'angular';
const VUE = 'vue';
const SVELTE = 'svelte';
const EMBER = 'ember';



//-------------------
// Functions
//-------------------

// This function is injected in the browser context by Puppetteer and serialized to be executed client-side
// Importing external modules is not possible here
class Evaluator {
  constructor() {
    this.dev_tool_enabled = false;
    this.detected_framework = [];
  }

  isReact = () => {
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


  isVue = () => {
    return Array.from(document.querySelectorAll('[data-v-app]')).length || !!document.querySelector('#app')?.__vue_app__
  };


  isAngular = () => {
    return !!document.querySelector('app-root');
  };


  isSvelte = () => {
    return !!window.__svelte && !!document.querySelectorAll('[class*="svelte-"]').length;
  };


  isEmber = () => {
    return !!window.emberAutoImportDynamic || !!window.EmberInspector;
  }


  detectClientFramework = () => {
    // Surprisingly, in certain cases multiple JS frameworks are used at the same time (mostly to let third-parties handle cookie banners or ads, see https://stackoverflow.com/questions/65694921/can-i-use-multiple-frameworks-on-a-single-website-page)
    // (e.g: https://mail.ru/, with React and Svelte)

    const ret = [
      this.isReact() ? REACT : '',
      this.isVue() ? VUE : '',
      this.isAngular() ? ANGULAR : '',
      this.isSvelte() ? SVELTE : '',
      this.isEmber() ? EMBER : '',
    ].join('');

    return ret.length ? ret : ['unknown'];
  }


  detectDevTools = (framework) => {
    let enabled = false;

    switch (framework) {
      case REACT:
        // Not disabled by default in production
        enabled = !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.rendererInterfaces?.get(1);
        break;

      case ANGULAR:
        // Disabled by default in production
        enabled = !!window.ng;
        break;

      case VUE:
        // Disabled by default in production
        enabled = window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.dev_tool_enabled;
        break;

      case SVELTE:
        // Svelte Dev Tool is currently not supported on v.5. Still, we can assess existing websites using deprecated versions
        enabled = !!window.__SVELTE_DEVTOOLS_GLOBAL_HOOK__?.svelte?.components[0];
        break;

      case EMBER:
        // Ember inspector is enabled by default and has access to the render tree
        enabled = !!window.EmberInspector?.viewDebug?.renderTree?.tree?.length;
        break;

      default:
        enabled = false;
        break;
    }

    return enabled;
  }


  getResults = () => {
    const detected_framework = this.detectClientFramework();
    const dev_tool_enabled = this.detectDevTools(detected_framework);
    return { detected_framework, dev_tool_enabled };
  }
}
