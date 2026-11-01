// Screen-reader announcements: table markers, notices and saves each reach a persistent live region.
//   node_modules/electron/dist/electron.exe scripts/ui-announce.cjs
const assert=require('node:assert/strict');
const {openSession,doStep,run,sleep}=require('./ui-harness.cjs');
run(async()=>{
 const s=await openSession({fixture:'demo'});
 const live=selector=>s.run(`[...document.querySelectorAll(${JSON.stringify(selector+'[role=status][aria-live=polite]')})].map(e=>e.textContent.trim()).filter(Boolean).join(' | ')`);
 // Table markers announce what was saved and removed.
 await doStep(s,['click','At the table']);await sleep(300);
 await doStep(s,['click','Promise']);await sleep(200);
 assert.match(await live('.table-markers .sr-only'),/^Promise marker saved$/);
 await doStep(s,['click','Ruling']);await sleep(200);
 assert.match(await live('.table-markers .sr-only'),/^Ruling marker saved$/);
 await s.run("document.querySelector('.marker-list button[aria-label^=Remove]').click()");await sleep(200);
 assert.match(await live('.table-markers .sr-only'),/marker removed$/);
 // A notice reaches the page-level region, and the visible toast stays out of the accessibility tree.
 await doStep(s,['click','Edit session plan']);await sleep(400);
 await s.setValue('.session-editor input','A renamed session');await sleep(150);
 await doStep(s,['click','Save session plan']);await sleep(500);
 const notice=await s.run("document.querySelector('.app>.sr-only[role=status]').textContent");assert(/Session notes saved/.test(notice),'Notice announcement: '+notice);
 assert.equal(await s.run("document.querySelector('.toast')?.getAttribute('aria-hidden')"),'true');
 // Saving is announced once the writes have settled.
 await sleep(2000);
 const saved=await s.run("[...document.querySelectorAll('.app>.sr-only[role=status]')].map(e=>e.textContent).join('|')");assert(/All changes saved/.test(saved),'Save announcement: '+saved);
 console.log('Announcements passed: marker saved and removed, notices, and settled saves reach live regions; the toast is hidden from assistive tech.');
 s.close();
});
