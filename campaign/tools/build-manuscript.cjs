// Builds the campaign book: v6 lore edits and revision 7 book edits on the v5 manuscript, then Parts 12 and 13. Run tools/build-pack.cjs first.
const fs=require('fs'),path=require('path');
const P=require(path.join(__dirname,'../paths.cjs'));
const root=path.join(__dirname,'..');
const src=P.v5book;
const out=path.join(P.outputs,'the-seventh-bell-v7.md');
const lore=require(path.join(root,'pack/lore.cjs'));
let text=fs.readFileSync(src,'utf8');const missed=[];
const apply=(find,replace,label)=>{if(text.includes(replace))return;if(text.includes(find))text=text.replace(find,replace);else missed.push(label+': '+find.slice(0,70))};
// Whole-section replacements are keyed by the section's heading in the manuscript.
const sections={'sb-462b2b0d93fd03c2':'### PELLMOOR (Village)','sb-579437dc048229b6':'## 2.7 The Toll','sb-b61bdde01a01cdcf':'## 1.4 Session Zero Script','sb-17dfab311eab22ea':'### SITUATION 17: "We want to leave Corvane or find another world."'};
for(const x of lore.pageEdits)for(const e of x.edits){
 if(e.find==='__WHOLE__'){const head=sections[x.id];const i=text.indexOf(head);if(i<0){missed.push('section '+head);continue}const start=i+head.length,end=text.indexOf('\n### ',start)>=0?Math.min(text.indexOf('\n### ',start),text.indexOf('\n## ',start)>=0?text.indexOf('\n## ',start):Infinity):text.length;text=text.slice(0,i)+(x.title?'### '+x.title:head)+'\n'+e.replace+'\n'+text.slice(end);continue}
 apply(e.find,e.replace,x.id)}
