// electron-app/renderer/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DetachedPanel } from "./DetachedPanel";
import "./global.css";

// Removed electronAPI typings

// Route: detached panel pop-out (?panel=chart) vs full terminal
const isDetached = new URLSearchParams(window.location.search).has("panel");

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    {isDetached ? <DetachedPanel /> : <App />}
  </React.StrictMode>
);
