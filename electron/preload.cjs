const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('expenseStore', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (data) => ipcRenderer.invoke('store:save', data),
  path: () => ipcRenderer.invoke('store:path'),
  exportFile: (payload) => ipcRenderer.invoke('store:export', payload)
});

contextBridge.exposeInMainWorld('appUpdates', {
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('update:status', listener);
    return () => ipcRenderer.removeListener('update:status', listener);
  }
});
