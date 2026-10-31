import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync,backup} from 'node:sqlite';
import {validateCampaign} from '../.sites-runtime/campaign-tests/campaign.mjs';

const sourcePath='C:/Users/munch/Desktop/the-seventh-bell-v3.md';
const original=fs.readFileSync(sourcePath,'utf8');
const text=original.replace(/\r\n/g,'\n');
const date=new Date().toISOString(),campaignId='the-seventh-bell-corvane-v3';
const sourceId='seventh-bell-source-v3';
const id=s=>'sb-'+createHash('sha256').update(s).digest('hex').slice(0,16);
const headings=[...text.matchAll(/^(#{1,4}) (.+)$/gm)].map(m=>({level:m[1].length,title:m[2],start:m.index,end:m.index+m[0].length}));
function section(prefix){const h=headings.find(h=>h.title.startsWith(prefix));if(!h)throw Error('Missing section '+prefix);const next=headings.find(n=>n.start>h.start&&n.level<=h.level);return text.slice(h.end,next?.start??text.length).trim()}
let group='Lore';
const pages=headings.flatMap((h,i)=>{
 if(h.title==='5.1 Factions')group='Faction';else if(h.title==='5.2 Characters')group='NPC';else if(h.title==='5.3 Places')group='Location';else if(h.level<=2)group='Lore';
 const body=text.slice(h.end,headings[i+1]?.start??text.length).trim();
 if(!body.replace(/[-\s]/g,'')||h.title==='THE SEVENTH BELL')return [];
 const planned=h.start>=text.indexOf('# PART 8:')&&h.start<text.indexOf('# PART 9:');
 const p={id:id(h.title),title:h.title,kind:group,body,aliases:'',status:planned?'Planned':'Confirmed',visibility:'DM only',sourceId,quote:body.slice(0,300),updated:date,history:[],related:[]};
 if(group==='Faction'&&h.level===3)p.clock={progress:0,stakes:'Advance one faction by one tick after a played session. At six, resolve its chosen move and reset to zero. Choose the move from this faction’s aims; no move has happened yet.'};
 return [p];
});
const pageFor=prefix=>pages.find(p=>p.title.startsWith(prefix));
// Relationships are navigation links, not inferred new campaign facts.
for(const p of pages){p.related=pages.filter(q=>q.id!==p.id&&['NPC','Faction','Location'].includes(q.kind)).filter(q=>{
 const name=q.title.replace(/^\d+\. /,'').replace(/ \(.+\)$/,'').toLowerCase();
 return name.length>4&&p.body.toLowerCase().includes(name);
}).slice(0,12).map(q=>q.id)}
const sessions=headings.filter(h=>/^Sessions? \d/.test(h.title)).map(h=>({id:id(h.title),title:h.title,plan:section(h.title),summary:'Unplayed source plan from The Seventh Bell. Adapt to confirmed choices; do not treat planned scenes as history.',branches:[],source:'The Seventh Bell · supplied v3 file · '+h.title,done:false}));
const second=section('THE SECOND BRANCH');
for(const n of [20,21])sessions.push({id:id('session-'+n),title:`Session ${n}: ${n===20?'The Second Arrival':'The Second Ringing'}`,plan:second,summary:'Run the remaining Act IV branch in compressed form after the party’s chosen first branch. Do not replay completed scenes.',branches:[],source:'The Seventh Bell · Act IV · second branch',done:false});
sessions.sort((a,b)=>parseInt(a.title.match(/\d+/)[0])-parseInt(b.title.match(/\d+/)[0])||a.title.localeCompare(b.title));
const first=sessions[0];
const branch=(title,style,response,consequence,fallback,why='Explicit opening choice in the supplied guide.')=>({id:id(first.id+title),title,style,likelihood:'Prepare this possibility',why,readAloud:'',response,consequence,fallback});
first.branches=[
 branch('Ask Ila respectfully about the Tongue','Roleplay','Ila shows Ossa’s Tongue in her father’s oilskin. It hums while she holds it and fades when set down. Ask, “Did you hear it too?”','They can earn Ila’s trust and learn why Mother Sallow is afraid. Record only what they actually learn.','Mother Sallow invites them for reed tea and offers three days of safekeeping.'),
 branch('Dismiss or insult Ila','Roleplay','Ila turns away. Mother Sallow intervenes: “She’s a child. You can be a child too, or you can be useful.”','Ila is less willing to show the Tongue; a sincere apology can reopen the conversation.','Let a respectful question or practical offer of help restore a way forward.'),
 branch('Hand Ossa’s Tongue to Quill','Roleplay','Quill takes it, thanks them and leaves. He records their faces in his ledger.','The Court now knows the party; Maudrin can mention them in Act II. Record who physically holds the Tongue.','Continue with the Choir or ledger mystery; do not pretend the party still has the Tongue.'),
 branch('Hide the Tongue and lie to Quill','Mischief','Quill asks, “Where did the child’s coat go?” If their answer fails, he searches the village. He finds the Tongue unless it was moved.','Record the hiding place, who knows it, and whether Quill actually discovered it.','Give them a clear opportunity to explain or redirect; preserve consequences of their actual preparation.'),
 branch('Attack Quill’s patrol','Combat','Quill has one Hushman with him. The guard fights; Quill retreats shouting that they have made themselves a Tithe-case. Use the stat-lite appendix and adjust to the actual party.','Ila’s house becomes the Hushmen’s first search target. This is a possible consequence until played.','Keep retreat, surrender and protecting Ila available; the Tongue and ledger remain leads.'),
 branch('Offer Quill a bribe','Roleplay','Quill accepts coin and asks for “a name.” If offered Mother Sallow’s name, he takes it. If refused, he keeps the coin and says he will remember their generosity.','Record the exact bargain and whether a name was given; do not invent payment of a personal Toll.','If they refuse the name, Quill still accepts the coin; continue with his inspection and the night’s singing.')
];
// Preserve the guide's explicit IF THEY responses for later-session clickable choices.
for(const s of sessions.slice(1)){
 const options=[...s.plan.matchAll(/^- \*\*(?:…|\.\.\.)(.+?):\*\*\s*(.+)$/gm)];
 s.branches=options.map((m,i)=>({id:id(s.id+':'+i),title:m[1].replace(/\*+/g,''),style:/fight|attack|kill/i.test(m[1])?'Combat':/steal|lie/i.test(m[1])?'Mischief':'Roleplay',likelihood:'Scenario from the guide',why:'An explicit conditional response, not a prediction about this party.',readAloud:'',response:m[2],consequence:'Apply the source response only if this choice occurs. Record the resulting facts and unresolved consequences.',fallback:'Keep another clue or NPC approach available; use Part 9 for unexpected choices.'}));
}
const third=sessions.find(s=>s.title.startsWith('Session 3:'));
for(const m of third.plan.matchAll(/^\d\. \*\*(.+?)\*\*\s*(.+)$/gm))third.branches.push({id:id(third.id+m[1]),title:m[1].replace(/[,.]$/,''),style:'Exploration',likelihood:'Major decision',why:'One of the guide’s four Tongue choices.',readAloud:'',response:m[2],consequence:'Record the Tongue’s holder and the actual outcome. These consequences are not confirmed until played.',fallback:'Use the Court invitation to connect the consequences to Hallowmere.'});
const cards=[
 {title:'Start here · Pellmoor session desk',kind:'Scene',body:'Before play: run session zero, enter player names and actual level, agree Lines and Veils, and choose hooks H-01 to H-06.\n\nOpening: Ila on the dock → Mother Sallow’s reed tea → Quill on the second evening. Let choices change that order.\n\nEnd on: Who was singing?\n\nKeep canon, Tongue custody, paid Tolls and bargains separate from possible outcomes.',readAloud:(first.plan.match(/> (.+)/)||[])[1]||''},
 {title:'Toll Tracker · no losses recorded yet',kind:'Note',body:section('B.1 Toll Tracker')+'\n\nNo character has paid a Toll in recorded play. Keep scene memory losses separate from ringing Tolls.'},
 {title:'Bargain Log · no bargains recorded yet',kind:'Note',body:section('B.2 Bargain Log')},
 {title:'Tithe Clock · 0 / 12',kind:'Note',body:section('2.12 Clocks and Trackers')+'\n\nInitial value: 0; this is a fresh unplayed campaign. Update the count only after actual qualifying rests. This twelve-step clock is not a six-step faction clock.'},
 {title:'Session zero · party and boundaries',kind:'Note',body:section('1.4 Session Zero Script')+'\n\nActual roster, hooks, Lines and Veils: not yet entered.'},
 {title:'Pre-session checklist',kind:'Note',body:section('1.5 Pre-Session Prep Checklist')},
 ...pages.filter(p=>p.title.startsWith('SITUATION ')).map(p=>({title:p.title,kind:'Scene',body:p.body})),
 ...pages.filter(p=>p.kind==='NPC').map(p=>({title:p.title,kind:'NPC',body:p.body}))
].map(c=>({id:id('card'+c.title),readAloud:'',consequence:'DM reference; not a recorded event.',source:'The Seventh Bell · supplied campaign guide',...c}));
for(const title of ['Toll Tracker · no losses recorded yet','Bargain Log · no bargains recorded yet','Tithe Clock · 0 / 12']){
 const card=cards.find(c=>c.title===title);
 pages.push({id:id('live-'+title),title:'Live tracker · '+title,kind:'Lore',body:card.body,aliases:'tracker Corvane',status:'Unresolved',visibility:'DM only',sourceId,quote:'Initialized for this unplayed campaign; update only from confirmed play.',updated:date,history:[],related:[]});
}
first.pinnedCardId=cards[0].id;
const canon=pageFor('3.3 The Canon Sheet');
const campaign={id:campaignId,name:'The Seventh Bell',premise:section('2.1 The Big Idea'),tone:'Melancholy, not hopeless. Sound is central; light is wrong; memory is currency.',party:'Roster not yet entered. Guide recommends 3–5 players; start at level 1 and progress to level 11. Confirm actual party before encounter balancing.',boundaries:'Run session zero before play; Lines and Veils are not yet recorded. Do not assume consent to the guide’s themes. Keep DM secrets off player-facing handouts.',twist:'Subtle',arc:section('PART 8: THE CAMPAIGN').slice(0,2200)+'\n\n'+headings.filter(h=>h.title.startsWith('ACT ')).map(h=>h.title).join('\n')+'\n\nAct IV: choose A or B first. Sessions 20–21 cover the remaining branch in compressed form. Alternate branch plans are not extra required sessions.',preferences:{Roleplay:3,Exploration:3,Combat:3,Mischief:3},sessions,events:[],cards,memory:{pages,notes:[{id:sourceId,sessionId:first.id,title:'Imported source · The Seventh Bell v3',text:original,date,summary:'Original supplied campaign manuscript. Source plans and DM lore, not a played-session transcript. Filename says v3; internal revision label says Revision 2. Imported as supplied.',proposals:[]}],pins:[canon.id,pageFor('2.11 The Ring Table').id,pageFor('1.5 Pre-Session').id,pageFor('B.6 Canon Quick Check').id],planner:{duration:'3–4 hours',focus:'Session 1: Arrival at Pellmoor. Follow actual choices and end on “Who was singing?”',spotlight:'Ask each player for a starting hook and something their character has lost. Actual player preferences are not yet known.',locked:'Source canon: Part 3.3 wins conflicts within the manuscript. Future scenes are plans, never confirmed events. Do not reveal DM secrets in read-aloud text. Follow confirmed play when it changes the world. Do not force the planned order. Preserve the distinction between Tolls and scene memory losses. Both Act IV branches matter to Concord, but run the second in compressed Sessions 20–21.\n\n'+canon.body}}};
if(!validateCampaign(campaign))throw Error('Generated campaign failed Waypoint validation');
if(sessions.some(s=>s.done)||campaign.events.length)throw Error('Import must not invent played events');
const output=path.resolve('../../outputs/The-Seventh-Bell.waypoint.json');
fs.writeFileSync(output,JSON.stringify({version:2,campaigns:[campaign],active:campaignId,sessionId:first.id},null,2));
console.log(JSON.stringify({output,sessions:sessions.length,wikiPages:pages.length,factionClocks:pages.filter(p=>p.clock).length,cards:cards.length,openingChoices:first.branches.length,sessionThreeChoices:third.branches.length}));
if(process.argv.includes('--install')){
 const directory=path.join(process.env.APPDATA,'Waypoint');
 const db=new DatabaseSync(path.join(directory,'waypoint.sqlite'));
 const backupFile=path.join(directory,'before-seventh-bell-'+Date.now()+'.sqlite');
 await backup(db,backupFile);
 db.exec('BEGIN IMMEDIATE');
 try{
  const row=db.prepare('SELECT content FROM snapshots WHERE id=1').get();
  const snapshot=row?JSON.parse(row.content):{version:2,campaigns:[]};
  if(snapshot.campaigns.some(c=>c.id===campaignId||c.name==='The Seventh Bell'))throw Error('Campaign already exists; refusing to overwrite its progress.');
  if(!snapshot.campaigns.every(validateCampaign))throw Error('Existing campaign validation failed; no changes made.');
  snapshot.campaigns.push(campaign);snapshot.active=campaignId;snapshot.sessionId=first.id;
  db.exec('INSERT OR REPLACE INTO snapshots SELECT 2,content FROM snapshots WHERE id=1');
  db.prepare('INSERT OR REPLACE INTO snapshots(id,content) VALUES(1,?)').run(JSON.stringify(snapshot));
  db.exec('COMMIT');console.log(JSON.stringify({installed:true,backupFile,totalCampaigns:snapshot.campaigns.length}));
 }catch(e){db.exec('ROLLBACK');throw e}finally{db.close()}
}
