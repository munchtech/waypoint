const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('waypoint', {
  desktop: true,
  request: (path, method, body) => ipcRenderer.invoke('waypoint:request', { path, method, body }),
  cancel: () => ipcRenderer.invoke('waypoint:cancel'),
  // Generation progress: one short label each time it changes. Returns the function that stops listening.
  onProgress: (listener) => {
    const handler = (_event, progress) => listener(String(progress?.label || ''));
    ipcRenderer.on('waypoint:progress', handler);
    return () => ipcRenderer.removeListener('waypoint:progress', handler);
  },
});
