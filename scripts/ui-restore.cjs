// Restore points in AI & backups: rows list the saved campaigns, Restore copy adds copies without touching existing campaigns, and failures are reported.
//   node_modules/electron/dist/electron.exe scripts/ui-restore.cjs
const assert=require('node:assert/strict');
const {openSession,doStep,run,sleep}=require('./ui-harness.cjs');
run(async()=>{
 const s=await openSession({fixture:'seventh-bell'});
 for(let i=0;i<50&&!s.state.snapshot?.campaigns?.length;i++)await sleep(100);
 const before=s.state.snapshot.campaigns.map(c=>({id:c.id,name:c.name,sessions:c.sessions.length}));
 await doStep(s,['click','AI & backups']);
 for(let i=0;i<50;i++){if(await s.run("document.querySelectorAll('.restore-list li').length===2"))break;await sleep(100)}
 const rows=await s.run("[...document.querySelectorAll('.restore-list li')].map(li=>li.innerText.replace(/\\s+/g,' ').trim())");
 assert.equal(rows.length,2,'Two restore points listed: '+JSON.stringify(rows));
 assert.match(rows[0],/^Today \d/);assert.match(rows[1],/^Yesterday \d/);
 assert(rows[0].includes('Before further edits')&&rows[1].includes('When Waypoint opened'),'Reasons shown: '+rows);
 assert(rows[0].includes(before[0].name),'Campaign names shown: '+rows[0]);
 const label=await s.run("document.querySelector('.restore-list li button').getAttribute('aria-label')");assert.match(label,/^Restore copy of the campaigns saved Today /);
 assert.equal(await s.run("document.activeElement.closest('.modal')!==null"),true,'Focus stays in the dialog');
 await s.run("document.querySelector('.restore-list li button').click()");
 for(let i=0;i<50;i++){if(s.state.snapshot.campaigns.length===before.length*2)break;await sleep(100)}
 const after=s.state.snapshot.campaigns;
 assert.equal(after.length,before.length*2,'Restored campaigns are added');
 assert.deepEqual(after.slice(0,before.length).map(c=>({id:c.id,name:c.name,sessions:c.sessions.length})),before,'Existing campaigns are unchanged');
 const added=after.slice(before.length);
 assert(added.every((c,i)=>/^.+ \(restored Today \d{1,2}:\d{2}.*\)$/.test(c.name)&&c.name.startsWith(before[i].name)&&!before.some(b=>b.id===c.id)),'Copies are renamed with new ids: '+added.map(c=>c.name));
 assert.equal(s.state.snapshot.active,added[0].id,'The first restored copy opens');
 await sleep(300);
 assert.equal(await s.run("!!document.querySelector('.modal')"),false,'The dialog closes after restoring');
 const notice=await s.run("document.querySelector('.app>.sr-only[role=status]')?.textContent||''");assert.match(notice,/campaigns? from Today .* restored as separate copies\./);
 // A point that cannot be read reports an error and changes nothing.
 const count=s.state.snapshot.campaigns.length;s.state.restoreFail=true;
 await doStep(s,['click','AI & backups']);for(let i=0;i<50;i++){if(await s.run("document.querySelectorAll('.restore-list li').length===2"))break;await sleep(100)}
 await s.run("document.querySelector('.restore-list li button').click()");await sleep(400);
 assert.match(await s.run("document.querySelector('.alert[role=alert]')?.textContent||''"),/no longer available/,'The failure is reported');
 assert.equal(await s.run("!!document.querySelector('.modal')"),true,'The dialog stays open after a failure');
 assert.equal(s.state.snapshot.campaigns.length,count,'A failed restore changes nothing');
 await s.key('Escape');await sleep(200);
 console.log('Restore points UI passed: rows show time, reason and campaigns; Restore copy adds renamed copies, keeps existing campaigns, opens the copy, closes the dialog and announces the result.');
 s.close();
});
