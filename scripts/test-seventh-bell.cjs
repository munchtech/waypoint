const {app,BrowserWindow,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE')throw e});
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'seventh-bell-ui-')));
let openedURL='';
let snapshot=JSON.parse(fs.readFileSync('../../outputs/The-Seventh-Bell.waypoint.json','utf8')),starts=0;
const fixturePages=snapshot.campaigns[0].memory.pages;fixturePages.find(p=>p.title.includes('1.4 Session Zero')).related=[fixturePages[0].id];
ipcMain.handle('waypoint:request',(_e,r)=>{
 if(r.path==='/api/campaigns'){if(r.method==='POST')snapshot=JSON.parse(r.body);return {status:200,body:snapshot}}
 if(r.path==='/api/local-engine/start')starts++;
 if(r.path==='/api/generate')return {status:200,body:{ready:false,provider:'comfyui',model:'test'}};
 if(r.path.startsWith('/api/local-engine'))return {status:200,body:{state:'stopped',owned:false}};
 return {status:200,body:{recordings:[]}};
});
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1420,height:940,webPreferences:{offscreen:true,preload:path.resolve('desktop/build/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 win.webContents.setWindowOpenHandler(({url})=>{openedURL=url;return {action:'deny'}});
 const run=s=>win.webContents.executeJavaScript(s);
 const wait=async s=>{for(let i=0;i<80;i++){try{if(await run(s))return}catch(e){if(!/Script failed to execute/.test(String(e)))throw e};await new Promise(r=>setTimeout(r,100))}throw Error('Timed out: '+s)};
 try{
  await win.loadFile(path.resolve('desktop/build/renderer/index.html'));
  await win.webContents.insertCSS('*{transition:none!important;animation:none!important}');
  await wait("document.querySelector('.session-hero h2')?.textContent.includes('Arrival at Pellmoor')");
  assert.equal(await run("document.querySelector('select[aria-label=\"Choose campaign\"]').value"),'the-seventh-bell-corvane-v3');
  for(const view of ['World wiki','Campaign hub','Next session','Session desk']){
   await run(`[...document.querySelectorAll('.sidebar .navitem')].find(b=>b.textContent.startsWith(${JSON.stringify(view)})).click()`);
   await wait(`document.querySelector('.breadcrumb span')?.textContent===${JSON.stringify(view)}`);
   if(view==='Campaign hub'){
    await wait("document.querySelectorAll('.reader-contents button').length===179");
    await run("[...document.querySelectorAll('.reader-contents button')].find(b=>b.textContent.includes('1.4 Session Zero')).click()");
    await wait("document.querySelector('.reader-page>h2')?.textContent.includes('1.4 Session Zero')");
    assert(await run("document.querySelectorAll('.book-text blockquote').length>0"));
    assert.equal(await run("document.querySelector('select[aria-label=\"Reader order\"]').value"),'campaign');
    assert((await run("document.querySelector('.reader-contents button').textContent")).includes('A Campaign of Corvane'));
    await run("[...document.querySelectorAll('.reader-actions button')].find(b=>b.textContent==='Edit page text').click()");
    await wait("!!document.querySelector('.reader-editor textarea')");
    await new Promise(r=>setTimeout(r,200));
    fs.writeFileSync('.sites-runtime/reader-editor.png',(await win.webContents.capturePage()).toPNG());
    const original=await run("document.querySelector('.reader-editor textarea').value");
    const edge='\n\n### Detail\n\n7. Seven\n8. Eight\n- Bullet\n\n~~~\n<script>alert(1)</script>\n~~~';
    await run(      "(()=>{const e=document.querySelector('.reader-editor textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,"+JSON.stringify(original+edge+'\n\n## Nested route\n\n[Jump to route](#nested-route) · [Guide][ref]\n\n- Parent\n  1. Child\n     - Grandchild\n\n> Outer\n> > Inner\n\n[ref]: https://example.com/guide\n\n| Name | Note |\n| --- | --- |\n| Bell | **Bold** |')+");e.dispatchEvent(new Event('input',{bubbles:true}))})()"    );
    await run("[...document.querySelectorAll('.reader-editor button')].find(b=>b.textContent.includes('Save and')).click()");
    await wait("!document.querySelector('.reader-editor')");
    assert.equal(await run("document.querySelector('.reader-page ol[start=\"7\"]')?.start"),7);
    assert.equal(await run("document.querySelector('.reader-page pre code')?.textContent"),'<script>alert(1)</script>');
    assert.equal(await run("document.querySelectorAll('.reader-page script').length"),0);
    assert.equal(await run("document.querySelector('.reader-page ul ol ul li')?.textContent"),'Grandchild');
    assert(await run("!!document.querySelector('.reader-page blockquote blockquote')"));
    await run("[...document.querySelectorAll('.reader-page a')].find(a=>a.textContent==='Guide').click()");
    assert.equal(openedURL,'https://example.com/guide');
    await run("[...document.querySelectorAll('.reader-page a')].find(a=>a.textContent==='Jump to route').click()");
    assert.equal(await run("document.activeElement.textContent"),'Nested route');
    fs.writeFileSync('.sites-runtime/markdown-nesting.png',(await win.webContents.capturePage()).toPNG());
    assert.equal(snapshot.campaigns[0].memory.pages.find(p=>p.title.includes('1.4 Session Zero')).history[0].body,original);

    assert(await run("document.querySelectorAll('.book-text strong').length>0"));
    assert(!(await run("document.querySelector('.reader-page').innerText")).includes('**SAY:**'));
    await run("[...document.querySelectorAll('.reader-pagination button')].find(b=>b.textContent.includes('Next')).click()");
    await wait("document.querySelector('.reader-page>h2')?.textContent.includes('1.5')");
    await run("[...document.querySelectorAll('.reader-pagination button')].find(b=>b.textContent.includes('Previous')).click()");
    await wait("document.querySelector('.reader-page>h2')?.textContent.includes('1.4')");
    await run("[...document.querySelectorAll('.reader-actions button')].find(b=>b.textContent==='Back to previous page').click()");
    await wait("document.querySelector('.reader-page>h2')?.textContent.includes('1.5')");
    await run("[...document.querySelectorAll('.sidebar .navitem')].find(b=>b.textContent.startsWith('World wiki')).click()");
    await wait("!!document.querySelector('.wiki-cards')");
    await run("[...document.querySelectorAll('.sidebar .navitem')].find(b=>b.textContent.startsWith('Campaign hub')).click()");
    await wait("document.querySelector('.reader-page>h2')?.textContent.includes('1.5')");
    await run("(()=>{const e=document.querySelector('input[aria-label=\"Search campaign reader\"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'zzzz-no-page');e.dispatchEvent(new Event('input',{bubbles:true}))})()");
    await wait("document.querySelector('.reader-page').textContent.includes('No pages match')");
    await run("document.querySelector('button[aria-label=\"Clear reader search\"]').click()");
    await wait("document.querySelector('.reader-page>h2')?.textContent.includes('1.5')");
    // Filtered related-page navigation must restore both the result set and order.
    const input=async (selector,value)=>run("(()=>{const e=document.querySelector("+JSON.stringify(selector)+");Object.getOwnPropertyDescriptor("+(selector.includes('textarea')?'HTMLTextAreaElement':'HTMLInputElement')+".prototype,'value').set.call(e,"+JSON.stringify(value)+");e.dispatchEvent(new Event('input',{bubbles:true}))})()");
    await run("document.querySelector('select[aria-label=\"Reader order\"]').value='title';document.querySelector('select[aria-label=\"Reader order\"]').dispatchEvent(new Event('change',{bubbles:true}))");
    await input('input[aria-label="Search campaign reader"]','1.4 Session Zero');
    await wait("document.querySelector('.reader-page>h2')?.textContent.includes('1.4 Session Zero')");
    const relatedTitle=await run("document.querySelector('.reader-related button')?.textContent");
    assert(relatedTitle,'Fixture should have a related page');
    await run("document.querySelector('.reader-related button').click()");
    await wait("document.querySelector('.reader-page>h2')?.textContent==="+JSON.stringify(relatedTitle));
    await run("document.querySelector('select[aria-label=\"Reader order\"]').value='campaign';document.querySelector('select[aria-label=\"Reader order\"]').dispatchEvent(new Event('change',{bubbles:true}))");
    await run("[...document.querySelectorAll('.reader-actions button')].find(b=>b.textContent==='Back to previous page').click()");
    await wait("document.querySelector('.reader-page>h2')?.textContent.includes('1.4 Session Zero')");
    assert.equal(await run("document.querySelector('select[aria-label=\"Reader order\"]').value"),'title');
    assert.equal(await run("document.querySelector('input[aria-label=\"Search campaign reader\"]').value"),'1.4 Session Zero');
    await run("document.querySelector('.reader-header button').click()");
    await run("[...document.querySelectorAll('.reader-actions button')].find(b=>b.textContent==='Find in contents').click()");
    await wait("!document.querySelector('.reader-focus')");
    await wait("document.activeElement.getAttribute('aria-current')==='page'");
    await run("[...document.querySelectorAll('.reader-actions button')].find(b=>b.textContent==='Edit page text').click()");
    const beforeDraft=await run("document.querySelector('.reader-editor textarea').value");
    await input('.reader-editor textarea',beforeDraft+'\nRecovered draft fixture');
    await run("[...document.querySelectorAll('.sidebar .navitem')].find(b=>b.textContent.startsWith('World wiki')).click()");
    await wait("!document.querySelector('.reader-editor')");
    await run("[...document.querySelectorAll('.sidebar .navitem')].find(b=>b.textContent.startsWith('Campaign hub')).click()");
    await wait("document.querySelector('.reader-editor textarea')?.value.endsWith('Recovered draft fixture')");
    // Recovery is a draft only; campaign data is unchanged until Save.
    assert.equal(snapshot.campaigns[0].memory.pages.find(p=>p.title.includes('1.4 Session Zero')).body,beforeDraft);
    await input('.reader-editor textarea',beforeDraft);
    await run("[...document.querySelectorAll('.reader-editor button')].find(b=>b.textContent==='Cancel').click()");
    await wait("!document.querySelector('.reader-editor')");
    await run("document.querySelector('button[aria-label=\"Clear reader search\"]').click()");
    for(const width of [900,1420]){win.setSize(width,940);await new Promise(r=>setTimeout(r,100));assert(await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'));fs.writeFileSync('.sites-runtime/reader-'+width+'.png',(await win.webContents.capturePage()).toPNG())}
   }
   await new Promise(r=>setTimeout(r,900));
   fs.writeFileSync('.sites-runtime/look-'+view.replaceAll(' ','-')+'.png',(await win.webContents.capturePage()).toPNG());
   assert((await run('document.body.innerText')).length>300);
   assert(await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'));
  }
  assert.equal(snapshot.campaigns[0].events.length,0);
  assert(snapshot.campaigns[0].memory.pages.every(p=>p.visibility==='DM only'));
  assert.equal(starts,0);
  const navStyle=await run(`(()=>{const s=getComputedStyle(document.querySelector('.sidebar .navitem.active'));return {color:s.color,background:s.backgroundColor}})()`);
  assert.equal(navStyle.color,'rgb(23, 42, 59)');assert.equal(navStyle.background,'rgb(232, 221, 197)');

  fs.writeFileSync('.sites-runtime/seventh-bell-desk.png',(await win.webContents.capturePage()).toPNG());
  await run("[...document.querySelectorAll('button')].find(b=>b.textContent==='Session notes').click()");
  await wait("!!document.querySelector('.desk-main .book-text')");
  for(const width of [900,1420]){win.setSize(width,940);await run("document.querySelector('.desk-main .book-text').scrollIntoView({block:'start'})");await new Promise(r=>setTimeout(r,350));assert(await run('document.documentElement.scrollWidth<=document.documentElement.clientWidth+2'));fs.writeFileSync('.sites-runtime/seventh-notes-'+width+'.png',(await win.webContents.capturePage()).toPNG())}
  console.log('Seventh Bell UI passed: selected campaign, opening session, wiki/hub/planner navigation, no overflow, no invented events, all lore DM-only, no AI startup.');
  fs.writeFileSync('.sites-runtime/seventh-result.json',JSON.stringify({passed:true,starts,pages:snapshot.campaigns[0].memory.pages.length}));app.exit(0);
 }catch(e){fs.writeFileSync('.sites-runtime/seventh-result.json',JSON.stringify({passed:false,error:String(e)}));console.error(e);app.exit(1)}
});

