// Renders a local HTML page to PNG at a given width (full page height): electron capture-page.cjs <file.html> <out.png> <width>
const {app,BrowserWindow}=require('electron');const fs=require('fs'),path=require('path');
const [file,out,width]=process.argv.slice(-3);
app.whenReady().then(async()=>{const w=Number(width)||1280;const win=new BrowserWindow({show:false,width:w,height:900,webPreferences:{offscreen:true}});
 await win.loadFile(path.resolve(file));await new Promise(r=>setTimeout(r,2500));
 const h=await win.webContents.executeJavaScript('Math.min(document.documentElement.scrollHeight,16000)');
 const over=await win.webContents.executeJavaScript('document.documentElement.scrollWidth>document.documentElement.clientWidth');
 win.setContentSize(w,h);await new Promise(r=>setTimeout(r,800));
 fs.writeFileSync(path.resolve(out),(await win.webContents.capturePage()).toPNG());console.log('height',h,'horizontal overflow',over);app.quit()});