// A session guide's headings start at ## in Waypoint; in the book they sit two levels lower, under the session's ### heading.
for(const s of lore.sessions)for(const e of s.edits)apply(e.find,e.guide?e.replace.replace(/^(#{2,4}) /gm,'##$1 '):e.replace,s.id);
apply('*Revision 5. Core setting, characters, and five-act structure are unchanged from the original manuscript.','*Revision 7. Tuned for four players starting at level 3, with 2024 encounters, a full Act IV–V playbook and reachable endings (see Part 13). Revision 6: Corvane is part of the Forgotten Realms, Pellmoor is a port, memory works as money, and the rules are D&D 2024 (see Part 12). Revision 5: core setting, characters, and five-act structure are unchanged from the original manuscript.','header');
// Revision 7 book edits run after the v6 ones, so they may anchor on v6 text.
for(const [find,replace] of require(path.join(root,'pack/book-v7.cjs')).edits)apply(find,replace,'v7');
const appendix='\n\n---\n\n# PART 12: CORVANE IN THE REALMS (REVISION 6)\n\n*Waypoint carries the full playbook for this revision: prepared plays for every session, 2024 stat blocks, encounter difficulty and the ending forecast.*\n\n'+lore.pages.map(p=>'## '+p.title+'\n\n'+p.body).join('\n\n')+part13();
text=text.replace(/\n---\n\n# A FINAL WORD TO THE DM/,appendix+'\n\n---\n\n# A FINAL WORD TO THE DM');
// Part 13 is generated from the built pack, so the book and Waypoint always show the same encounters and endings.
function part13(){const pack=JSON.parse(fs.readFileSync(path.join(P.outputs,'The-Seventh-Bell-v7.waypoint-pack.json'),'utf8')),pb=pack.playbook,sessions=JSON.parse(fs.readFileSync(path.join(root,'ref/sessions.json'),'utf8'));
 const XP={'0':10,'1/8':25,'1/4':50,'1/2':100,'1':200,'2':450,'3':700,'4':1100,'5':1800,'6':2300,'7':2900,'8':3900,'9':5000,'10':5900,'11':7200,'12':8400};
 const B=[[50,75,100],[100,150,200],[150,225,400],[250,375,500],[500,750,1100],[600,1000,1400],[750,1300,1700],[1000,1700,2100],[1300,2000,2600],[1600,2300,3100],[1900,2900,4100]];
 const band=(xp,l)=>{const [lo,mo,hi]=B[l-1].map(x=>x*4);return xp<lo*0.7?'Trivial':xp<mo?'Low':xp<hi?'Moderate':xp<=hi*1.15?'High':'Beyond High'};
 const label=id=>{const s=sessions.find(x=>x.id===id);return s?s.title.replace(/:.*/,''):'Any session'};
 const rows=pb.encounters.map(e=>{const b=pb.briefs.find(x=>x.sessionId===e.sessionId),l=b?.level||3,xp=e.creatures.reduce((n,c)=>n+XP[c.cr]*c.count,0);return `| ${label(e.sessionId)} | ${e.title}${e.when?' *(only if the world state allows)*':''} | ${e.creatures.map(c=>c.count+' × '+c.name+' (CR '+c.cr+')').join(', ')} | ${l} | ${xp.toLocaleString('en-US')} | ${band(xp,l)} |`});
 const keeper=pb.statblocks.find(s=>s.id==='sb_maudrin_keeper');
 return `\n\n---\n\n# PART 13: PLAYING REVISION 7 AT YOUR TABLE\n\n*Waypoint 1.35 carries this revision as an update pack. Its Foresight prep brief shows each encounter's 2024 difficulty for your actual roster and suggests how to retune it.*\n\n## 13.1 The table: four players from level 3\n\nRevision 7 assumes four characters who start at level 3 with their subclasses chosen. Levels by chapter: Sessions 1 to 5 at level 3, then the book's milestones (4 from the end of the city investigation, 5 for Glassreach, 6 after the Sexton, 7 for Act IV, 8 to 9 for the Strike, 10 to 11 for Act V). For three or five players, use the scaling line on each encounter; Waypoint recalculates from your roster.\n\nWhat a level-3 start changes: the party has 2nd-level spells (Hold Person, Suggestion, Detect Thoughts, Zone of Truth, Invisibility, Misty Step) from Session 1. The playbook gives a firm ruling wherever those touch memory, bells, Tolls or silence. Act I fights are sized for this party; the low-level safeguards in Appendix A are only for a level-1 start. Essential clues still never hang on a single roll.\n\n## 13.2 Encounter roster (D&D 2024 XP budget, four characters)\n\n| Chapter | Encounter | Creatures | Level | XP | Difficulty |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n\nLow, Moderate and High follow the 2024 Dungeon Master's Guide XP budget per character. Every encounter keeps a way out that is not a death: a retreat, a surrender, a bargain or an objective.\n\n## 13.3 Maudrin Vesk, Keeper of the Seventh\n\nUse this block when Maudrin carries the Tuning Key at the summit or the Hush Shrine. Before then, use her CR 8 block.\n\n${keeper.body}\n\n## 13.4 How each ending is reached\n\nEvery ending needs someone to come down the Stairs of the Hush (Session 25). None is open at the start of the campaign.\n\n${pb.endings.map(e=>`**${e.title}** (${e.tone}). ${e.summary}\n\n${e.requires.map(r=>'- '+r.label).join('\n')}`).join('\n\n')}\n\nThe Empty Choir needs the players to choose to stop resisting. A lost fight is an escape, a capture or a rescue, never this ending.`}
// Play links ([label](play:id)) are buttons in Waypoint's session notes; the book keeps only their words.
text=text.replace(/\[([^\]]+)\]\(play:[^)\s]+\)/g,'$1');
text=require(path.join(root,'pack/terms.cjs')).rename(text);
fs.writeFileSync(out,text);
console.log('wrote',out,(text.length/1024).toFixed(0)+' KB');for(const m of missed)console.log('MISSED',m);
