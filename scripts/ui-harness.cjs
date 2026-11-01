// Shared Electron harness for the visual tools (ui-tour, ui-audit, ui-styles).
// Run the tools with the Electron binary, not node:
//   node_modules/electron/dist/electron.exe scripts/ui-tour.cjs --out <dir>
// Build first with `node scripts/build-desktop.mjs`; the tools load desktop/build/renderer.
const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// A closed output pipe must never raise Electron's error dialog; the tools can outlive the shell that started them.
for(const stream of [process.stdout,process.stderr])stream.on('error',()=>{});
process.on('uncaughtException',error=>{try{fs.writeSync(2,'UI TOOL ERROR '+(error&&error.stack||error)+'\n')}catch{}app.exit(1)});
// --key value pairs and bare --flags from the command line.
function parseArgs(argv=process.argv.slice(2)){
 const out={};
 for(let i=0;i<argv.length;i++){
  if(!argv[i].startsWith('--'))continue;
  const key=argv[i].slice(2),next=argv[i+1];
  if(next===undefined||next.startsWith('--'))out[key]=true;else{out[key]=next;i++}
 }
 return out;
}
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'waypoint-ui-')));
// Hidden windows do not repaint between steps, so windows are shown without focus and repainted by hand.
const states=new Map();let rulesStore=null,rulesStoreLoaded=false;
async function loadRulesStore(){
 if(rulesStoreLoaded)return rulesStore;rulesStoreLoaded=true;
 const storeFile=path.join(root,'.sites-runtime/ui-harness/rules-store.mjs'),starter=path.join(root,'desktop/data/srd-5etools.json');
 if(!fs.existsSync(storeFile)){console.warn('rules-store.mjs missing; run node scripts/build-desktop.mjs. Rules library will be empty.');return null}
 const {RulesStore}=await import(require('node:url').pathToFileURL(storeFile).href);
 rulesStore=new RulesStore(fs.mkdtempSync(path.join(os.tmpdir(),'waypoint-ui-rules-')),starter);return rulesStore;
}
function fixtureSnapshot(name){
 if(!name||name==='demo')return null;
 const file=name==='seventh-bell'?path.resolve(root,'../../outputs/The-Seventh-Bell.waypoint.json'):path.resolve(name);
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
let handlerInstalled=false;
function installHandler(){
 if(handlerInstalled)return;handlerInstalled=true;
 ipcMain.handle('waypoint:request',async(e,r)=>{
  const state=states.get(e.sender.id)||{snapshot:null};
  if(r.path==='/api/campaigns'){if(r.method==='POST'){state.snapshot=JSON.parse(r.body);return {status:200,body:{saved:true}}}return {status:200,body:state.snapshot}}
  // Two restore points that hold the current save, so the AI & backups panel has rows to show and restore.
  if(r.path==='/api/restore-points'){const campaigns=(state.snapshot?.campaigns||[]).map(c=>({name:c.name,sessions:c.sessions.length}));return {status:200,body:{points:[{id:2,created:Date.now()-60000,reason:'autosave',campaigns,bytes:4000},{id:1,created:Date.now()-24*3600000,reason:'opened',campaigns,bytes:4000}]}}}
  if(r.path==='/api/restore-points/read')return state.snapshot&&!state.restoreFail?{status:200,body:state.snapshot}:{status:400,body:{error:'That restore point is no longer available.'}};
  if(r.path==='/api/restore-points/export')return {status:200,body:{saved:false}};
  // The player site: keep the written page in memory so a test can read what players would see.
  if(r.path==='/api/site/write'){state.siteHtml=JSON.parse(r.body).html;return {status:200,body:{saved:true,path:'C:\\test\\site.html'}}}
  if(r.path==='/api/site/where')return {status:200,body:{path:state.siteHtml?'C:\\test\\site.html':''}};
  if(r.path.startsWith('/api/local-engine'))return {status:200,body:{state:'stopped',owned:false}};
  if(r.path==='/api/generate')return {status:200,body:{ready:false,provider:'comfyui',model:'test'}};
  if(r.path==='/api/rules/search'||r.path==='/api/rules/entry'){
   const store=await loadRulesStore();
   if(!store)return {status:200,body:r.path.endsWith('search')?{entries:[],total:0,offset:0,facets:{kinds:[],sources:[],editions:[]}}:{}};
   const input=JSON.parse(r.body||'{}');
   try{return {status:200,body:r.path.endsWith('search')?store.search(input):store.get(input.id)}}catch(error){return {status:500,body:{error:error.message}}}
  }
  return {status:200,body:{recordings:[]}};
 });
}
// Opens one renderer window. `build` is a desktop/build folder (the baseline folder can be passed for before/after runs).
async function openSession({build=path.join(root,'desktop/build'),width=1420,height=940,fixture='demo',reduceMotion=true}={}){
 installHandler();
 const win=new BrowserWindow({show:false,width,height,useContentSize:true,webPreferences:{preload:path.join(build,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 const state={snapshot:fixtureSnapshot(fixture)};states.set(win.webContents.id,state);
 const run=code=>win.webContents.executeJavaScript(code);
 await win.loadFile(path.join(build,'renderer/index.html'));win.showInactive();
 if(reduceMotion)await win.webContents.insertCSS('*,*::before,*::after{transition:none!important;animation:none!important;scroll-behavior:auto!important;caret-color:transparent!important}');
 for(let i=0;i<100;i++){if(await run("!!document.querySelector('.app .sidebar')&&!!document.querySelector('.page-heading h1')"))break;await sleep(100)}
 await sleep(500);
 const session={win,run,sleep,state,
  async settle(ms=450){await sleep(ms);win.webContents.invalidate();await sleep(250)},
  async resize(w,h){win.setContentSize(w,h);await sleep(250);await session.settle(250)},
  async shot(file){await session.settle(0);fs.writeFileSync(file,(await win.webContents.capturePage()).toPNG())},
  // Matches visible buttons or links by their text, ignoring a trailing count badge.
  async clickText(text,{within='body',nth=0}={}){
   return run(`(()=>{const T=${JSON.stringify(text)};const scope=document.querySelector(${JSON.stringify(within)});if(!scope)return 'MISSING-SCOPE';const hits=[...scope.querySelectorAll('button,a,summary,[role=button]')].filter(b=>b.offsetParent!==null&&b.textContent.trim().replace(/\\d+$/,'').trim()===T);const el=hits[${nth}];if(!el)return 'MISSING:'+T;el.click();return 'ok'})()`);
  },
  async clickSelector(selector,nth=0){
   return run(`(()=>{const els=[...document.querySelectorAll(${JSON.stringify(selector)})].filter(e=>e.offsetParent!==null||e.getClientRects().length);const el=els[${nth}];if(!el)return 'MISSING:'+${JSON.stringify(selector)};(el.closest('button,a,summary')||el).click();return 'ok'})()`);
  },
  async key(keyCode,modifiers=[]){
   const code={Escape:'Escape',Enter:'Return',Tab:'Tab',Space:'Space',ArrowDown:'Down',ArrowUp:'Up',ArrowLeft:'Left',ArrowRight:'Right',Home:'Home',End:'End'}[keyCode]||keyCode;
   win.webContents.sendInputEvent({type:'keyDown',keyCode:code,modifiers});
   if(keyCode.length===1)win.webContents.sendInputEvent({type:'char',keyCode:code,modifiers});
   win.webContents.sendInputEvent({type:'keyUp',keyCode:code,modifiers});
  },
  async setValue(selector,value){
   return run(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return 'MISSING:'+${JSON.stringify(selector)};const proto=e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:e instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event(e instanceof HTMLSelectElement?'change':'input',{bubbles:true}));return 'ok'})()`);
  },
  close(){states.delete(win.webContents.id);win.destroy()}};
 return session;
}
// One step is [kind, argument, extra]. Failures are returned, never thrown, so a tour reports every missing control.
async function doStep(s,step){
 const [kind,arg,extra]=step;
 if(kind==='nav')return s.clickText(arg,{within:'.sidebar'});
 if(kind==='click')return s.clickText(arg,extra);
 if(kind==='sel')return s.clickSelector(arg,extra||0);
 if(kind==='key'){const mods=(extra||[]);await s.key(arg,mods);return 'ok'}
 if(kind==='type')return s.setValue(arg,extra);
 if(kind==='js')return s.run(arg);
 if(kind==='wait'){await s.sleep(arg);return 'ok'}
 if(kind==='scroll')return s.run(`(()=>{const m=document.querySelector(${JSON.stringify(arg||'main')});if(!m)return 'MISSING';m.scrollTop=${Number(extra)||0};window.scrollTo(0,0);return 'ok'})()`);
 return 'UNKNOWN-STEP:'+kind;
}
const views=['Session desk','Foresight','Next session','Saved material','Rules library','Campaign hub','Campaign','World wiki','Party & preferences','Session journal','Chronicle','Player handouts'];
// Ordered tour. Each state continues from the previous one, so every modal ends with Escape.
const slug=text=>text.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const tourStates=[
 ...views.map(v=>({name:'view-'+slug(v),view:true,steps:[['nav',v],['wait',350]]})),
 {name:'desk-path-open',steps:[['nav','Session desk'],['sel','.branch-head'],['wait',250]]},
 {name:'desk-session-notes',steps:[['click','Session notes'],['wait',250]]},
 {name:'desk-at-the-table',steps:[['click','At the table'],['wait',250]]},
 {name:'desk-live-mode',steps:[['click','Possibilities'],['click','Live mode'],['wait',300]]},
 {name:'desk-live-table-tab',steps:[['click','At the table'],['wait',250],['click','Exit live mode'],['click','Possibilities'],['wait',250]]},
 {name:'rules-entry-open',steps:[['nav','Rules library'],['wait',500],['sel','.rule-result'],['wait',500]]},
 {name:'rules-filtered',steps:[['type','.rules-library input[aria-label="Search rules"]','fire'],['wait',700]]},
 {name:'hub-reader-open',steps:[['nav','Campaign hub'],['wait',500],['sel','.reader-contents button'],['wait',400]]},
 {name:'wiki-card-open',steps:[['nav','World wiki'],['wait',400],['sel','.wiki-card'],['wait',400]]},
 {name:'journal-review',steps:[['nav','Session journal'],['wait',500]]},
 {name:'modal-plan',steps:[['nav','Session desk'],['click','Edit session plan'],['wait',350]],close:true},
 {name:'modal-outcome',steps:[['nav','Chronicle'],['click','Record an event'],['wait',350]],close:true},
 {name:'modal-recap',steps:[['click','Import recap'],['wait',350]],close:true},
 {name:'modal-new-campaign',steps:[['click','New campaign'],['wait',350]],close:true},
 {name:'modal-data',steps:[['click','AI & backups'],['wait',450]],close:true},
 {name:'modal-wrap-up',steps:[['nav','Session desk'],['click','Wrap up session'],['wait',350]],close:true},
 {name:'quick-navigation',steps:[['key','K',['control']],['wait',350]],close:true},
];
const closeSteps=[['key','Escape'],['wait',250]];
async function runStates(s,list,each){
 const results=[];
 for(const state of list){
  const outcomes=[];
  for(const step of state.steps)outcomes.push(await doStep(s,step));
  await s.settle(150);
  const missing=outcomes.filter(o=>typeof o==='string'&&(o.startsWith('MISSING')||o.startsWith('UNKNOWN')));
  const alive=await s.run("!!document.querySelector('.app')");
  if(each)await each(state,{missing,alive});
  results.push({name:state.name,missing,alive});
  if(state.close)for(const step of closeSteps)await doStep(s,step);
 }
 return results;
}
function run(main){
 app.whenReady().then(async()=>{
  let code=0;
  try{await main(parseArgs())}catch(error){console.error('UI TOOL ERROR',error&&error.stack||error);code=1}
  app.exit(code||process.exitCode||0);
 });
}
module.exports={root,sleep,parseArgs,openSession,doStep,runStates,views,tourStates,closeSteps,run,slug};
