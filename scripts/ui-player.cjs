// Player window check: renders the document the table sees and verifies it is formatted but inert.
//   node_modules/electron/dist/electron.exe scripts/ui-player.cjs [--out player.png]
// Raw HTML must stay escaped, links must be plain text, remote images must not load, and no script may run.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {BrowserWindow}=require('electron');
const {root,sleep,run}=require('./ui-harness.cjs');
run(async args=>{
 const moduleFile=path.join(root,'.sites-runtime/ui-harness/player-display.mjs');
 if(!fs.existsSync(moduleFile))throw new Error('player-display.mjs missing; run node scripts/build-desktop.mjs first.');
 const {playerDocument}=await import(require('node:url').pathToFileURL(moduleFile).href);
 const body=['The village bell has not rung in a century.','','> Voss: "Nobody climbs that tower after dark."','','- The courier was last seen at the well.','- Mara keeps the inn open until **midnight**.','','[Read the letter](https://example.com) <script>window.__ran=true</script> ![map](https://example.com/map.png)','','| Clue | Where |','| --- | --- |','| Brass key | The well |'].join('\n');
 const html=playerDocument({title:'Briar Glen at dusk',body});
 const requests=[];
 const win=new BrowserWindow({show:false,width:1000,height:760,webPreferences:{sandbox:true,contextIsolation:true,partition:'ui-player'}});
 win.webContents.session.webRequest.onBeforeRequest((details,callback)=>{if(!details.url.startsWith('data:'))requests.push(details.url);callback({cancel:false})});
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));win.showInactive();await sleep(500);
 const state=await win.webContents.executeJavaScript(`({ran:window.__ran===true,scripts:document.querySelectorAll('script').length,links:document.querySelectorAll('a').length,images:document.querySelectorAll('img').length,quote:!!document.querySelector('blockquote'),list:document.querySelectorAll('li').length,bold:!!document.querySelector('strong'),table:!!document.querySelector('table'),text:document.body.innerText})`);
 assert.equal(state.ran,false,'Embedded script ran');assert.equal(state.scripts,0);assert.equal(state.links,0,'Links must be plain text');assert.equal(state.images,0,'Images must not render');
 assert(state.quote&&state.bold&&state.list===2,'Markdown should be formatted');assert(state.table,'Tables should render');
 assert(state.text.includes('<script>'),'Raw HTML should be shown as text, not executed');assert(state.text.includes('Read the letter')&&state.text.includes('map'));
 assert.deepEqual(requests,[],'The player window must not request anything remote');
 if(args.out){win.webContents.invalidate();await sleep(250);fs.writeFileSync(path.resolve(args.out),(await win.webContents.capturePage()).toPNG())}
 console.log('Player window passed: formatted text, escaped HTML, plain links, no images, no scripts, no remote requests.');
 win.destroy();
});
