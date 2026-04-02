const { contextBridge, ipcRenderer } = require("electron");

// Expose minimal platform info + auto-launch controls to the renderer.
// No Node APIs leak into the browser context.
contextBridge.exposeInMainWorld("kinward", {
  platform: process.platform, // "darwin", "win32", "linux"
  isElectron: true,

  // Auto-launch on login
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),
  setAutoLaunch: (enabled) => ipcRenderer.invoke("set-auto-launch", enabled),
});
