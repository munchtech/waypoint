// Assembles the Seventh Bell update pack (revision 7.4) from the authored files and checks every edit anchor against the live campaign.
// node tools/build-pack.cjs  →  waypoint/lib/packs/seventh-bell-v7.json and outputs/The-Seventh-Bell-v7.waypoint-pack.json
const fs=require('fs'),path=require('path');
const P=require(path.join(__dirname,'../paths.cjs'));
const root=path.join(__dirname,'..'),pack=p=>path.join(root,'pack',p);
const campaignIn=file=>JSON.parse(fs.readFileSync(file,'utf8')).campaigns.find(c=>c.id==='the-seventh-bell-corvane-v5');
const live=campaignIn(P.snapshot),baseline=campaignIn(P.baseline);
const {rename}=require(pack('terms.cjs'));
const flags=JSON.parse(fs.readFileSync(pack('flags.json'),'utf8'));
const lore=require(pack('lore.cjs')),statblocks=require(pack('statblocks.cjs')),endings=require(pack('endings.cjs'));
const files=fs.readdirSync(path.join(root,'pack')).filter(f=>/^(act.*|anytime.*)\.json$/.test(f)).sort();
const plays=[],briefs=[],encounters=[];
for(const f of files){const d=JSON.parse(fs.readFileSync(pack(f),'utf8'));plays.push(...(d.plays||[]));briefs.push(...(d.briefs||[]));encounters.push(...(d.encounters||[]))}
// Expected party level at the start of each chapter (v5 milestones), in session order.
// The table starts at level 3 with four players (DM, 2026-10-31): early chapters use max(3, the v5 milestone).
const levels=[3,3,3,3,3,4,4,4,4,5,5,5,5,6,6,7,7,7,7,7,7,7,7,8,8,9,9,10,11,11,11,11];
const problems=[];const warn=m=>problems.push(m);
const keep=['id','title','style','likelihood','why','readAloud','response','consequence','fallback','tells','rules','later','keywords','when','effects'];
const required=['id','title','style','likelihood','why','readAloud','response','consequence','fallback'];
// Required Branch fields are always present (possibly empty); optional ones are dropped when empty.
const clean=p=>{const o={};for(const k of keep)if(required.includes(k))o[k]=p[k]??'';else if(p[k]!==undefined&&p[k]!=='')o[k]=p[k];o.origin='playbook';return o};
const bySession=new Map();for(const p of plays.filter(p=>p.sessionId)){if(!live.sessions.some(s=>s.id===p.sessionId))warn('play '+p.id+' has unknown session');if(!bySession.has(p.sessionId))bySession.set(p.sessionId,[]);bySession.get(p.sessionId).push(clean(p))}
const anytime=plays.filter(p=>!p.sessionId).map(clean);
const loreSessions=new Map(lore.sessions.map(s=>[s.id,s]));
// Checks edits as Waypoint places them: in order, on the renamed text; an edit whose replacement is already there counts as placed.
// The live campaign already has revision 7, so its earlier edits are found by their replacements and the new ones by their anchors.
const placeable=(text,edits,label)=>{let t=rename(text);for(const e of edits){const f=rename(e.find),r=rename(e.replace);if((r&&t.includes(r))||(e.unless&&t.includes(e.unless)))continue;if(t.includes(f))t=t.replace(f,r);else warn(label+': anchor not found: '+e.find.slice(0,70))}};
const sessions=live.sessions.map(s=>{const out={id:s.id};const l=loreSessions.get(s.id);if(bySession.has(s.id)){out.plays=bySession.get(s.id);const base=baseline.sessions.find(x=>x.id===s.id)||s;const guide=[...new Set([...base.branches,...s.branches].filter(br=>br.likelihood==='Scenario from the guide').map(br=>br.id))];if(guide.length)out.retire=guide}if(l){out.edits=l.edits.map(({find,replace,unless})=>({find,replace,...(unless?{unless}:{})}));out.summary=l.summary;placeable(s.plan,l.edits,'session '+s.title)}return out}).filter(s=>s.plays||s.edits);
const pageEdits=lore.pageEdits.map(x=>{const page=live.memory.pages.find(p=>p.id===x.id);if(!page){warn('page edit target missing: '+x.id);return x}const edits=x.edits.map(e=>e.find==='__WHOLE__'?{find:(baseline.memory.pages.find(p=>p.id===x.id)||page).body,replace:e.replace}:e);placeable(page.body,edits,'page '+page.title);return {...x,edits}});
for(const field of new Set(lore.campaign.edits.map(e=>e.field)))placeable(live[field],lore.campaign.edits.filter(e=>e.field===field),'campaign '+field);
placeable(live.memory.planner.locked,lore.planner.locked,'planner');
const briefOut=briefs.map(b=>({...b,level:levels[live.sessions.findIndex(s=>s.id===b.sessionId)]||undefined}));
const statIds=new Set(statblocks.map(s=>s.id));for(const e of encounters)for(const c of e.creatures)if(c.statblock&&!statIds.has(c.statblock))warn('encounter '+e.id+' uses unknown statblock '+c.statblock);
const encIds=new Set(encounters.map(e=>e.id));for(const b of briefs)for(const id of b.encounters)if(!encIds.has(id))warn('brief '+b.sessionId+' lists missing encounter '+id);
const memoryPage=lore.pages.find(p=>p.id==='v6-memory-money');
const sessionCount=sessions.filter(s=>s.plays).length,playCount=[...bySession.values()].reduce((n,l)=>n+l.length,0);
const result={kind:'waypoint-update-pack',version:1,id:'seventh-bell-v7',title:'The Seventh Bell · revision 7.4',
 summary:`Revision 7.4 of The Seventh Bell, for Waypoint 1.35.4. It installs over revisions 7.3 to 7, revision 6 or the original campaign, and keeps your world state, notes and the wiki entries you have sent.

- **New in 7.4: session zero and a table card.** The session zero script becomes a full guide (World wiki → 1.4 Session Zero Script), and each Act I guide ends with a one-page table card you can print from the session notes.
- **New in 7.3: every option is a button.** The 17 "If they…" options in the Act I guides that were plain text now have prepared plays too, so whatever the party does you can open its card, read what to say and do, and record it.
- **New in 7.2: click what the players do.** In each Act I guide, the "If they…" choices are buttons. Click one and that play's card opens right there in your session notes, with **The party did this** on it, so you can run the session from the page. The IsoForge map kits (the kit section at the end of each Act I plan, three wiki pages and three saved cards) are retired, each listed for review.
- **New in 7.1: a guide for running Sessions 1 to 3.** Each Act I session plan gains a section, **Running this session (new DM guide)**, after the plan: what to prepare, read-aloud for every scene, what is really going on, how to play each person, the checks and DCs, what to do when the players surprise you, a turn-by-turn guide to every fight, pacing, names, and what to record afterwards. Four new plays fill gaps the guide found, and Act I's numbers now match the 2024 stat blocks.
- **Tongues are now Hearts.** The bells' clappers are called Hearts (Ossa's Heart, the Heart-Hound), which is easier to say at the table. One review item renames the word in your own wiki pages, session notes and saved cards too; your chronicle keeps its words.
- **Built for your table: four characters starting at level 3.** Every encounter is rebudgeted with the 2024 XP rules for four players at the level each chapter expects, from Low skirmishes in Pellmoor to High fights at the Strike, the summit and the Seventh Bell.
- **A real finale.** Acts IV and V now have full sets of prepared plays, and every ending can be reached and recorded: the Hush Shrine, Oum's waking, and the table's own choice to stop resisting. A new stat block for Maudrin as Keeper of the Seventh (CR 12, legendary actions).
- **Nothing gets stranded.** Every place a Tongue, the Key or a person can end up has a play that moves it on, and "Down the line" notes point at the sessions that deliver them, so Waypoint can bring them back in your prep brief.
- **Fixes from a full audit:** timeline slips (the Stilled have been frozen since 2 SS), state that the fiction hadn't earned, 2024 rulings for the spells a level-3 to 11 party actually has, and stat block arithmetic.
- **A player site.** The handouts, the painted map and a player wiki, written as one site.html you upload. Prepared player-safe wiki entries wait in Waypoint until you press **Send to wiki**; the wiki reads "Unlocks as you discover" until then.
- **Corvane in the Realms,** as in revision 6: the Stormwall and the Seam, Pellmoor Landing as a port, memory as money.
- **Foresight playbook.** ${playCount} prepared plays across ${sessionCount} chapters and ${anytime.length} anytime plays; ${flags.length} tracked world-state facts; ${briefOut.length} session prep briefs; ${encounters.length} encounters; ${statblocks.length} Corvane stat blocks built on the 2024 Monster Manual; and an ending forecast.

Your notes, chronicle and any world state you have recorded are kept. Replaced wiki text moves to each page's revision history.`,
 match:{campaignIds:['the-seventh-bell-corvane-v5'],names:['The Seventh Bell']},
 campaign:{edits:lore.campaign.edits},planner:lore.planner,sessions,remove:lore.remove,
 pages:lore.pages.map(page=>({mode:'replace',page})),pageEdits,
 playbook:{id:'seventh-bell',title:'The Seventh Bell playbook',version:'7.4',flags,anytime,encounters,statblocks,briefs:briefOut,endings,references:[{title:'Memory money: rates and table rules',body:memoryPage.body}]}};
