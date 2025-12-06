/**
 * PDF Editor Application Entry Point
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Initialize the application
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found. Make sure you have a <div id="root"></div> in your HTML.');
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Enable hot module replacement for development
if (module.hot) {
  module.hot.accept();
}
