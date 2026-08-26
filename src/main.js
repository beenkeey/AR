import { MESSAGES } from './config.js';
import { arError } from './logger.js';
import { probeCapabilities } from './capabilities.js';
import { App } from './app/App.js';

function mount() {
  const root = document.getElementById('app');
  const app = new App(root);

  window.addEventListener('error', (event) => {
    arError('Unhandled error', event.error || event.message);
    app.fail(MESSAGES.genericError);
  });
  window.addEventListener('unhandledrejection', (event) => {
    arError('Unhandled rejection', event.reason);
    app.fail(MESSAGES.genericError);
  });

  return app;
}

async function main() {
  const app = mount();
  const capabilities = await probeCapabilities();

  if (!capabilities.secure || !capabilities.media || !capabilities.webgl) {
    app.fail(MESSAGES.unsupported);
    return;
  }

  await app.boot(capabilities);
}

main().catch((err) => {
  arError('Boot failed', err);
  document.body.innerHTML = `<div class="overlay overlay-error"><p class="overlay-title">${MESSAGES.genericError}</p></div>`;
});
