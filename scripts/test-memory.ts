import {responseSections} from '../lib/response-sections';
import {plainPreview} from '../lib/plain-text';
import {partySignals} from '../lib/party-signals';
import {spawn as spawnFixture} from 'node:child_process';
import {ManagedEngine,terminateOwnedProcess} from '../desktop/managed-engine';
import {EventEmitter} from 'node:events';
import type {ChildProcess} from 'node:child_process';
import {importTranscript,timestamp,transcriptText} from '../lib/transcript-import';
import {SaveQueue} from '../lib/save-queue';
import {recordingSchema} from '../lib/recording-metadata';
import {transcriptSchema} from '../lib/transcript';
import {handoutSchema} from '../lib/memory';
import {applyReview,relatedEvidence} from '../lib/session-review';
import {audioRange,reviseTranscript} from '../lib/transcript';
import {searchCampaign,composePlayerHandout,playerFacts} from '../lib/campaign-search';
import {playerDocument} from '../lib/player-display';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {demo,validateCampaign} from '../lib/campaign';
import {emptyMemory,groundedProposals,acceptProposal,memoryContext,toggleLever,plannerLeverInstructions,addTableMarker,removeTableMarker,markersForSession} from '../lib/memory';
import {CampaignStore,prunedPoints,RESTORE_RECENT,RESTORE_DAYS} from '../desktop/campaign-store';
import {DatabaseSync} from 'node:sqlite';

const note='[00:02:10] Voss claimed the king is dead. The party promised to investigate.';
const cards=[{title:'Voss',kind:'NPC',body:'Voss claims the king is dead; the truth is unknown.',readAloud:'Voss claimed the king is dead.'},{title:'Unsupported',kind:'Lore',body:'The queen fled.',readAloud:'The queen fled yesterday.'}];
const candidates=groundedProposals([...cards,cards[0]],note);assert.equal(candidates.length,1);assert.equal(candidates[0].body,cards[0].readAloud,'Initial wiki proposal must preserve exact evidence instead of AI embellishments');
let memory=emptyMemory();memory.notes.push({id:'source',title:'Test notes',sessionId:demo.sessions[0].id,text:note,date:'2026-10-10',summary:'',proposals:candidates});
memory=acceptProposal(memory,'source',candidates[0].id,'Rumor','DM only');
assert.equal(memory.pages[0].status,'Rumor');assert.equal(memory.pages[0].sourceId,'source');
assert.equal(acceptProposal(memory,'source',candidates[0].id,'Confirmed','Party knows').pages.length,1,'Repeated acceptance must not duplicate canon');
assert.equal(memoryContext({...demo,memory},true).wiki.length,0,'DM secrets must be excluded from party context');
assert.equal(memoryContext({...demo,memory}).wiki[0].status,'Rumor');
assert(validateCampaign({...demo,memory}));assert(!validateCampaign({...demo,memory:{pages:'invalid'}}));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'waypoint-migration-test-'));
const initial={version:1,campaigns:[demo],active:demo.id,sessionId:demo.sessions[0].id};
fs.writeFileSync(path.join(dir,'campaigns.json'),JSON.stringify(initial));
let store=new CampaignStore(dir);assert.deepEqual(store.read(),initial);assert(fs.existsSync(path.join(dir,'campaigns.pre-v2.json')));
const upgraded={...initial,version:2,campaigns:[{...demo,memory}]};store.save(upgraded);store.close();store=new CampaignStore(dir);assert.deepEqual(store.read(),upgraded);
assert.throws(()=>store.save({campaigns:[{...demo,memory:{notes:'broken'}}]}));assert.deepEqual(store.read(),upgraded);store.close();
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'campaigns.json'),'utf8')),initial,'Legacy save must remain untouched');
console.log('Passed: verified quotes, deduplication, rumor preservation, secret filtering, invalid-backup rejection, migration, transaction validation, reopen persistence and original-save preservation.');

