const { contextBridge, ipcRenderer } = require('electron');

// Only expose exactly what the renderer needs -- never the raw ipcRenderer
// or any Node API. Extend this surface deliberately as panels need more.
contextBridge.exposeInMainWorld('terminalAPI', {
  onFocusCommandBar: (callback) => {
    ipcRenderer.on('focus-command-bar', callback);
  },
});
