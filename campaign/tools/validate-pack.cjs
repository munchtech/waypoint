// Checks a playbook content file against the authoring guide: node tools/validate-pack.cjs pack/act1.json [more files]
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const flags=JSON.parse(fs.readFileSync(path.join(root,'pack/flags.json'),'utf8'));
const sessions=JSON.parse(fs.readFileSync(path.join(root,'ref/sessions.json'),'utf8'));
const flagById=new Map(flags.map(f=>[f.id,f]));
const sessionIds=new Set(sessions.map(s=>s.id));
const statblocks=new Set(require(path.join(root,'pack/statblocks.cjs')).map(s=>s.id));
const crs=new Set(['0','1/8','1/4','1/2','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15']);
const styles=['Roleplay','Exploration','Combat','Mischief'],likely=['Likely','Possible','Wildcard'];
let errors=0,warnings=0;const err=(m)=>{errors++;console.log('ERROR',m)},warn=(m)=>{warnings++;console.log('warn ',m)};
const seen=new Set();
function cond(c,where){const f=flagById.get(c.flag);if(!f)return err(where+': unknown flag '+c.flag);if(f.options){for(const k of ['in','not'])for(const o of c[k]||[])if(!f.options.some(x=>x.id===o))err(where+': flag '+c.flag+' has no option '+o);if(c.min!==undefined||c.max!==undefined)err(where+': min/max used on option flag '+c.flag)}else{if(c.in||c.not)err(where+': in/not used on clock '+c.flag)}if(!c.in&&!c.not&&c.min===undefined&&c.max===undefined)err(where+': empty condition on '+c.flag)}
function effect(e,where){const f=flagById.get(e.flag);if(!f)return err(where+': unknown effect flag '+e.flag);if(f.options){if(e.set===undefined)err(where+': option flag '+e.flag+' needs set');else if(!f.options.some(x=>x.id===e.set))err(where+': flag '+e.flag+' has no option '+e.set)}else if(typeof e.add!=='number')err(where+': clock '+e.flag+' needs numeric add')}
const counts={};
for(const file of process.argv.slice(2)){
 let data;try{data=JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){err(file+': not valid JSON: '+e.message);continue}
 for(const p of data.plays||[]){const w=file+' play '+p.id;
  if(!p.id||seen.has(p.id))err(w+': missing or duplicate id');seen.add(p.id);
  if(typeof p.fallback!=='string')err(w+': fallback must be a string (may be empty)');if(typeof p.readAloud!=='string'||(!p.readAloud.trim()&&!p.id.startsWith('any-')))err(w+': missing readAloud');for(const k of ['title','why','response','consequence','keywords'])if(typeof p[k]!=='string'||!p[k].trim())err(w+': missing '+k);
  for(const k of ['tells','rules','later'])if(p[k]!==undefined&&typeof p[k]!=='string')err(w+': '+k+' must be a string');
  if(!styles.includes(p.style))err(w+': bad style '+p.style);if(!likely.includes(p.likelihood))err(w+': bad likelihood '+p.likelihood);
  if(p.sessionId!==undefined&&!sessionIds.has(p.sessionId))err(w+': unknown sessionId '+p.sessionId);
  if(p.id.startsWith('any-')&&p.sessionId)err(w+': anytime play has a sessionId');
  for(const c of p.when||[])cond(c,w);for(const e of p.effects||[])effect(e,w);
  if(/\bInspiration\b/.test(p.rules+p.response)&&!/Heroic Inspiration/.test(p.rules+p.response))warn(w+': says Inspiration without Heroic');
  counts[p.sessionId||'anytime']=(counts[p.sessionId||'anytime']||0)+1;}
 for(const b of data.briefs||[]){const w=file+' brief '+b.sessionId;if(!sessionIds.has(b.sessionId))err(w+': unknown sessionId');for(const k of ['pressure','endOn','npcs'])if(typeof b[k]!=='string'||!b[k].trim())err(w+': missing '+k);if(!Array.isArray(b.checklist)||!b.checklist.length)err(w+': checklist missing');if(!Array.isArray(b.encounters))err(w+': encounters must be an array');if(!Array.isArray(b.rules))err(w+': rules must be an array')}
 for(const e of data.encounters||[]){const w=file+' encounter '+e.id;if(!e.id||seen.has(e.id))err(w+': missing or duplicate id');seen.add(e.id);if(e.sessionId&&!sessionIds.has(e.sessionId))err(w+': unknown sessionId');for(const k of ['title','tactics','exit','scale'])if(typeof e[k]!=='string'||!e[k].trim())err(w+': missing '+k);if(!Array.isArray(e.creatures)||!e.creatures.length)err(w+': no creatures');for(const c of e.creatures||[]){if(c.statblock&&!statblocks.has(c.statblock))err(w+': unknown statblock '+c.statblock);if(!crs.has(String(c.cr)))err(w+': bad cr '+c.cr);if(!(c.count>=1))err(w+': bad count');if(!c.base||!c.name)err(w+': creature needs name and base')}for(const c of e.when||[])cond(c,w)}
 const encIds=new Set((data.encounters||[]).map(e=>e.id));for(const b of data.briefs||[])for(const id of b.encounters||[])if(!encIds.has(id))warn(file+' brief '+b.sessionId+': encounter '+id+' not in this file');
}
const titleOf=new Map(sessions.map(s=>[s.id,'S'+s.n+' '+s.title]));
console.log('\nplays per session:');for(const [k,v] of Object.entries(counts))console.log(' ',(titleOf.get(k)||k).padEnd(48),v);
console.log('\n'+errors+' errors, '+warnings+' warnings');process.exit(errors?1:0);