const publicPage={...memory.pages[0],id:'public',title:'Captain Voss',body:'The party promised to return the courier.',visibility:'Party knows' as const,status:'Confirmed' as const,quote:'PRIVATE QUOTE',sourceId:'private-note',history:[{body:'OLD SECRET',date:'yesterday',status:'Confirmed' as const,visibility:'DM only' as const}]};
const publicRumor={...publicPage,id:'rumor',status:'Rumor' as const,body:'The king may be dead.'};
const future={...publicPage,id:'future',status:'Planned' as const,body:'FUTURE REVEAL'};
const searchCampaignFixture={...demo,memory:{...memory,pages:[...memory.pages,publicPage,publicRumor,future],pins:['public'],handouts:[]}};
assert(searchCampaign(searchCampaignFixture,'what did we promise Voss?').some(hit=>hit.id==='public'));
assert(searchCampaign(searchCampaignFixture,'Voss','Journal').every(hit=>hit.kind==='Journal'));
const publicText=composePlayerHandout(searchCampaignFixture,[memory.pages[0].id,'public','rumor','future']);
assert(publicText.includes('Rumor'));assert(!publicText.includes('FUTURE REVEAL'));assert(!publicText.includes('PRIVATE QUOTE'));assert(!publicText.includes('OLD SECRET'));
assert.equal(playerFacts(searchCampaignFixture,[memory.pages[0].id]).length,0);
const markup=playerDocument({title:'<script>alert(1)</script>',body:'<img src=x onerror=alert(1)>'});assert(!markup.includes('<script>'));assert(!markup.includes('<img'));assert(markup.includes('&lt;script&gt;'));
assert.throws(()=>playerDocument({title:'Bad',body:'Text',campaign:demo}),'Player payload must reject campaign objects');
const many=Array.from({length:70},(_,i)=>({...publicPage,id:'other-'+i,title:'Unrelated '+i,body:'A quiet village.',updated:'2026-10-11'}));
const selectedContext=memoryContext({...demo,memory:{...memory,pages:[...many,publicPage]}},false,'Captain Voss courier');assert(selectedContext.wiki.some(p=>p.id==='public'),'Relevant older pages must survive bounded context selection');
console.log('Passed: cross-campaign-source search, category filters, public-only recap assembly, rumor labels, secret/source-history exclusion, HTML escaping, strict player payload and bounded relevant retrieval.');

assert.deepEqual(audioRange('bytes=2-5',10),{start:2,end:5,status:206});
assert.deepEqual(audioRange('bytes=-4',10),{start:6,end:9,status:206});
assert.deepEqual(audioRange('bytes=8-99',10),{start:8,end:9,status:206});
for(const range of ['bytes=10-','bytes=5-2','bytes=-0','bytes=0-1,3-4','garbage'])assert.throws(()=>audioRange(range,10));
const transcript={segments:[{start:0,end:3,text:'Captain Boss'}]};
const corrected=reviseTranscript(transcript,{revision:0,segments:[{start:0,end:3,text:'Captain Voss',speaker:'Mara'}]});
assert.equal(corrected.revision,1);assert.equal(corrected.segments[0].speaker,'Mara');assert.equal(transcript.segments[0].text,'Captain Boss');
assert.throws(()=>reviseTranscript(corrected,transcript));
assert.throws(()=>reviseTranscript(transcript,{segments:[{start:1,end:3,text:'changed'}]}));
console.log('Transcript revision and streaming range checks passed.');

const reviewMemory=emptyMemory();
reviewMemory.pages=[{id:'voss',title:'Captain Voss',aliases:'Voss; Commander',kind:'NPC',body:'Voss guards the tower.',status:'Confirmed',visibility:'Party knows',sourceId:'old-source',quote:'guards the tower',updated:'2026-01-01',history:[]}];
reviewMemory.notes=[{id:'new-source',sessionId:'s',title:'After the session',text:'Voss fled the village.',date:'2026-01-02',summary:'',proposals:[{id:'change',title:'Voss',kind:'NPC',body:'Voss fled the village.',quote:'Voss fled the village.',state:'pending'}]}];
assert.equal(relatedEvidence(reviewMemory.notes[0].proposals[0],reviewMemory.pages)[0].id,'voss');
assert.equal(relatedEvidence({...reviewMemory.notes[0].proposals[0],title:'Vosson'},reviewMemory.pages).length,0);
const merged=applyReview(reviewMemory,'new-source','change','voss','Rumor','DM only');
assert.equal(merged.pages.length,1);assert.equal(merged.pages[0].history[0].sourceId,'old-source');assert.equal(merged.pages[0].history[0].quote,'guards the tower');
assert.equal(merged.pages[0].visibility,'DM only');assert.equal(merged.pages[0].status,'Rumor');assert.equal(merged.pages[0].sourceId,'new-source');
assert.equal(merged.notes[0].proposals[0].appliedToExisting,true);assert.equal(reviewMemory.pages[0].body,'Voss guards the tower.');
assert.deepEqual(applyReview(merged,'new-source','change','voss','Confirmed','Party knows'),merged);
assert.throws(()=>applyReview(reviewMemory,'new-source','change','missing','Rumor','DM only'));
assert.equal(validateCampaign({...demo,memory:merged}),true);
const prioritized={...demo,memory:{...emptyMemory(),pages:Array.from({length:45},(_,i)=>({...reviewMemory.pages[0],id:'thread'+i,updated:'2026-01-01'})),planner:{...emptyMemory().planner,threadIds:['thread44']}}};
assert.equal(memoryContext(prioritized).wiki[0].id,'thread44');
console.log('Session review matching, append history, privacy, repeat protection and prioritized threads passed.');

