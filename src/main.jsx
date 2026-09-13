import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import Legal from "./Legal.jsx";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/dm-serif-display/latin-400.css";
import "@fontsource/dm-serif-display/latin-400-italic.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {location.pathname === "/privacy.html" ? (
      <Legal page="privacy" />
    ) : location.pathname === "/support.html" ? (
      <Legal page="support" />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
