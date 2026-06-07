import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initWebVitals } from './lib/vitals';
import { initSentry } from './lib/sentry';
import { installCSRFProtection } from './lib/csrf';

const STALE_CHUNK_RELOAD_KEY = 'motionify:stale-chunk-reload-at';
const STALE_CHUNK_RELOAD_WINDOW_MS = 30_000;

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();

  const lastReloadAt = Number(sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) || 0);
  if (Date.now() - lastReloadAt < STALE_CHUNK_RELOAD_WINDOW_MS) {
    return;
  }

  sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(Date.now()));
  window.location.reload();
});

// Initialize security and monitoring before React renders
installCSRFProtection();
initSentry();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Start measuring Core Web Vitals after app mount
initWebVitals();
