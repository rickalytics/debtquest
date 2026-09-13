import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import Legal from './Legal.jsx';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-600.css';
import '@fontsource/outfit/latin-700.css';
import '@fontsource/syne/latin-700.css';
import '@fontsource/syne/latin-800.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {location.pathname === "/privacy.html" ? <Legal page="privacy" /> : location.pathname === "/support.html" ? <Legal page="support" /> : <App />}
  </React.StrictMode>
);
