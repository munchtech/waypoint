import {safeWebLink} from '../lib/safe-web-link';
import {createManagedEngine} from './managed-engine';
import {audioRange} from '../lib/transcript';
import {Readable} from 'node:stream';
import {playerDocument} from '../lib/player-display';
import {CampaignStore} from './campaign-store';
import {RulesStore} from './rules-store';
import {RecordingLibrary} from './recordings';
import {app,BrowserWindow,ipcMain,Menu,shell,desktopCapturer,dialog,protocol} from 'electron';
import path from 'node:path';
import fs from 'node:fs';


import {Settings,generateLocal,inspectEngine,validateLocalURL} from './local-engine';
let playerWin:BrowserWindow|null=null;
let win:BrowserWindow|null=null,controller:AbortController|null=null;
protocol.registerSchemesAsPrivileged([{scheme:'waypoint-audio',privileges:{standard:true,secure:true,stream:true,supportFetchAPI:true,corsEnabled:true}}]);
app.setName('Waypoint');
const smoke=process.argv.includes('--smoke-test');
const preview=process.argv.includes('--preview-test');
if(smoke||preview)app.setPath('userData',path.join(app.getPath('temp'),'waypoint-isolated-smoke-'+process.pid));
const dataDir=app.getPath('userData');fs.mkdirSync(dataDir,{recursive:true});
let rulesStore:RulesStore|null=null,rulesImporting=false;
function rules(){return rulesStore??=new RulesStore(dataDir,path.join(__dirname,'data','srd-5etools.json'))}
const settingsFile=path.join(dataDir,'local-ai.json');
let store:CampaignStore|null=null,library:RecordingLibrary|null=null,storeError='';
const defaultInstall=path.join(process.env.LOCALAPPDATA||'','Comfy-Desktop','ComfyUI-Installs','ComfyUI','ComfyUI');
const defaults:Settings={provider:'comfyui',baseURL:'http://127.0.0.1:8188',model:'qwen_3_4b.safetensors',comfyInstall:fs.existsSync(path.join(defaultInstall,'main.py'))?defaultInstall:'',autoStart:false};
function readSettings():Settings{try{return {...defaults,...JSON.parse(fs.readFileSync(settingsFile,'utf8')),autoStart:false}}catch{return defaults}}
function atomicWrite(file:string,value:unknown){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(value,null,2),'utf8');fs.renameSync(tmp,file)}
function trusted(event:Electron.IpcMainInvokeEvent){if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw new Error('Unknown application window.');}
const managedEngine=createManagedEngine(dataDir);
async function route(req:{path:string;method:string;body?:string}){if(!req||typeof req.path!=='string'||!['GET','POST'].includes(req.method)||req.body&&req.body.length>64000000)return {status:400,body:{error:'Invalid local request.'}};const settings=readSettings();
 if(req.path==='/api/player/show'||req.path==='/api/player/clear'){
  if(req.method!=='POST')throw new Error('Use POST for player display.');
  const html=playerDocument(req.path.endsWith('/clear')?{title:'The story continues…',body:'Waiting for your dungeon master.'}:JSON.parse(req.body||'{}'));
  if(!playerWin||playerWin.isDestroyed()){if(req.path.endsWith('/clear'))return {status:200,body:{ok:true}};playerWin=new BrowserWindow({width:1000,height:760,show:!smoke,title:'Waypoint · Player display',autoHideMenuBar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,partition:'waypoint-player'}});playerWin.setMenu(null);playerWin.webContents.setWindowOpenHandler(()=>({action:'deny'}));playerWin.webContents.on('will-navigate',e=>e.preventDefault());playerWin.webContents.session.setPermissionRequestHandler((_w,_p,cb)=>cb(false));playerWin.on('closed',()=>{playerWin=null});}
  await playerWin.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));if(!smoke)playerWin.show();return {status:200,body:{ok:true}};
 }
 if(req.path==='/api/generate'&&req.method==='GET'){let ready=false;try{const result=await inspectEngine(settings);ready=Boolean(result.models.includes(settings.model))}catch{}return {status:200,body:{ready,desktop:true,provider:settings.provider,model:settings.model}}}
 if(req.path==='/api/local-settings'){if(req.method==='POST'){const value=JSON.parse(req.body||'{}');if(!['comfyui','ollama','lmstudio'].includes(value.provider)||typeof value.model!=='string'||typeof value.comfyInstall!=='string'||typeof value.autoStart!=='boolean')throw new Error('Invalid local model settings.');const next:Settings={provider:value.provider,baseURL:validateLocalURL(value.baseURL),model:value.model.slice(0,300),comfyInstall:value.comfyInstall,autoStart:false};managedEngine.assertSettings(next);atomicWrite(settingsFile,next);return {status:200,body:next}}return {status:200,body:{...settings,dataDir}}}
 if(req.path==='/api/local-engine'&&req.method==='GET')return {status:200,body:managedEngine.status()};
 if(req.path==='/api/local-engine/start'&&req.method==='POST')return {status:200,body:await managedEngine.start(settings)};
 if(req.path==='/api/local-engine/stop'&&req.method==='POST'){controller?.abort();return {status:200,body:await managedEngine.stop()}}
 if(req.path==='/api/local-test'&&req.method==='POST'){return {status:200,body:await inspectEngine(settings)}}
 if(req.path==='/api/rules/search'&&req.method==='POST')return {status:200,body:rules().search(JSON.parse(req.body||'{}'))};
 if(req.path==='/api/rules/entry'&&req.method==='POST'){const {id}=JSON.parse(req.body||'{}');if(typeof id!=='string'||id.length>2000)throw new Error('Invalid reference.');return {status:200,body:rules().get(id)}}
 if(req.path==='/api/rules/import'&&req.method==='POST'){
  if(rulesImporting)return {status:409,body:{error:'An import is already open.'}};rulesImporting=true;
  try{
   const result=await dialog.showOpenDialog(win!,{title:'Import JSON collections',filters:[{name:'JSON reference data',extensions:['json']}],properties:['openFile','multiSelections']});
   if(result.canceled)return {status:200,body:{canceled:true}};
   if(result.filePaths.length>50)throw new Error('Choose at most 50 JSON files at a time.');
   const packs:unknown[]=[];let bytes=0;
   for(const file of result.filePaths){const size=(await fs.promises.stat(file)).size;bytes+=size;if(size>40000000||bytes>100000000)throw new Error('Use files under 40 MB and an import under 100 MB.');try{packs.push(JSON.parse(await fs.promises.readFile(file,'utf8')))}catch{throw new Error('Could not read '+path.basename(file)+'. No entries were imported.')}}
   return {status:200,body:rules().importData(packs)};
  }finally{rulesImporting=false}
 }
 if(req.path==='/api/open-data'&&req.method==='POST'){await shell.openPath(dataDir);return {status:200,body:{ok:true}}}
 if(req.path.startsWith('/api/recordings/')&&req.method==='POST'){if(!library)throw new Error('Recording library unavailable');return {status:200,body:await library.route(req.path.slice('/api/recordings/'.length),JSON.parse(req.body||'{}'))}}
 if(req.path==='/api/export-previous'&&req.method==='POST'){const previous=store?.previous();if(!previous)throw new Error('No previous save is available yet.');const result=await dialog.showSaveDialog({title:'Export previous campaign save',defaultPath:'waypoint-previous-save.json',filters:[{name:'Campaign backup',extensions:['json']}]});if(!result.canceled&&result.filePath)fs.writeFileSync(result.filePath,JSON.stringify(previous,null,2));return {status:200,body:{saved:!result.canceled}}}
 if(req.path.startsWith('/api/restore-points')){if(!store)throw new Error(storeError||'Campaign store unavailable');if(req.path==='/api/restore-points'&&req.method==='GET')return {status:200,body:{points:store.restorePoints()}};if(req.path==='/api/restore-points/keep'&&req.method==='POST')return {status:200,body:{kept:store.keepPoint('update')}};const id=Number((JSON.parse(req.body||'{}') as {id?:unknown}).id);if(req.method!=='POST'||!Number.isInteger(id))return {status:400,body:{error:'Choose a restore point.'}};
  if(req.path==='/api/restore-points/read')return {status:200,body:store.restorePoint(id)};
  if(req.path==='/api/restore-points/export'){const point=store.restorePoint(id),created=store.restorePoints().find(p=>p.id===id)?.created||Date.now();const result=await dialog.showSaveDialog({title:'Export restore point',defaultPath:'waypoint-restore-point-'+new Date(created).toISOString().slice(0,16).replace(/[T:]/g,'-')+'.json',filters:[{name:'Campaign backup',extensions:['json']}]});if(!result.canceled&&result.filePath)fs.writeFileSync(result.filePath,JSON.stringify(point,null,2));return {status:200,body:{saved:!result.canceled}}}}
 if(req.path==='/api/campaigns'){if(!store)throw new Error(storeError||'Campaign store unavailable');if(req.method==='POST'){store.save(JSON.parse(req.body||'{}'));return {status:200,body:{saved:true}}}return {status:200,body:store.read()}}
 if(req.path==='/api/generate'&&req.method==='POST'){if(controller)return {status:409,body:{error:'A local generation is already running.'}};if((req.body?.length||0)>180000)return {status:413,body:{error:'Shorten older campaign notes before generating.'}};controller=new AbortController();const timer=setTimeout(()=>controller?.abort(),600000);try{if(managedEngine.status().state==='starting')throw new Error('The local server is still starting. Wait for Ready in AI & backups.');const body=await generateLocal(settings,JSON.parse(req.body||'{}'),controller.signal);return {status:200,body}}finally{clearTimeout(timer);controller=null}}
 return {status:404,body:{error:'Unknown local action.'}};
}
ipcMain.handle('waypoint:request',async(event,req)=>{trusted(event);try{return await route(req)}catch(e){return {status:502,body:{error:e instanceof Error?e.message:'The local engine could not finish. Your campaign is safe.'}}}});
ipcMain.handle('waypoint:cancel',event=>{trusted(event);controller?.abort()});
const locked=app.requestSingleInstanceLock();if(!locked)app.quit();else{app.on('second-instance',()=>{win?.restore();win?.focus()});app.whenReady().then(()=>{
 try{store=new CampaignStore(dataDir)}catch(e){storeError=e instanceof Error?e.message:'Campaign migration failed'}
 const speechRoot=path.join(process.env.PORTABLE_EXECUTABLE_DIR||path.resolve(__dirname,'..','..','..','..','outputs'),'Waypoint-Speech');
 const speechScript=path.join(dataDir,'speech-worker.py');fs.writeFileSync(speechScript,fs.readFileSync(path.join(__dirname,'speech-worker.py')));
 library=new RecordingLibrary(dataDir,speechRoot,speechScript);
 protocol.handle('waypoint-audio',request=>{
  try{const url=new URL(request.url);if(url.hostname!=='recording'||!['GET','HEAD'].includes(request.method))return new Response(null,{status:403});
   const file=library!.audioFile(url.pathname.slice(1)),size=fs.statSync(file).size;
   let range;try{range=audioRange(request.headers.get('range'),size)}catch{return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+size}})}
   const types:Record<string,string>={'.webm':'audio/webm','.wav':'audio/wav','.mp3':'audio/mpeg','.m4a':'audio/mp4','.ogg':'audio/ogg','.flac':'audio/flac'};
   const headers:Record<string,string>={'Access-Control-Allow-Origin':'null','Content-Type':types[path.extname(file)],'Accept-Ranges':'bytes','Content-Length':String(Math.max(0,range.end-range.start+1)),'Cache-Control':'no-store'};
   if(range.status===206)headers['Content-Range']=`bytes ${range.start}-${range.end}/${size}`;
   return new Response(request.method==='HEAD'||!size?null:Readable.toWeb(fs.createReadStream(file,{start:range.start,end:range.end})) as ReadableStream,{status:range.status,headers});
  }catch{return new Response(null,{status:404})}
 });
 win=new BrowserWindow({width:1420,height:940,minWidth:850,minHeight:650,title:'Waypoint',icon:path.join(__dirname,'renderer','waypoint-icon.png'),backgroundColor:'#f7f8f5',show:!smoke,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Waypoint',submenu:[{label:'Open app data folder',click:()=>shell.openPath(dataDir)},{type:'separator'},{role:'quit'}]},{label:'View',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{type:'separator'},{role:'togglefullscreen'}]}]));
 win.webContents.setWindowOpenHandler(({url})=>{const safe=safeWebLink(url);if(safe)void shell.openExternal(safe).catch(()=>dialog.showErrorBox('Could not open link','Open this address in your browser: '+safe));return {action:'deny'}});
 win.webContents.on('will-prevent-unload',event=>{if(smoke){event.preventDefault();return}const choice=dialog.showMessageBoxSync(win!,{type:'warning',buttons:['Keep Waypoint open','Close without saving'],defaultId:0,cancelId:0,message:'Some campaign changes are not saved yet.',detail:'Keep Waypoint open until saving finishes. If saving has failed, export a backup first.'});if(choice===1)event.preventDefault()});
 win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.session.setPermissionRequestHandler((wc,permission,callback)=>callback(wc===win?.webContents&&(permission==='media'||permission==='display-capture')));
 win.webContents.session.setPermissionCheckHandler((wc,permission)=>wc===win?.webContents&&(permission==='media'||permission==='display-capture'));
 win.webContents.session.setDisplayMediaRequestHandler(async(request,callback)=>{if(request.frame!==win?.webContents.mainFrame){callback({});return}try{const screens=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width:0,height:0}});if(!screens.length){callback({});return}callback({video:screens[0],audio:'loopback'})}catch{callback({})}});
 win.on('closed',()=>{playerWin?.destroy();win=null});
 win.on('close',event=>{if(library?.isRecording||library?.isTranscribing){event.preventDefault();dialog.showMessageBoxSync(win!,{type:'info',message:'Stop recording or transcription before closing Waypoint.',detail:'Your saved audio stays on disk. Use Stop & save or Stop transcription first.'})}});

 win.webContents.on('did-fail-load',(_e,code,description)=>{console.error('Renderer load failed',code,description);if(smoke)app.exit(1)});
 win.webContents.on('render-process-gone',()=>{console.error('Renderer process failed');if(smoke)app.exit(1)});
 win.webContents.on('did-finish-load',()=>{console.log('Waypoint desktop renderer loaded.');if(smoke){(async()=>{try{const result=await win!.webContents.executeJavaScript(`(async()=>{const saved=await window.waypoint.request('/api/campaigns','GET');if(saved.status!==200)throw new Error(JSON.stringify(saved));const created=await window.waypoint.request('/api/recordings/start','POST',JSON.stringify({campaignId:'isolated-test',sessionId:'isolated-session',title:'Synthetic audio test',consent:true}));if(created.status!==200)throw new Error(JSON.stringify(created));const id=created.body.id;const ctx=new AudioContext();await ctx.resume();const osc=ctx.createOscillator();const dest=ctx.createMediaStreamDestination();osc.connect(dest);osc.start();const rec=new MediaRecorder(dest.stream,{mimeType:'audio/webm;codecs=opus'});const chunks=[];rec.ondataavailable=e=>chunks.push(e.data);await new Promise(resolve=>{rec.onstop=resolve;rec.start();setTimeout(()=>rec.stop(),400)});osc.stop();await ctx.close();const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let binary='';for(const n of bytes)binary+=String.fromCharCode(n);const written=await window.waypoint.request('/api/recordings/chunk','POST',JSON.stringify({id,sequence:0,data:btoa(binary)}));if(written.status!==200)throw new Error(JSON.stringify(written));const stopped=await window.waypoint.request('/api/recordings/stop','POST',JSON.stringify({id}));if(stopped.status!==200||stopped.body.bytes<100)throw new Error('Audio did not persist');const response=await fetch('waypoint-audio://recording/'+id,{headers:{Range:'bytes=0-15'}});if(response.status!==206||(await response.arrayBuffer()).byteLength!==16)throw new Error('Audio streaming failed');const media=new Audio('waypoint-audio://recording/'+id);media.muted=true;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Audio decode timed out')),8000);media.onloadeddata=()=>{clearTimeout(timer);resolve(true)};media.onerror=()=>{clearTimeout(timer);reject(new Error('Audio decode failed'))};media.load()});return {id,campaigns:saved.status,audioBytes:stopped.body.bytes,audioStreaming:true,audioDecoded:true,title:document.title};})()`);const ruleCheck=rules().search({});if(ruleCheck.total<2000)throw new Error('Bundled rules library missing');const ruleSpell=rules().search({query:'fireball',kind:'Spell',edition:'2014'});if(!ruleSpell.entries.length||!rules().get(ruleSpell.entries[0].id).body.includes('Casting time'))throw new Error('Bundled rules lookup failed');Object.assign(result,{rulesEntries:ruleCheck.total});const listed=await route({path:'/api/restore-points',method:'GET'}) as {status:number;body:{points?:unknown}};if(listed.status!==200||!Array.isArray(listed.body.points))throw new Error('Restore points unavailable');const kept=store!.read() as {campaigns:{name:string}[]};store!.save({...kept,campaigns:kept.campaigns.map((c,i)=>i?c:{...c,name:c.name+' (smoke edit)'})});const point=(await route({path:'/api/restore-points',method:'GET'}) as {body:{points:{id:number}[]}}).body.points[0];const restored=point&&await route({path:'/api/restore-points/read',method:'POST',body:JSON.stringify({id:point.id})}) as {status:number;body:unknown}|undefined;store!.save(kept);if(!restored||restored.status!==200||JSON.stringify(restored.body)!==JSON.stringify(kept))throw new Error('Restore point round trip failed');Object.assign(result,{restorePoints:true});const transcriptFile=path.join(dataDir,'recordings',result.id+'.transcript.json');fs.writeFileSync(transcriptFile,JSON.stringify({segments:[{start:0,end:1,text:'Captain Boss'}]}));const revised=await library!.route('save-transcript',{id:result.id,transcript:{revision:0,segments:[{start:0,end:1,text:'Captain Voss',speaker:'DM'}]}});if(revised.revision!==1||library!.list().length!==1||!fs.readFileSync(path.join(dataDir,'recordings',result.id+'.transcript-revision-0.json'),'utf8').includes('Captain Boss'))throw new Error('Transcript archive failed');fs.writeFileSync(path.join(dataDir,'recordings','22222222-2222-4222-8222-222222222222.json'),JSON.stringify({id:'malformed'}));const audited=await library!.route('list',{campaignId:'isolated-test'});if(audited.recordings.length!==1||audited.invalidRecordings!==1)throw new Error('Invalid recording isolation failed');for(const width of [900,1420]){win!.setSize(width,940);await new Promise(r=>setTimeout(r,180));const layout=await win!.webContents.executeJavaScript(`({width:document.documentElement.clientWidth,content:document.documentElement.scrollWidth})`);if(layout.content>layout.width+2)throw new Error('Horizontal layout overflow at '+width)}await route({path:'/api/player/show',method:'POST',body:JSON.stringify({title:'Isolated display test',body:'<script>test</script> Reviewed content only.'})});const playerCheck=await playerWin!.webContents.executeJavaScript(`({bridge:typeof window.waypoint,body:document.body.innerText,scripts:document.scripts.length})`);if(playerCheck.bridge!=='undefined'||playerCheck.scripts!==0||!playerCheck.body.includes('Reviewed content only.'))throw new Error('Player isolation failed');await route({path:'/api/player/clear',method:'POST'});console.log('Native smoke passed',JSON.stringify({...result,playerIsolation:true}));fs.writeFileSync(path.join(dataDir,'smoke-result.json'),JSON.stringify({...result,playerIsolation:true}));app.quit()}catch(e){console.error('Smoke failed',e);app.exit(1)}})()}});
 win.loadFile(path.join(__dirname,'renderer','index.html'));});}
let quitting=false,closingEngine=false;app.on('before-quit',event=>{if(!quitting&&locked&&(win||closingEngine)){event.preventDefault();win?.close()}});app.on('window-all-closed',()=>{closingEngine=true;controller?.abort();void managedEngine.stop().catch(e=>{if(!smoke)dialog.showMessageBoxSync({type:'error',message:'The local AI server could not be stopped.',detail:String(e)})}).finally(()=>{quitting=true;app.quit()})});app.on('will-quit',()=>{controller?.abort();library?.close();store?.close();rulesStore?.close();});