// "Tongue" becomes "Heart" in everything the pack carries; the pack also asks Waypoint to rename the DM's own text the same way.
const {terms,deep}=require(pack('terms.cjs'));Object.assign(result,deep(result,''));result.terms=terms;
// The player site: prepared player-safe wiki entries and the site's fixed pages (handouts and map, built by tools/build-handouts.cjs).
// The pages are added after the rename (they were renamed when built), so the map image's data is never touched.
const wikiFile=pack('player-wiki.json');result.playbook.playerWiki=deep(fs.existsSync(wikiFile)?JSON.parse(fs.readFileSync(wikiFile,'utf8')).entries:[],'');
result.playbook.site=JSON.parse(fs.readFileSync(path.join(root,'handouts/site.json'),'utf8'));
const json=JSON.stringify(result);
fs.writeFileSync(path.join(P.packs,'seventh-bell-v7.json'),json);
fs.writeFileSync(path.join(P.outputs,'The-Seventh-Bell-v7.waypoint-pack.json'),JSON.stringify(result,null,1));
console.log(`plays ${playCount} in ${sessionCount} sessions, anytime ${anytime.length}, briefs ${briefOut.length}, encounters ${encounters.length}, statblocks ${statblocks.length}, pages +${lore.pages.length}, page edits ${pageEdits.reduce((n,x)=>n+x.edits.length,0)}, size ${(json.length/1024).toFixed(0)} KB`);
const missingBriefs=live.sessions.filter(s=>!briefs.some(b=>b.sessionId===s.id)).map(s=>s.title);
if(missingBriefs.length)console.log('sessions without a brief yet: '+missingBriefs.length);
for(const p of problems)console.log('PROBLEM',p);
process.exit(problems.length?1:0);