const queue=new SaveQueue(),writes:number[]=[];let unblock!:()=>void;
const first=queue.enqueue(async()=>{await new Promise<void>(resolve=>{unblock=resolve});writes.push(1)});
const second=queue.enqueue(async()=>{writes.push(2)});
await Promise.resolve();assert.deepEqual([...writes],[]);unblock();await Promise.all([first,second]);assert.deepEqual([...writes],[1,2]);
await assert.rejects(queue.enqueue(async()=>{throw new Error('disk full')}));await queue.enqueue(async()=>{writes.push(3)});assert.deepEqual([...writes],[1,2,3]);
const rid='11111111-1111-4111-8111-111111111111';
const recording={id:rid,campaignId:'test',sessionId:'test',title:'Fixture',created:'2026-10-12',file:rid+'.wav',bytes:12,chunks:1,state:'complete',markers:[]};
assert(recordingSchema.safeParse(recording).success);assert(!recordingSchema.safeParse({...recording,file:'../private.txt'}).success);assert(!recordingSchema.safeParse({...recording,created:null}).success);
assert(!transcriptSchema.safeParse({segments:[{start:2,end:1,text:'Invalid'}]}).success);
assert(!handoutSchema.safeParse({id:'h',title:'Too long',body:'x'.repeat(30001),sourcePageIds:[],updated:''}).success);
const recoveryDir=fs.mkdtempSync(path.join(os.tmpdir(),'waypoint-save-audit-'));const recoveryStore=new CampaignStore(recoveryDir);
const stateA={campaigns:[demo],active:demo.id,sessionId:demo.sessions[0].id};const stateB={...stateA,campaigns:[{...demo,name:'Updated name'}]};recoveryStore.save(stateA);recoveryStore.save(stateB);recoveryStore.save(stateB);assert.deepEqual(recoveryStore.previous(),stateA);recoveryStore.close();
{
 // Restore points: kept on open and before the first save after a 15-minute gap, deduplicated, compressed, and pruned.
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'waypoint-restore-'));let now=Date.UTC(2026,9,22,12);const state=(name:string)=>({version:2,campaigns:[{...demo,name}],active:demo.id,sessionId:demo.sessions[0].id});
 let rp=new CampaignStore(dir,()=>now);assert.deepEqual(rp.restorePoints(),[]);
 rp.save(state('A'));assert.equal(rp.restorePoints().length,0,'Nothing to keep before the first save');
 now+=1000;rp.save(state('B'));let points=rp.restorePoints();assert.equal(points.length,1);assert.equal(points[0].reason,'autosave');assert.deepEqual(rp.restorePoint(points[0].id),state('A'),'The point holds the state before the edit');assert.deepEqual(points[0].campaigns,[{name:'A',sessions:demo.sessions.length}]);
 now+=5*60*1000;rp.save(state('C'));assert.equal(rp.restorePoints().length,1,'No point within 15 minutes');
 now+=15*60*1000;rp.save(state('D'));points=rp.restorePoints();assert.equal(points.length,2);assert.deepEqual(rp.restorePoint(points[0].id),state('C'));assert(points[0].created>points[1].created,'Newest first');
 assert.deepEqual(rp.previous(),state('C'),'The previous snapshot is unchanged');assert(points[0].bytes<JSON.stringify(state('C')).length/2,'Points are compressed');
 assert.throws(()=>rp.restorePoint(9999),/no longer available/);rp.close();
 rp=new CampaignStore(dir,()=>now);points=rp.restorePoints();assert.equal(points.length,3);assert.equal(points[0].reason,'opened');assert.deepEqual(rp.restorePoint(points[0].id),state('D'));rp.close();
 rp=new CampaignStore(dir,()=>now);assert.equal(rp.restorePoints().length,3,'Reopening without changes adds nothing');
 for(let i=0;i<40;i++){now+=16*60*1000;rp.save(state('Edit '+i))}points=rp.restorePoints();assert(points.length>=RESTORE_RECENT&&points.length<=RESTORE_RECENT+RESTORE_DAYS,'Pruned to '+points.length);assert.deepEqual(rp.restorePoint(points[0].id),state('Edit 38'));rp.close();
 const db=new DatabaseSync(path.join(dir,'waypoint.sqlite'));assert.equal((db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version,1,'Older builds can still open the database');db.close();
 const day=24*3600*1000,base=Date.UTC(2026,9,22,12),rows=[...Array.from({length:RESTORE_RECENT},(_,i)=>({id:1000+i,created:base-i*60000})),...Array.from({length:40},(_,i)=>({id:i,created:base-(Math.floor(i/2)+1)*day-(i%2)*60000}))];
 const drop=prunedPoints(rows);assert.equal(drop.length,40-RESTORE_DAYS,'One point per earlier day for '+RESTORE_DAYS+' days');assert(Array.from({length:RESTORE_DAYS},(_,d)=>2*d).every(id=>!drop.includes(id)),'The newest point of each day is kept');assert(!drop.some(id=>id>=1000),'The recent points are kept');
 console.log('Restore points passed: kept on open and after a quiet interval, hold the pre-edit state, deduplicated, compressed, pruned to recent plus daily, schema version unchanged.');
}
console.log('Audit regressions passed: ordered writes, recovery after failure, preserved previous snapshot, invalid recording metadata, timestamps and handout limits.');

