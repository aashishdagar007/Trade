// electron-app/main/preload.js
/**
 * Preload script — the ONLY bridge between main process and renderer.
 *
 * contextIsolation: true means the renderer cannot access Node APIs directly.
 * This file runs in a privileged context and exposes a narrow, typed API
 * via contextBridge.exposeInMainWorld("electronAPI", ...).
 *
 * Security principles:
 *   - No raw ipcRenderer exposed — only specific named channels
 *   - No fs, child_process, or other Node modules exposed
 *   - Listeners auto-cleanup via returned unsubscribe functions
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Listen for global shortcut events fired from main.js.
   * Returns an unsubscribe function to prevent listener leaks.
   *
   * @param {(payload: { key: string }) => void} callback
   * @returns {() => void} unsubscribe
   */
  onShortcut(callback) {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("shortcut", handler);
    return () => ipcRenderer.removeListener("shortcut", handler);
  },

  /**
   * Notify main that a panel has been opened in a detached window.
   * @param {string} panelId
   */
  notifyPanelDetached(panelId) {
    ipcRenderer.send("panel-detached", panelId);
  },

  /**
   * Trigger a native OS notification for a price alert.
   * @param {{ symbol: string, message: string }} alert
   */
  triggerAlert(alert) {
    ipcRenderer.send("alert-triggered", alert);
  },

  /**
   * Get all connected display info for multi-monitor layouts.
   * @returns {Promise<Array<{ id: number, bounds: object, isPrimary: boolean }>>}
   */
  getDisplays() {
    return ipcRenderer.invoke("get-displays");
  },
});
