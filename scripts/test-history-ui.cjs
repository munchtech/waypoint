const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE')throw e});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'waypoint-history-ui-')));
let snapshot=null,starts=0;
ipcMain.handle('waypoint:request',(_e,r)=>{
 if(r.path==='/api/campaigns'){if(r.method==='POST')snapshot=JSON.parse(r.body);return {status:200,body:snapshot}}
 if(r.path==='/api/local-engine/start')starts++;
 if(r.path==='/api/generate')return {status:200,body:{ready:false}};
 if(r.path.startsWith('/api/local-engine'))return {status:200,body:{state:'stopped',owned:false}};
 return {status:200,body:{recordings:[]}};
});
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1420,height:940,webPreferences:{offscreen:true,preload:path.resolve('desktop/build/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 const run=s=>win.webContents.executeJavaScript(s);
 const wait=async s=>{for(let i=0;i<80;i++){try{if(await run(s))return}catch(e){if(!/Script failed to execute/.test(String(e)))throw e};await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+s)};
 // Resolves once the reloaded document has finished loading, so a poll cannot be answered by the page that is being replaced.
 const reload=async()=>{const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.webContents.reload();await loaded};
 const select=async(label,value)=>run(`(()=>{const e=document.querySelector('select[aria-label="${label}"]');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 const search=async value=>run(`(()=>{const e=document.querySelector('input[aria-label="Search recorded events"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);
 try{
 await win.loadFile(path.resolve('desktop/build/renderer/index.html'));
 await wait("!!document.querySelector('.desk-pulse')");
 while(!snapshot)await new Promise(r=>setTimeout(r,100));
 const c=snapshot.campaigns[0],first=c.sessions[0].id;
 c.sessions.push({...c.sessions[0],id:'harbor-session',title:'The Harbor Bargain'});
 c.events=[{id:'history-a',sessionId:first,text:'The captain accepted the offer.',style:'Roleplay',enjoyment:'Loved it',date:new Date().toISOString()},{id:'history-b',sessionId:'harbor-session',text:'The party found a hidden quay.',style:'Exploration',enjoyment:'Neutral',date:new Date().toISOString()}];
 snapshot.campaigns.push({...structuredClone(c),id:'other-campaign',name:'Other campaign',events:[]});
 await reload();await wait("document.querySelector('.desk-pulse button:nth-child(2) strong')?.textContent==='1'");
 await run("document.querySelector('.desk-pulse button:nth-child(2)').click()");
 await wait("document.querySelectorAll('.chronicle .timeline-item').length===1");
 assert.equal(await run("document.querySelector('select[aria-label=\"Filter history by session\"]').value"),first);
 await select('Filter history by session','');
 await wait("document.querySelectorAll('.chronicle .timeline-item').length===2");
 await search('  harbor  ');
 await wait("document.querySelectorAll('.chronicle .timeline-item').length===1");
 await select('Filter history by enjoyment','Loved it');await wait("!!document.querySelector('.history-empty')");
 await select('Filter history by enjoyment','Neutral');await wait("!!document.querySelector('.history-open-session')");
 await select('Filter history by approach','Combat');await wait("!!document.querySelector('.history-empty')");
 await select('Filter history by approach','Exploration');await wait("!!document.querySelector('.history-open-session')");
 await run("document.querySelector('.history-open-session').click()");
 await wait("document.querySelector('.session-hero h2')?.textContent==='The Harbor Bargain'");
 assert(await run("document.querySelector('.desk-main').textContent.includes('The party found a hidden quay.')"));
 await run("document.querySelector('.history-return').click()");
 await wait("!!document.querySelector('.chronicle')");
 assert.equal(await run("document.querySelector('input[aria-label=\"Search recorded events\"]').value"),'  harbor  ');
 assert.equal(await run("document.querySelector('select[aria-label=\"Filter history by enjoyment\"]').value"),'Neutral');
 await run("[...document.querySelectorAll('.event-footer button')].find(b=>b.textContent==='Edit').click()");
 await wait("document.querySelector('#modal-title')?.textContent==='What actually happened?'");
 await run("(()=>{const e=[...document.querySelectorAll('.modal select')].find(s=>[...s.options].some(o=>o.text==='Loved it'));e.value='Loved it';e.dispatchEvent(new Event('change',{bubbles:true}))})()");
 await run("[...document.querySelectorAll('.modal button')].find(b=>b.textContent.includes('Save to chronicle')).click()");
 await wait("!document.querySelector('.modal')&&!!document.querySelector('.history-empty')");
 assert.equal(snapshot.campaigns[0].events.find(e=>e.id==='history-b').enjoyment,'Loved it');
 await run("document.querySelector('.history-results button').click()");await wait("document.querySelectorAll('.chronicle .timeline-item').length===2");
 for(const width of [900,1420]){win.setSize(width,940);await new Promise(r=>setTimeout(r,200));assert(await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'));fs.writeFileSync('.sites-runtime/history-'+width+'.png',(await win.webContents.capturePage()).toPNG())}
 await select('Filter history by session',first);
 await select('Choose campaign','other-campaign');
 await wait("document.querySelector('select[aria-label=\"Filter history by session\"]').value===''");
 assert(await run("document.querySelector('.chronicle').textContent.includes('No confirmed events yet')"));
 assert.equal(snapshot.campaigns[0].events.length,2);assert.equal(snapshot.campaigns[1].events.length,0);assert.equal(starts,0);
 console.log('History UI passed: session counter, combined filters, trimmed title search, empty states, linked-session round trip, campaign isolation, responsive layout, unchanged events and no AI startup.');app.exit(0);
 }catch(e){console.error(e);app.exit(1)}
});
