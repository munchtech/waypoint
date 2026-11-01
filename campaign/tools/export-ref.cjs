// Writes reference files for playbook authors: the v5 session list and readable 2024 (XMM) base stat blocks.
const fs=require('fs'),path=require('path');
const P=require(path.join(__dirname,'../paths.cjs'));
const root=path.join(__dirname,'..');
const v5=JSON.parse(fs.readFileSync(path.join(P.outputs,'The-Seventh-Bell-v5.waypoint.json'),'utf8')).campaigns[0];
fs.mkdirSync(path.join(root,'ref'),{recursive:true});
fs.writeFileSync(path.join(root,'ref/sessions.json'),JSON.stringify(v5.sessions.map((s,i)=>({n:i+1,id:s.id,title:s.title})),null,1));
const j=JSON.parse(fs.readFileSync(path.join(P.app,'desktop/data/srd-5etools.json'),'utf8'));
const bases=['Tough','Tough Boss','Bandit','Bandit Captain','Constrictor Snake','Ghoul','Ghast','Ghost','Dire Wolf','Gargoyle','Flesh Golem','Wraith','Hell Hound','Warrior Infantry','Warrior Veteran','Gladiator','Knight','Mage','Cultist','Cultist Fanatic','Spy','Specter','Druid','Priest Acolyte','Priest','Commoner','Scout','Noble','Guard','Guard Captain','Swarm of Piranhas','Wight','Stone Golem','Winter Wolf','Ice Mephit','Shadow','Pirate','Pirate Captain','Berserker','Assassin','Archmage','Night Hag','Doppelganger','Will-o\'-Wisp','Swarm of Ravens','Warhorse','Riding Horse','Animated Armor','Shield Guardian','Mummy','Sea Hag','Water Elemental'];
const tag=(s)=>String(s).replace(/\{@(\w+) ([^}]*)\}/g,(m,t,a)=>{const v=a.split('|')[0];if(t==='hit')return '+'+v;if(t==='dc')return 'DC '+v;if(t==='atkr'||t==='atk')return v.includes('m')&&v.includes('r')?'Melee or Ranged Attack Roll:':v.includes('m')?'Melee Attack Roll:':'Ranged Attack Roll:';if(t==='recharge')return '(Recharge '+(v||'6')+')';return v}).replace(/\{@h\}/g,'Hit: ').replace(/\{@(\w+)\}/g,(m,t)=>t==='recharge'?'(Recharge 6)':t==='actSave'?'':t==='actSaveFail'?'Failure:':t==='actSaveSuccess'?'Success:':'');
const ent=(e)=>typeof e==='string'?tag(e):e.entries?(e.name?tag(e.name)+'. ':'')+e.entries.map(ent).join(' '):e.items?e.items.map(ent).join('; '):'';
const spells=(s)=>{const parts=[];if(s.will)parts.push('At will: '+s.will.map(tag).join(', '));if(s.daily)for(const [k,v] of Object.entries(s.daily))parts.push(k.replace('e','/day each')+': '+v.map(tag).join(', '));if(s.spells)for(const [k,v] of Object.entries(s.spells))parts.push('Level '+k+': '+(v.spells||[]).map(tag).join(', '));return parts.join(' | ')};
let md='# 2024 Monster Manual (SRD 5.2) base stat blocks\n\nExtracted from Waypoint\'s bundled data (source XMM). Use these as the base for Corvane creatures.\n\n';
for(const b of bases){const m=j.monster.find(x=>x.name===b&&x.source==='XMM');if(!m){md+='## '+b+'\n(not in the SRD 5.2 data)\n\n';continue}
 const cr=typeof m.cr==='object'?m.cr.cr:m.cr;const ac=(m.ac||[]).map(a=>typeof a==='object'?a.ac+(a.from?' ('+a.from.map(tag).join(', ')+')':''):a).join(', ');
 const sp=Object.entries(m.speed||{}).map(([k,v])=>k+' '+(typeof v==='object'?v.number:v)).join(', ');
 md+='## '+m.name+' — CR '+cr+'\n'+(m.size||[]).join('')+' '+(typeof m.type==='object'?m.type.type:m.type)+' | AC '+ac+' | HP '+m.hp.average+' ('+(m.hp.formula||'')+') | Speed '+sp+'\n';
 md+='STR '+m.str+' DEX '+m.dex+' CON '+m.con+' INT '+m.int+' WIS '+m.wis+' CHA '+m.cha+(m.save?' | Saves '+Object.entries(m.save).map(([k,v])=>k+' '+v).join(', '):'')+(m.skill?' | Skills '+Object.entries(m.skill).map(([k,v])=>k+' '+v).join(', '):'')+'\n';
 for(const k of ['resist','immune','conditionImmune','senses','languages'])if(m[k])md+=k+': '+JSON.stringify(m[k]).replace(/[{}"\[\]]/g,' ').replace(/\s+/g,' ')+'\n';
 for(const [k,label] of [['trait','Traits'],['action','Actions'],['bonus','Bonus Actions'],['reaction','Reactions'],['legendary','Legendary Actions']])if(m[k])md+='**'+label+'**\n'+m[k].map(a=>'- '+tag(a.name)+': '+a.entries.map(ent).join(' ')).join('\n')+'\n';
 if(m.spellcasting)md+='**Spellcasting**\n'+m.spellcasting.map(s=>'- '+tag(s.name)+': '+(s.headerEntries||[]).map(ent).join(' ')+' '+spells(s)).join('\n')+'\n';
 md+='\n';}
fs.writeFileSync(path.join(root,'ref/xmm-bases.md'),md);
console.log('sessions',v5.sessions.length,'bases bytes',md.length);
