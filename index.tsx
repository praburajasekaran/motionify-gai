import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initWebVitals } from './lib/vitals';

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