const importRecording={id:'recording-fixture',sessionId:'session-demo',title:'Test session'};
const importData={revision:0,segments:[{start:0,end:1,text:'A promise was made.',speaker:'Mara'}]};
const importedNotes=importTranscript(importRecording,importData,[]);
assert.equal(importedNotes.length,1);assert(importedNotes[0].text.includes('Mara: A promise was made.'));
assert.equal(importTranscript(importRecording,importData,importedNotes).length,0);
assert.equal(importTranscript(importRecording,importData,[{...importedNotes[0],id:'recording-recording-fixture-0'}]).length,0);
assert.equal(importTranscript(importRecording,{...importData,revision:1},importedNotes).length,1);
assert.throws(()=>importTranscript(importRecording,{segments:[{start:0,end:1,text:'   '}]},[]));
const longImport=importTranscript(importRecording,{segments:Array.from({length:10},(_,i)=>({start:i,end:i+1,text:'a'.repeat(10000)}))},[]);
assert(longImport.length>1);assert(longImport.every(n=>n.text.length<=28000));assert.equal(longImport.map(n=>n.text).join(''),transcriptText({revision:0,segments:Array.from({length:10},(_,i)=>({start:i,end:i+1,text:'a'.repeat(10000)}))}));
assert.equal(timestamp(25*3600+61),'25:01:01');
console.log('Transcript import regressions passed: legacy deduplication, corrected revisions, speaker labels, empty speech, lossless splitting and long-duration timestamps.');

const engineConfig={provider:'comfyui' as const,baseURL:'http://127.0.0.1:8188',model:'test',comfyInstall:'test',autoStart:true};
let launches=0,terminations=0;let finishInspect!:()=>void;
const fakeChild=new EventEmitter() as ChildProcess;
const managed=new ManagedEngine({occupied:async()=>false,spawn:()=>{launches++;return fakeChild},inspect:()=>new Promise<void>(r=>{finishInspect=r}),terminate:async()=>{terminations++},wait:async()=>{}});
assert.equal(managed.status().state,'stopped');assert.equal(launches,0);
await managed.start(engineConfig);assert.equal(launches,1);assert.equal(managed.status().state,'starting');
await managed.start(engineConfig);assert.equal(launches,1);
assert.throws(()=>managed.assertSettings({...engineConfig,baseURL:'http://127.0.0.1:8190'}));
await Promise.all([managed.stop(),managed.stop()]);finishInspect();await Promise.resolve();assert.equal(terminations,1);assert.equal(managed.status().state,'stopped');assert.equal(managed.status().owned,false);
const external=new ManagedEngine({occupied:async()=>true,spawn:()=>{throw new Error('Must not spawn')},inspect:async()=>{},terminate:async()=>{throw new Error('Must not stop external server')},wait:async()=>{}});
await external.start(engineConfig);assert.equal(external.status().state,'external');await external.stop();
let finishPort!:(value:boolean)=>void;
const cancelled=new ManagedEngine({occupied:()=>new Promise<boolean>(r=>{finishPort=r}),spawn:()=>{throw new Error('Cancelled startup spawned a server')},inspect:async()=>{},terminate:async()=>{},wait:async()=>{}});
const pendingStart=cancelled.start(engineConfig);await cancelled.stop();finishPort(false);await pendingStart;assert.equal(cancelled.status().state,'stopped');
const readyChild=new EventEmitter() as ChildProcess;
const readyEngine=new ManagedEngine({occupied:async()=>false,spawn:()=>readyChild,inspect:async()=>{},terminate:async()=>{},wait:async()=>{}});
await readyEngine.start(engineConfig);await Promise.resolve();assert.equal(readyEngine.status().state,'running');readyChild.emit('exit',1);assert.equal(readyEngine.status().state,'failed');assert.equal(readyEngine.status().owned,false);
console.log('Managed AI lifecycle passed: explicit start, duplicate-click protection, cancelled startup, stop during readiness checks, shared stop, external-server isolation, settings lock and process exit.');

