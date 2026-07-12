// electron-app/main/main.js
/**
 * Electron main process.
 *
 * Security model (follows contextIsolation: true pattern):
 *   - nodeIntegration: false  — renderer has no raw Node access
 *   - contextIsolation: true  — preload bridge is the only IPC surface
 *   - sandbox: false          — needed for preload script to use ipcRenderer
 *
 * Global shortcuts registered here fire regardless of which window or
 * external app has focus — this is the core Bloomberg keyboard feel.
 *
 * Multi-window: single primary BrowserWindow + detachable panel pop-outs
 * opened via window.open (nativeWindowOpen: true) from the renderer.
 */

const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  shell,
} = require("electron");
const path = require("path");
const log  = require("electron-log");

// ─── Config ──────────────────────────────────────────────────────────────────

const IS_DEV   = !app.isPackaged;
const DEV_URL  = "http://localhost:5174";
const PROD_HTML = path.join(__dirname, "../renderer/dist/index.html");

// ─── Window registry ─────────────────────────────────────────────────────────

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {Map<string, BrowserWindow>} */
const detachedPanels = new Map();

// ─── Create main window ───────────────────────────────────────────────────────

function createMainWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width:          Math.min(width,  1920),
    height:         Math.min(height, 1080),
    minWidth:       1024,
    minHeight:      640,
    backgroundColor: "#0a0b0f",         // Bloomberg dark — avoids white flash on load
    title:          "TradePro Terminal",
    webPreferences: {
      preload:          path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,          // required for ipcRenderer in preload
      // Allow window.open for panel detach
      nativeWindowOpen: true,
    },
  });

  // Remove default menu bar (Bloomberg style — all nav via command bar)
  mainWindow.setMenuBarVisibility(false);

  if (IS_DEV) {
    mainWindow.loadURL(DEV_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(PROD_HTML);
  }

  mainWindow.on("closed", () => { mainWindow = null; });

  // Handle window.open from renderer for panel detach
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow panel pop-out URLs
    if (url.startsWith(IS_DEV ? DEV_URL : "file://") || url.includes("panel=")) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width:           800,
          height:          600,
          backgroundColor: "#0a0b0f",
          webPreferences: {
            preload:          path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration:  false,
            sandbox:          false,
          },
        },
      };
    }
    // External links → default browser
    shell.openExternal(url);
    return { action: "deny" };
  });

  log.info("Main window created");
}

// ─── Global shortcuts ─────────────────────────────────────────────────────────

/**
 * Register shortcuts that work terminal-wide (even when another app is focused).
 * These are the BBG-feel function-key bindings.
 */
function registerGlobalShortcuts() {
  const shortcuts = {
    "CommandOrControl+G":  () => sendToMain("shortcut", { key: "command-bar"    }),
    "F1":                  () => sendToMain("shortcut", { key: "help"           }),
    "F2":                  () => sendToMain("shortcut", { key: "panel-chart"    }),
    "F3":                  () => sendToMain("shortcut", { key: "panel-watchlist"}),
    "F4":                  () => sendToMain("shortcut", { key: "panel-orderbook"}),
    "F5":                  () => sendToMain("shortcut", { key: "panel-news"     }),
    "F6":                  () => sendToMain("shortcut", { key: "panel-portfolio"}),
    "F7":                  () => sendToMain("shortcut", { key: "panel-alerts"   }),
    "F11":                 () => mainWindow?.setFullScreen(!mainWindow.isFullScreen()),
    "Escape":              () => sendToMain("shortcut", { key: "escape"         }),
  };

  for (const [accel, handler] of Object.entries(shortcuts)) {
    const ok = globalShortcut.register(accel, handler);
    if (!ok) log.warn(`Failed to register shortcut: ${accel}`);
  }

  log.info("Global shortcuts registered");
}

function sendToMain(channel, payload) {
  mainWindow?.webContents.send(channel, payload);
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────

// Return all connected display info so the renderer can offer multi-monitor layout
ipcMain.handle("get-displays", () => {
  return screen.getAllDisplays().map((d) => ({
    id:     d.id,
    bounds: d.bounds,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
  }));
});

// Renderer tells main that a panel was detached → track it
ipcMain.on("panel-detached", (event, panelId) => {
  log.info(`Panel detached: ${panelId}`);
});

// Alert triggered → show native OS notification
ipcMain.on("alert-triggered", (event, { symbol, message }) => {
  const { Notification } = require("electron");
  if (Notification.isSupported()) {
    new Notification({
      title: `⚡ Alert: ${symbol}`,
      body:  message,
    }).show();
  }
});

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createMainWindow();
  registerGlobalShortcuts();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
