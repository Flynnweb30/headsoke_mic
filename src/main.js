import './style.css';
import { AudioEngine } from './audio/engine.js';
import { buildApp } from './ui/layout.js';

const root = document.getElementById('app');

try {
  const engine = new AudioEngine();
  buildApp(root, engine);
  window.addEventListener('beforeunload', () => { engine.close(); });
} catch (err) {
  // The UI must never disappear because of a runtime error.
  // eslint-disable-next-line no-console
  console.error('[Headsoke] Fatal init error:', err);
  if (root) {
    root.innerHTML =
      '<div style="max-width:720px;margin:64px auto;padding:24px;background:#1a0d10;border:1px solid #6c2530;border-radius:12px;color:#ffd7d7;font:14px/1.5 system-ui,sans-serif">' +
      '<h1 style="margin:0 0 8px;color:#ff9a9a">Headsoke could not start</h1>' +
      '<p>The application failed to initialize. This is usually caused by an incompatible browser or a missing feature.</p>' +
      '<pre style="background:#0a0f1c;padding:12px;border-radius:8px;overflow:auto;color:#ffb3b3">' +
      String(err && err.stack || err) +
      '</pre>' +
      '<p>Try a Chromium-based browser (Chrome, Edge) with JavaScript enabled.</p>' +
      '</div>';
  }
}