const processFixture=spawnFixture(process.execPath,['-e','setInterval(()=>{},1000)'],{windowsHide:true,stdio:'ignore'});
await new Promise<void>((resolve,reject)=>{processFixture.once('spawn',resolve);processFixture.once('error',reject)});
const exited=new Promise<void>(resolve=>processFixture.once('exit',()=>resolve()));
await terminateOwnedProcess(processFixture);await exited;
assert(processFixture.exitCode!==null||processFixture.signalCode!==null);
console.log('Real owned-process shutdown passed using an isolated Node fixture.');

const failedChild=new EventEmitter() as ChildProcess;
const failedStop=new ManagedEngine({occupied:async()=>false,spawn:()=>failedChild,inspect:async()=>{},terminate:async()=>{throw new Error('fixture stop failure')},wait:async()=>{}});
await failedStop.start(engineConfig);await assert.rejects(failedStop.stop());assert.equal(failedStop.status().owned,true);assert.equal(failedStop.status().state,'failed');await failedStop.start(engineConfig);assert.equal(failedStop.status().state,'failed');
console.log('Failed shutdown preserves ownership and blocks duplicate launch.');

{
 const fixture=structuredClone(demo);
 fixture.events=Array.from({length:25},(_,i)=>({id:'signal-'+i,sessionId:fixture.sessions[0].id,text:'Observed action '+i,style:'Roleplay' as const,enjoyment:(i===24?'Loved it':i===23?'Less of this':'Neutral') as 'Loved it'|'Less of this'|'Neutral',date:new Date().toISOString()}));
 const result=partySignals(fixture),roleplay=result.styles.find(s=>s.style==='Roleplay')!;
 assert.equal(result.sampleSize,20);assert.equal(roleplay.observed,20);assert.equal(roleplay.loved,1);assert.equal(roleplay.lessOfThis,1);assert.equal(roleplay.neutral,18);assert.equal(roleplay.evidence[1].eventId,'signal-24');
 fixture.events=[];assert.match(partySignals(fixture).caveat,/Limited history/);
 console.log('Party evidence passed: bounded recent history, separate observed/enjoyment signals, source IDs and sparse-history caveat.');
}

{
 assert.deepEqual(responseSections('An unstructured response.'),[{label:'',text:'An unstructured response.'}]);
 const parts=responseSections('Intro\nSAY NOW: Hello. ASK: What do you offer? IF THEY FAIL: Pay a cost. NEXT OPENING: Visit the well.');
 assert.equal(parts.length,5);assert.equal(parts[0].text,'Intro');assert.equal(parts[2].text,'What do you offer?');assert.equal(parts[4].text,'Visit the well.');
 const pinned=structuredClone(demo);pinned.sessions[0].pinnedCardId='fixture';assert(validateCampaign(pinned));
 assert(!validateCampaign({...pinned,sessions:[{...pinned.sessions[0],pinnedCardId:42}]}));
 console.log('Reference cards passed: labeled/plain text preservation and backward-compatible pin validation.');
}

