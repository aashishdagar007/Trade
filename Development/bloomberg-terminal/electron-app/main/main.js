const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      // Security baseline: renderer never gets raw Node access.
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173'); // Vite dev server
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Global shortcuts work terminal-wide, not just when a panel has focus --
  // this is core to the BBG "always reachable" keyboard feel.
  // Ctrl+K focuses the command bar from anywhere, like the real thing's <GO> key habit.
  globalShortcut.register('CommandOrControl+K', () => {
    mainWindow.webContents.send('focus-command-bar');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
