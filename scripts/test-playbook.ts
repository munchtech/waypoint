// Playbook and update-pack checks: run `node .sites-runtime/playbook-tests/test-playbook.mjs [campaign-backup.json]` after build-desktop.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateCampaign,demo,type Campaign} from '../lib/campaign';
import {memoryOf} from '../lib/memory';
import {applyUpdate,planUpdate,updatePackSchema} from '../lib/update-pack';
import {applyChanges,blockers,clockAlerts,difficulty,encounterXP,forecast,isPossible,partyBudget,rankPlays,resolveEffects,ripple,searchPlays,setFlag,stateOf,undoEntry} from '../lib/playbook';
import packJson from '../lib/packs/seventh-bell-v6.json';

const pack=updatePackSchema.parse(packJson);
let failures=0;const test=(name:string,fn:()=>void)=>{try{fn();console.log('ok  ',name)}catch(e){failures++;console.log('FAIL',name,'\n    ',e instanceof Error?e.message:e)}};
// Defaults to the imported v5 campaign beside the app; pass a backup or restore-point export to check a live campaign.
const fallback=new URL('../../../../outputs/The-Seventh-Bell-v5.waypoint.json',import.meta.url),backup=process.argv[2]||(fs.existsSync(fallback)?fallback:'');
const base:Campaign=backup?(JSON.parse(fs.readFileSync(backup,'utf8')).campaigns as Campaign[]).find(c=>c.id==='the-seventh-bell-corvane-v5')!:{...demo,id:'the-seventh-bell-corvane-v5',name:'The Seventh Bell'};
const all=new Set(planUpdate(base,pack).map(p=>p.id));
const installed=applyUpdate(base,pack,all);
const pb=memoryOf(installed).playbook!;

