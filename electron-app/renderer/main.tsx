// electron-app/renderer/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { DetachedPanel } from "./DetachedPanel";
import "./global.css";

// Extend window type for Electron preload bridge
declare global {
  interface Window {
    electronAPI?: {
      onShortcut: (cb: (payload: { key: string }) => void) => () => void;
      notifyPanelDetached: (panelId: string) => void;
      triggerAlert: (alert: { symbol: string; message: string }) => void;
      getDisplays: () => Promise<Array<{ id: number; bounds: object; isPrimary: boolean }>>;
    };
  }
}

// Route: detached panel pop-out (?panel=chart) vs full terminal
const isDetached = new URLSearchParams(window.location.search).has("panel");

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    {isDetached ? <DetachedPanel /> : <App />}
  </React.StrictMode>
);