{
 const c=structuredClone(demo);c.sessions[0].debrief={remember:'They enjoyed bargaining',openQuestions:'Who hired the courier?',nextFocus:'Explore the well'};
 assert(validateCampaign(c));assert(validateCampaign(JSON.parse(JSON.stringify(c))));
 assert(!validateCampaign({...c,sessions:[{...c.sessions[0],debrief:{remember:42,openQuestions:'',nextFocus:''}}]}));
 assert(!validateCampaign({...c,sessions:[{...c.sessions[0],debrief:{remember:'x'.repeat(3001),openQuestions:'',nextFocus:''}}]}));
 console.log('Session debrief validation passed: roundtrip, invalid type and oversized note rejection.');
}
{
 const base=emptyMemory();
 const session=demo.sessions[0];
 // Planner levers: tone choices replace each other, shape choices combine, unknown ids are ignored.
 let levers=toggleLever([],'more-combat');
 levers=toggleLever(levers,'more-mystery');
 assert.deepEqual(levers,['more-mystery']);
 levers=toggleLever(levers,'add-twist');
 levers=toggleLever(levers,'two-hours');
 assert.deepEqual(levers,['more-mystery','add-twist','two-hours']);
 assert.deepEqual(toggleLever(levers,'more-mystery'),['add-twist','two-hours']);
 assert.deepEqual(toggleLever(levers,'unknown'),levers);
 const instructions=plannerLeverInstructions(['two-hours','unknown','more-combat']);
 assert.equal(instructions.length,2);
 assert.match(instructions[0],/^Give combat more weight/);
 assert.match(instructions[1],/^Fit the plan into about two hours/);
 // Live markers: session-scoped, newest first, trimmed, removable.
 let memory=base;
 memory=addTableMarker(memory,{id:'m1',sessionId:session.id,kind:'Promise',text:'  Voss will send the letter  ',created:'2026-10-21T20:00:00.000Z'});
 memory=addTableMarker(memory,{id:'m2',sessionId:'other-session',kind:'Ruling',text:'',created:'2026-10-21T20:01:00.000Z'});
 memory=addTableMarker(memory,{id:'m3',sessionId:session.id,kind:'Loved this',text:'',created:'2026-10-21T20:02:00.000Z'});
 assert.deepEqual(markersForSession(memory,session.id).map(k=>k.id),['m3','m1']);
 assert.equal(memory.markers?.[0].text,'Voss will send the letter');
 memory=removeTableMarker(memory,'m3');
 assert.deepEqual(markersForSession(memory,session.id).map(k=>k.id),['m1']);
 // Markers and levers pass the campaign schema; saves written before them still validate.
 const campaign={...demo,memory:{...memory,planner:{...memory.planner,levers:['more-mystery']}}};
 assert(validateCampaign(JSON.parse(JSON.stringify(campaign))));
 assert(validateCampaign({...demo,memory:{...base}}));
 // Live markers are DM context for generation, and never reach player-safe context.
 const dmContext=memoryContext(campaign);
 assert.deepEqual(dmContext.tableMarkers.map(k=>k.kind),['Promise','Ruling']);
 assert.equal(dmContext.tableMarkers[0].session,session.title);
 assert.equal(dmContext.planningPreferences.leverInstructions.length,1);
 assert.deepEqual(memoryContext(campaign,true).tableMarkers,[]);
 assert.equal(JSON.stringify(memoryContext(campaign,true)).includes('Voss will send the letter'),false);
 console.log('Live marker and planner lever checks passed: session scoping, trimming, DM-only player context, schema compatibility.');
}
{
 assert.equal(plainPreview('**Overall arc:** The party begins.'),'Overall arc: The party begins.');
 assert.equal(plainPreview('*Revision 2. Rebuilt after an audit.*'),'Revision 2. Rebuilt after an audit.');
 assert.equal(plainPreview('*Revision 2. Rebuilt after a cut'),'Revision 2. Rebuilt after a cut');
 assert.equal(plainPreview('| Bargain | With | Terms |\n|---|---|---|\n| a | b | c |'),'Bargain · With · Terms a · b · c');
 assert.equal(plainPreview('| Bargain | With | Terms |\n|---|---|---|\n| | | |\n| | | |'),'Bargain · With · Terms');
 assert.equal(plainPreview('- [ ] Re-read the **Act** you are in\n- [x] Done'),'Re-read the Act you are in Done');
 assert.equal(plainPreview('# Heading\n\n> quoted [link](http://x.y) text ~~old~~ `code`'),'Heading quoted link text old code');
 assert.equal(plainPreview('snake_case_word and 2*3*4 stay'),'snake_case_word and 2*3*4 stay');
 assert(plainPreview('word '.repeat(100),40).endsWith('…')&&plainPreview('word '.repeat(100),40).length<=41);
 assert.equal(plainPreview('Short text',160),'Short text');
 console.log('Plain previews passed: emphasis, tables, task lists, links, open marks and truncation.');
}