test('the bundled pack parses and targets the Seventh Bell',()=>{assert.equal(pack.id,'seventh-bell-v6');assert.ok(pack.playbook)});
test('installing produces a valid campaign',()=>assert.ok(validateCampaign(installed)));
if(backup){
 test('every planned change is ready on the live campaign (no conflicts)',()=>{const plan=planUpdate(base,pack);assert.deepEqual(plan.filter(p=>p.status==='conflict').map(p=>p.label+': '+p.detail),[])});
 test('the DM’s own plan additions survive (IsoForge kits)',()=>{for(const s of base.sessions.slice(0,3)){const tail=s.plan.slice(s.plan.indexOf('## IsoForge'));if(s.plan.includes('## IsoForge'))assert.ok(installed.sessions.find(x=>x.id===s.id)!.plan.endsWith(tail))}});
 test('Session 1 opens at Pellmoor Landing',()=>assert.match(installed.sessions[0].plan,/Pellmoor Landing comes into sight/));
 test('replaced wiki text moves to revision history',()=>{const page=memoryOf(installed).pages.find(p=>p.id==='sb-462b2b0d93fd03c2')!;assert.equal(page.title,'PELLMOOR LANDING (Port)');assert.match(page.history[0].body,/About 300, mostly Ferry-folk/)});
 test('existing pages, cards and events are all kept',()=>{const m0=memoryOf(base),m1=memoryOf(installed);for(const p of m0.pages)assert.ok(m1.pages.some(x=>x.id===p.id),p.title);assert.equal(installed.cards.length,base.cards.length);assert.equal(installed.events.length,base.events.length)});
 test('installing twice changes nothing more',()=>{const again=applyUpdate(installed,pack,new Set(planUpdate(installed,pack).map(p=>p.id)));assert.deepEqual(planUpdate(installed,pack).filter(p=>p.status==='ready').map(p=>p.id),[]);assert.equal(JSON.stringify(again),JSON.stringify(installed))});
}
test('a refreshed playbook keeps recorded world state',()=>{const played=applyChanges(pb,[{flag:'t_ossa',from:'ila',to:'court'}],{sessionId:'x',title:'test'});const c={...installed,memory:{...memoryOf(installed),playbook:played}};const refreshed={...pack,playbook:{...pack.playbook!,version:'6.1'}};const next=applyUpdate(c,refreshed,new Set(['playbook']));assert.equal(stateOf(memoryOf(next).playbook!).t_ossa,'court');assert.equal(memoryOf(next).playbook!.log.length,1)});
test('state starts at the campaign opening',()=>{const s=stateOf(pb);assert.equal(s.t_ossa,'ila');assert.equal(s.bell_ossa,'unrung');assert.equal(s.tithe_clock,0)});
test('conditions hide plays that are no longer possible',()=>{const play=installed.sessions[0].branches.find(b=>b.id==='s01-hand-to-quill')!;assert.ok(isPossible(pb,play));const moved=applyChanges(pb,[{flag:'t_ossa',from:'ila',to:'court'}],{sessionId:'x',title:'t'});assert.ok(!isPossible(moved,play));assert.match(blockers(moved,play.when).join(),/Ossa.s Tongue is Maudrin/)});
test('effects resolve against the current state and clocks clamp',()=>{const play=installed.sessions[0].branches.find(b=>b.id==='s01-attack-quill')!;const ch=resolveEffects(pb,play.effects);assert.ok(ch.some(c=>c.flag==='clock_court'&&c.to===1));const full=setFlag(pb,'clock_court',6,'x');assert.ok(!resolveEffects(full,play.effects).some(c=>c.flag==='clock_court'))});
test('undo restores a flag unless it changed again',()=>{const a=applyChanges(pb,[{flag:'quill',from:'routine',to:'bribed'}],{sessionId:'x',title:'bribe'});const b=setFlag(a,'quill','ally','x');const u=undoEntry(b,a.log[0].id);assert.equal(stateOf(u.pb).quill,'ally');assert.deepEqual(u.kept,['Hushman Tobias Quill']);const u2=undoEntry(a,a.log[0].id);assert.equal(stateOf(u2.pb).quill,'routine')});
test('a ripple reports plays that close later',()=>{const r=ripple(installed,pb,[{flag:'t_ossa',to:'venn'}],1);assert.ok(r.closed.some(d=>d.play.id==='s03-return-tongue'));assert.ok(r.opened.some(d=>d.play.id==='s03-recover-from-venn'))});
test('the forecast tracks the Concord',()=>{const f=forecast(pb).find(x=>x.ending.id==='concord')!;assert.equal(f.open,false);assert.ok(f.reqs[0].routes.length>0);const rung=['vaer','ossa','calla','hieme','thrane','mirel'].reduce((p,b)=>setFlag(p,'bell_'+b,'rung','x'),setFlag(pb,'key','party','x'));assert.equal(forecast(rung).find(x=>x.ending.id==='concord')!.open,true)});
test('clock alerts fire one tick before a threshold',()=>{const near=setFlag(pb,'tithe_clock',5,'x');assert.ok(clockAlerts(near).some(a=>a.flag.id==='tithe_clock'&&a.state==='next'))});
test('likely plays rank ahead of wildcards',()=>{const ranked=rankPlays(installed,pb,installed.sessions[0].branches);assert.ok(ranked[0].play.likelihood==='Likely')});
test('search finds a play from the words a player uses',()=>{assert.equal(searchPlays('bribe the hushman',installed.sessions[0].branches)[0]?.id,'s01-bribe-quill');assert.ok(searchPlays('detect magic',installed.sessions[0].branches).some(p=>p.id==='s01-detect-magic-tongue'))});
test('2024 encounter budgets and difficulty',()=>{assert.deepEqual(partyBudget([1,1,1,1]),[200,300,400]);assert.deepEqual(partyBudget([5,5,5,5]),[2000,3000,4400]);const enc=pb.encounters.find(e=>e.id==='enc-s01-quill-patrol')!;assert.equal(encounterXP(enc),200);assert.equal(difficulty(200,[1,1,1,1]).band,'Low');assert.equal(difficulty(900,[1,1,1,1]).band,'Beyond High')});
test('every brief, encounter and stat block reference resolves',()=>{const enc=new Set(pb.encounters.map(e=>e.id)),blocks=new Set(pb.statblocks.map(s=>s.id));for(const b of pb.briefs)for(const id of b.encounters)assert.ok(enc.has(id),id);for(const e of pb.encounters)for(const c of e.creatures)if(c.statblock)assert.ok(blocks.has(c.statblock),c.statblock)});
test('every condition and effect names a real flag and option',()=>{const flags=new Map(pb.flags.map(f=>[f.id,f]));const plays=[...installed.sessions.flatMap(s=>s.branches),...pb.anytime];for(const p of plays){for(const c of p.when||[]){const f=flags.get(c.flag);assert.ok(f,p.id+' '+c.flag);for(const o of [...(c.in||[]),...(c.not||[])])assert.ok(f!.options?.some(x=>x.id===o),p.id+' '+c.flag+'='+o)}for(const e of p.effects||[]){const f=flags.get(e.flag);assert.ok(f,p.id+' '+e.flag);if(e.set)assert.ok(f!.options?.some(x=>x.id===e.set),p.id+' '+e.flag+'='+e.set)}}});
test('AI-prepared paths never replace playbook plays',()=>{const s=installed.sessions[0];const kept=s.branches.filter(b=>b.origin==='playbook');assert.ok(kept.length>5)});
console.log(failures?failures+' failed':'All playbook checks passed.');process.exit(failures?1:0);
