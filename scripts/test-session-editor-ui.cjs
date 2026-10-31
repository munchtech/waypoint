const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE')throw e});
const resume=process.argv.find(a=>a.startsWith('--resume='))?.slice(9);
if(resume&&!path.resolve(resume).startsWith(path.join(os.tmpdir(),'waypoint-editor-ui-')))throw Error('Only isolated editor fixtures may be resumed');
const dataDir=resume||fs.mkdtempSync(path.join(os.tmpdir(),'waypoint-editor-ui-'));
app.setPath('userData',dataDir);
let snapshot=resume?JSON.parse(fs.readFileSync(path.join(dataDir,'fixture.json'),'utf8')):null,starts=0;
ipcMain.handle('waypoint:request',(_e,r)=>{
 if(r.path==='/api/campaigns'){if(r.method==='POST')snapshot=JSON.parse(r.body);return {status:200,body:snapshot}}
 if(r.path==='/api/local-engine/start')starts++;
 if(r.path==='/api/generate')return {status:200,body:{ready:false}};
 if(r.path.startsWith('/api/local-engine'))return {status:200,body:{state:'stopped',owned:false}};
 return {status:200,body:{recordings:[]}};
});
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1420,height:940,webPreferences:{offscreen:true,preload:path.resolve('desktop/build/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 const run=async s=>{try{return await win.webContents.executeJavaScript(s)}catch(e){console.error('Renderer expression:',s);throw e}};
 const wait=async s=>{for(let i=0;i<80;i++){try{if(await run(s))return}catch(e){if(!/Script failed to execute/.test(String(e)))throw e};await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+s)};
 const click=async text=>{await run(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim().replace(/Session desk\\d+$/,'Session desk')===${JSON.stringify(text)}).click()`);await new Promise(r=>setTimeout(r,70))};
 const type=async(selector,value)=>{await run(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await new Promise(r=>setTimeout(r,70))};
 const close=async()=>{await run("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");await wait("!document.querySelector('.modal')")};
 const reload=async()=>{const loaded=new Promise(r=>win.webContents.once('did-finish-load',r));win.webContents.reload();await loaded;await wait("!!document.querySelector('.desk-pulse')")};
 const openPlan=async()=>{await click('Edit session plan');await wait("!!document.querySelector('.session-editor textarea')")};
 try{
 await win.loadFile(path.resolve('desktop/build/renderer/index.html'));await wait("!!document.querySelector('.desk-pulse')");
 while(!snapshot)await new Promise(r=>setTimeout(r,100));
 if(resume){
  await click('Chronicle');await click('Edit');
  assert.equal(await run("document.querySelector('.session-editor textarea').value"),'Edited but not confirmed');
  assert.equal(snapshot.campaigns[0].events[0].text,'The party bargained with the keeper.');
  await close();snapshot.campaigns[0].events[0].text='A newer confirmed correction';await reload();await click('Chronicle');await click('Edit');
  assert(await run("!!document.querySelector('.editor-conflict')"));assert(await run("document.querySelector('.editor-actions .primary').disabled"));
  assert(await run("document.querySelector('.editor-conflict pre').textContent.includes('A newer confirmed correction')"));
  await click('Discard unfinished edits…');await click('Discard draft');assert.equal(snapshot.campaigns[0].events[0].text,'A newer confirmed correction');
  assert.equal(starts,0);console.log('Full-process restart passed: outcome draft recovered; history unchanged until explicitly saved. Outcome conflict blocks overwrite and discard preserves newer history.');app.exit(0);return;
 }
 snapshot.campaigns[0].events=[];
 const original=structuredClone(snapshot.campaigns[0]),first=original.sessions[0].id;
 snapshot.campaigns[0].sessions.push({...original.sessions[0],id:'second',title:'Second session'});
 snapshot.campaigns.push({...structuredClone(original),id:'other',name:'Other campaign'});
 await reload();
 const draft='# Arrival at the old bell\n\n## Questions to ask\n\n- Who holds the **key**?\n- Where did the keeper go?\n\n> The bell rings once.\n\n| Choice | Response |\n| --- | --- |\n| Bargain | Offer a clue |';
 await openPlan();await type('.session-editor input','A recovered session');await type('.session-editor textarea',draft);await close();
 assert.equal(snapshot.campaigns[0].sessions[0].plan,original.sessions[0].plan);
 await click('Campaign');await click('Session desk');await openPlan();
 assert.equal(await run("document.querySelector('.session-editor textarea').value"),draft);
 await run("document.querySelector('.modal-overlay').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");await wait("!document.querySelector('.modal')");
 await reload();await openPlan();assert.equal(await run("document.querySelector('.session-editor input').value"),'A recovered session');
 await close();await run("(()=>{const e=document.querySelector('select[aria-label=\"Session\"]');e.value='second';e.dispatchEvent(new Event('change',{bubbles:true}))})()");await openPlan();assert.equal(await run("document.querySelector('.session-editor input').value"),'Second session');await close();
 await run(`(()=>{const e=document.querySelector('select[aria-label="Session"]');e.value=${JSON.stringify(first)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`);await openPlan();assert.equal(await run("document.querySelector('.session-editor input').value"),'A recovered session');
 await click('Preview formatting');await wait("!!document.querySelector('.editor-preview table')");
 for(const width of [900,1420]){win.setSize(width,940);await new Promise(r=>setTimeout(r,350));assert(await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'));fs.writeFileSync('.sites-runtime/editor-plan-'+width+'.png',(await win.webContents.capturePage()).toPNG())}
 await close();snapshot.campaigns[0].sessions[0].plan='A newer saved plan';await reload();await openPlan();
 assert(await run("!!document.querySelector('.editor-conflict')"));assert(await run("document.querySelector('.editor-actions .primary').disabled"));
 await click('Use my draft over this version');await run("document.querySelector('.session-editor textarea').dispatchEvent(new KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true}))");await wait("!document.querySelector('.modal')");
 assert.equal(snapshot.campaigns[0].sessions[0].plan,draft);
 await click('Session notes');await wait("!!document.querySelector('.desk-main .book-text table')");
 await openPlan();assert(!(await run("document.querySelector('.editor-draft-status').textContent.includes('Recovered')")));await type('.session-editor textarea','Discard me');await click('Discard unfinished edits…');await click('Keep editing');assert.equal(await run("document.querySelector('.session-editor textarea').value"),'Discard me');await click('Discard unfinished edits…');await click('Discard draft');await openPlan();assert.equal(await run("document.querySelector('.session-editor textarea').value"),draft);await close();
 await click('Chronicle');await click('Record an event');await type('.session-editor textarea','The party bargained with the keeper.');
 await run("(()=>{const e=[...document.querySelectorAll('.session-editor select')].at(-1);e.value='Loved it';e.dispatchEvent(new Event('change',{bubbles:true}))})()");await close();assert.equal(snapshot.campaigns[0].events.length,0);
 await reload();await click('Chronicle');await click('Record an event');assert.equal(await run("document.querySelector('.session-editor textarea').value"),'The party bargained with the keeper.');
 for(const width of [900,1420]){win.setSize(width,940);await new Promise(r=>setTimeout(r,350));fs.writeFileSync('.sites-runtime/editor-outcome-'+width+'.png',(await win.webContents.capturePage()).toPNG())}
 await click('Save to chronicle');await wait("document.querySelectorAll('.chronicle .timeline-item').length===1");assert.equal(snapshot.campaigns[0].events[0].enjoyment,'Loved it');
 await click('Edit');await type('.session-editor textarea','Edited but not confirmed');await close();await click('Edit');assert.equal(await run("document.querySelector('.session-editor textarea').value"),'Edited but not confirmed');await close();
 await run("(()=>{const e=document.querySelector('select[aria-label=\"Choose campaign\"]');e.value='other';e.dispatchEvent(new Event('change',{bubbles:true}))})()");await click('Record an event');assert.equal(await run("document.querySelector('.session-editor textarea').value"),'');await close();
 assert.equal(snapshot.campaigns[0].events[0].text,'The party bargained with the keeper.');assert.equal(snapshot.campaigns[1].events.length,0);assert.equal(starts,0);
 await click('Record an event');
 await run("window.restoreDraftStorage=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('fixture quota failure')};void 0");
 await type('.session-editor textarea','Storage failure must not lose this text');
 await run("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))");assert(await run("!!document.querySelector('.session-editor')"));
 await run("document.querySelector('.modal-close').click()");assert(await run("!!document.querySelector('.session-editor')"));
 await run("document.querySelector('.modal-overlay').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");assert(await run("!!document.querySelector('.session-editor')"));
 await run("Storage.prototype.setItem=window.restoreDraftStorage;void 0");await click('Retry draft save');await close();await click('Record an event');assert.equal(await run("document.querySelector('.session-editor textarea').value"),'Storage failure must not lose this text');await close();
 snapshot.active=snapshot.campaigns[0].id;snapshot.sessionId=first;
 fs.writeFileSync(path.join(dataDir,'fixture.json'),JSON.stringify(snapshot));win.webContents.session.flushStorageData();
 console.log('RESTART_FIXTURE='+dataDir);
 console.log('Session editor UI passed: Escape, backdrop, navigation, reload recovery, plan conflict, Ctrl+S, formatted notes, preview, explicit discard, outcome recovery and feedback, campaign isolation, unconfirmed drafts, no AI startup.');app.exit(0);
 }catch(e){console.error(e);app.exit(1)}
});

