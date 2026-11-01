// Revision 7 renames the bells' clappers from "Tongue" to "Heart" (DM's decision, 2026-10-31): easier to say at the table.
// The sources keep "Tongue"; tools/build-pack.cjs and tools/build-manuscript.cjs apply this list to everything they write,
// and the update pack carries it so Waypoint renames the DM's own wiki pages, session notes and cards (never the chronicle).
// Ids are never renamed: live campaigns refer to plays and flags by id.
const terms={
 replace:[['Tongue','Heart'],['TONGUE','HEART'],['tongue','heart'],
  // Session-zero safety words in plain language (DM's decision, 2026-10-31): Off-limits and Off-screen replace Lines and Veils.
  ['A **Line** is something we never include. A **Veil** is something we can include, but we skip past it without describing it.','An **Off-limits** topic is something we never include. An **Off-screen** topic is something we can include, but we skip past it without describing it.'],
  ['every Line and Veil','every off-limits and off-screen topic'],['Lines and Veils','off-limits and off-screen topics']],
 keep:['Tongues are now Hearts','Comprehend Languages or Tongues','Tongues spell','casts Tongues','cast Tongues','tip of your tongue','second tongue','mother tongue','hold your tongue'],
 note:'The bells’ clappers are now called Hearts (Ossa’s Heart, Heart-Hound, Kessa’s Heart-Hall). The Tongues spell, “tip of your tongue” and Pellmoor’s “second tongue” are left alone. The session-zero safety words become Off-limits and Off-screen.'};
const rename=t=>{if(typeof t!=='string'||!t)return t;const keep=terms.keep.filter(k=>t.includes(k));let out=t;keep.forEach((k,i)=>{out=out.split(k).join('§§'+i+'§§')});for(const [a,b] of terms.replace)out=out.split(a).join(b);keep.forEach((k,i)=>{out=out.split('§§'+i+'§§').join(k)});return out};
// Renames every string in a pack object except ids and the lists of ids or option ids.
const idKeys=new Set(['id','sessionId','flag','set','statblock','playId','kind','mode','style','likelihood','cr','base']);
const idLists=new Set(['in','not','retire','encounters','rules','campaignIds','names','order']);
function deep(v,key){if(typeof v==='string')return idKeys.has(key)?v:rename(v);if(Array.isArray(v))return v.map(x=>typeof x==='string'&&idLists.has(key)?x:deep(x,key));if(v&&typeof v==='object'){const o={};for(const [k,x] of Object.entries(v))o[k]=deep(x,k);return o}return v}
module.exports={terms,rename,deep};
