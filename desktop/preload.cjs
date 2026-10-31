const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('waypoint',{desktop:true,request:(path,method,body)=>ipcRenderer.invoke('waypoint:request',{path,method,body}),cancel:()=>ipcRenderer.invoke('waypoint:cancel')});
