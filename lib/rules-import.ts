import {z} from 'zod';
import type {RuleEntry} from './rules';
export const ruleKinds:Record<string,string>={spell:'Spell',monster:'Creature',item:'Item',baseitem:'Item',condition:'Condition',disease:'Disease',status:'Status',feat:'Feat',background:'Background',race:'Species',subrace:'Subspecies',action:'Action',variantrule:'Rule',optionalfeature:'Feature',reward:'Reward',trap:'Trap',hazard:'Hazard',sense:'Sense',skill:'Skill',language:'Language',object:'Object',table:'Table',vehicle:'Vehicle',itemMastery:'Weapon mastery',class:'Class',subclass:'Subclass',classFeature:'Class feature',subclassFeature:'Subclass feature'};
type Loose=Record<string,unknown>;
const isRecord=(v:unknown):v is Loose=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rec=(v:unknown):Loose=>isRecord(v)?v:{};
const lengthOf=(v:unknown)=>Array.isArray(v)||typeof v==='string'?v.length:undefined;
// 5etools records have no fixed schema. A field with an unexpected shape is dropped (undefined) instead of rejecting the whole record,
// and every other field stays readable through the passthrough index.
const lenient=<T extends z.ZodTypeAny>(schema:T)=>schema.optional().catch(undefined);
const text=lenient(z.string());
const nonBlank=z.string().refine(s=>s.trim().length>0);
const RuleRecord=z.object({
 name:nonBlank,source:nonBlank,_copy:z.unknown(),page:z.unknown(),
 level:lenient(z.union([z.number(),z.string()])),school:text,className:text,subclassShortName:text,raceName:text,_waypointEdition:text,edition:text,
 rarity:text,dmg1:text,dmgType:text,dmg2:text,reqAttune:z.unknown(),weight:z.unknown(),value:z.unknown(),
 type:z.unknown(),size:z.unknown(),cr:z.unknown(),ac:z.unknown(),hp:z.unknown(),legendaryGroup:z.unknown(),
 time:z.unknown(),range:z.unknown(),components:z.unknown(),duration:z.unknown(),meta:z.unknown(),
 entries:z.unknown(),entriesHigherLevel:z.unknown(),additionalEntries:z.unknown(),prerequisite:z.unknown(),colLabels:z.unknown(),rows:z.unknown(),
}).passthrough();
const CollectionRecord=z.object({
 name:nonBlank,book:nonBlank,description:nonBlank,properties:z.record(z.string(),z.unknown()),publisher:text,
}).passthrough();
// One node of a 5etools entry tree. Only the keys that change how a node is flattened are described.
const EntryNode=z.object({type:text,name:text,caption:text,roll:lenient(z.object({exact:z.unknown(),min:z.unknown(),max:z.unknown()}).passthrough())}).passthrough();
export function ruleText(value:string){
 let s=value;
 for(let i=0;i<12&&s.includes('{@');i++)s=s.replace(/\{@(\w+)(?: ([^{}]*))?\}/g,(_all,tag:string,raw='')=>{
  const bits=raw.split('|');
  if(tag==='actSave')return ({str:'Strength',dex:'Dexterity',con:'Constitution',int:'Intelligence',wis:'Wisdom',cha:'Charisma'} as Record<string,string>)[bits[0]]+' Saving Throw:';
  if(tag==='actSaveFail')return `${bits[0]?bits[0]==='1'?'First failed save':'Second failed save':'Failure'}:`;
  if(tag==='actSaveSuccess')return 'Success:';
  if(tag==='actSaveSuccessOrFail')return 'Success or failure:';
  if(tag==='actSaveFailBy')return `Failure by ${bits[0]} or more:`;
  if(tag==='actTrigger')return 'Trigger:';
  if(tag==='actResponse')return 'Response:';
  if(tag==='hom')return 'Hit or miss: ';
  if(tag==='chance')return bits[0]+'%';
  if(tag==='quickref')return bits[4]||bits[0];
  if(['filter','book','classFeature','subclassFeature'].includes(tag))return bits[0];
  if(tag==='h')return 'Hit: ';
  if(tag==='dc')return 'DC '+bits[0];
  if(tag==='hit')return (/^-/.test(bits[0])?'':'+')+bits[0];
  if(tag==='recharge')return `Recharge ${bits[0]||'6'}${bits[0]&&bits[0]!=='6'?'–6':''}`;
  if(tag==='atk')return ({mw:'Melee Weapon Attack:',rw:'Ranged Weapon Attack:',ms:'Melee Spell Attack:',rs:'Ranged Spell Attack:','mw,rw':'Melee or Ranged Weapon Attack:'} as Record<string,string>)[bits[0]]||'Attack:';
  if(tag==='atkr')return ({m:'Melee Attack Roll:',r:'Ranged Attack Roll:','m,r':'Melee or Ranged Attack Roll:'} as Record<string,string>)[bits[0]]||'Attack Roll:';
  if(tag==='link')return bits[0];
  if(['dice','damage','d20','scaledice','scaledamage'].includes(tag))return bits[1]&&tag!=='scaledice'&&tag!=='scaledamage'?bits[1]:bits[0];
  return bits[2]||bits[0]||'';
 });return s;
}
function flatten(value:unknown,depth=0):string{
 if(depth>18)return '[Nested content omitted]';
 if(typeof value==='string')return ruleText(value);
 if(typeof value==='number'||typeof value==='boolean')return String(value);
 if(Array.isArray(value))return value.map(v=>flatten(v,depth+1)).filter(Boolean).join('\n');
 if(!isRecord(value))return '';
 const node=EntryNode.parse(value);
 if(node.type==='table')return [node.caption,flatten(value.colLabels,depth+1).replaceAll('\n',' | '),...(Array.isArray(value.rows)?value.rows.map(r=>flatten(r,depth+1).replaceAll('\n',' | ')):[])].filter(Boolean).join('\n');
 if(node.type==='list')return (Array.isArray(value.items)?value.items:[]).map(v=>'• '+flatten(v,depth+1)).join('\n');
 if(node.type==='cell'&&node.roll)return node.roll.exact!==undefined?String(node.roll.exact):`${node.roll.min}–${node.roll.max}`;
 if(value.entries||value.entry||value.items)return [node.name?ruleText(node.name):'',flatten(value.entries||value.entry||value.items,depth+1)].filter(Boolean).join('\n');
 return Object.entries(value).filter(([k])=>!k.startsWith('_')&&!['type','source','page','style','href','data','name'].includes(k)).map(([k,v])=>`${k}: ${flatten(v,depth+1)}`).join('; ');
}
const schools:Record<string,string>={A:'Abjuration',C:'Conjuration',D:'Divination',E:'Enchantment',V:'Evocation',I:'Illusion',N:'Necromancy',T:'Transmutation'};
const sizes:Record<string,string>={T:'Tiny',S:'Small',M:'Medium',L:'Large',H:'Huge',G:'Gargantuan'};
const attackLabels:Record<string,string>={trait:'Traits',action:'Actions',bonus:'Bonus actions',reaction:'Reactions',legendary:'Legendary actions',mythic:'Mythic actions',spellcasting:'Spellcasting'};
const collectionKinds:Record<string,string>={Spells:'Spell',Monsters:'Creature',Items:'Item',Backgrounds:'Background',Classes:'Class',Species:'Species',Races:'Species'};
function normalizeCollection(data:unknown[]){
 const entries:RuleEntry[]=[];let skipped=0;
 for(const item of data){
  const parsed=CollectionRecord.safeParse(item);
  if(!parsed.success){skipped++;continue;}
  const r=parsed.data;
  const kind=collectionKinds[String(r.properties.Category)];if(!kind){skipped++;continue;}
  const name=r.name.trim().slice(0,500),source=r.book.trim().slice(0,500),publisher=r.publisher?r.publisher.slice(0,300):'';
  const facts=Object.entries(r.properties).filter(([k,v])=>!['Category','Name','Expansion'].includes(k)&&!k.startsWith('data-')&&!k.startsWith('filter-')&&['string','number','boolean'].includes(typeof v)).map(([k,v])=>`${k}: ${String(v).slice(0,2000)}`);
  const body=[publisher?'Publisher: '+publisher:'',facts.join('\n'),'Description\n'+r.description].filter(Boolean).join('\n\n');
  entries.push({id:JSON.stringify(['dnd-data',kind,publisher,source,name]),name,source,kind,edition:/\b2024\b/.test(source)?'2024':/\b2014\b/.test(source)?'2014':'Unspecified',page:'',summary:facts.slice(0,4).join(' · '),body:body.slice(0,30000),warnings:body.length>30000?['Long entry shortened to 30,000 characters.']:[]});
 }
 return {entries,skipped};
}
export function normalizeRules(data:unknown){
 if(Array.isArray(data))return normalizeCollection(data);
 if(!isRecord(data))throw new Error('Expected a 5etools JSON object or dnd-data record array.');
 const entries:RuleEntry[]=[];let skipped=0;
 for(const [key,kind] of Object.entries(ruleKinds))for(const item of Array.isArray(data[key])?data[key]:[]){
  const parsed=RuleRecord.safeParse(item);
  if(!parsed.success||parsed.data._copy){skipped++;continue;}
  const r=parsed.data;
  const warnings:string[]=[],parts:string[]=[],facts:string[]=[];
  const add=(label:string,v:unknown)=>{const text=flatten(v);if(text)parts.push(`${label}\n${text}`)};
  const source=r.source.slice(0,120),context=['classFeature','subclassFeature','subclass'].includes(key)?[r.className,r.subclassShortName,r.level!==undefined?`Level ${r.level}`:''].filter(Boolean).join(' · '):key==='subrace'?r.raceName:'',name=(r.name+(context?` (${context})`:'')).slice(0,500),edition=r._waypointEdition||(['XPHB','XDMG','XMM'].includes(source)||r.edition==='one'?'2024':(['PHB','DMG','MM'].includes(source)||r.edition==='classic'?'2014':'Unspecified'));
  if(['class','subclass'].includes(key)){
   add('Hit dice',r.hd);add('Saving throw proficiencies',r.proficiency);add('Starting proficiencies',r.startingProficiencies);add('Starting equipment',r.startingEquipment);
   for(const field of ['classFeatures','subclassFeatures']){const list=r[field];if(Array.isArray(list))add('Feature index',list.map(v=>typeof v==='string'?v.replaceAll('|',' · '):isRecord(v)?String(v.classFeature||v.subclassFeature||'').replaceAll('|',' · '):''))}
   warnings.push('This is a class overview. Features are separate library entries; linked feature text is not automatically expanded.');
  }
  if(['race','subrace','background'].includes(key))for(const [field,label] of Object.entries({size:'Size',speed:'Speed',ability:'Ability adjustments',skillProficiencies:'Skill proficiencies',languageProficiencies:'Languages',toolProficiencies:'Tool proficiencies',startingEquipment:'Starting equipment'}))add(label,r[field]);
  if(key==='language'){add('Language type',r.type);add('Typical speakers',r.typicalSpeakers);add('Script',r.script)}
  if(key==='skill')add('Ability',r.ability);
  if(key==='table')add('Table',{type:'table',colLabels:r.colLabels,rows:r.rows});
  if(['object','vehicle'].includes(key))for(const [field,label] of Object.entries({size:'Size',ac:'Armor class',hp:'Hit points',speed:'Speed',immune:'Immunities',capCrew:'Crew capacity',capPassenger:'Passenger capacity',capCargo:'Cargo capacity',terrain:'Terrain'}))add(label,r[field]);
  if(key==='spell'){
   facts.push(`${r.level===0?'Cantrip':`Level ${r.level??'?'}`} · ${schools[r.school??'']||r.school||'Spell'}`);
   add('Casting time',Array.isArray(r.time)?r.time.map(t=>{const x=rec(t);return `${x.number??1} ${x.unit||''}${x.condition?` — ${x.condition}`:''}`}):r.time);
   const range=isRecord(r.range)?r.range:undefined,distance=isRecord(range?.distance)?range.distance:undefined;add('Range',distance?`${distance.amount??''} ${distance.type||''}${range?.type!=='point'?` (${range?.type})`:''}`.trim():range?.type);
   const components=isRecord(r.components)?r.components:undefined;if(components)add('Components',[components.v?'V':'',components.s?'S':'',components.m?'M ('+flatten(isRecord(components.m)?components.m.text:components.m)+')':''].filter(Boolean).join(', '));
   add('Duration',Array.isArray(r.duration)?r.duration.map(item=>{const d=rec(item),timed=rec(d.duration);return `${d.concentration?'Concentration, ':''}${d.type==='timed'?`${timed.amount??''} ${timed.type||''}`:d.type==='instant'?'Instantaneous':d.type}${d.ends?' ('+flatten(d.ends)+')':''}`}):r.duration);
   if(isRecord(r.meta)&&r.meta.ritual)facts.push('Ritual');
  }
  if(key==='monster'){
   const size=Array.isArray(r.size)?r.size:[],kindOf=typeof r.type==='string'?r.type:rec(r.type).type||'',cr=isRecord(r.cr)?r.cr.cr:r.cr??'?';
   facts.push(`${size.map(s=>sizes[String(s)]||s).join(' / ')} ${kindOf} · CR ${cr}`.trim());
   add('Armor class',Array.isArray(r.ac)?r.ac.map(v=>isRecord(v)?`${v.ac??''}${v.from?' ('+flatten(v.from)+')':''}${v.condition?' '+flatten(v.condition):''}`:v):r.ac);
   const hp=isRecord(r.hp)?r.hp:undefined;add('Hit points',hp?.special|| (r.hp?`${hp?.average??''} (${hp?.formula||''})`:''));add('Speed',r.speed);
   add('Ability scores',['str','dex','con','int','wis','cha'].map(k=>r[k]!==undefined?`${k.toUpperCase()} ${r[k]} (${Math.floor((Number(r[k])-10)/2)>=0?'+':''}${Math.floor((Number(r[k])-10)/2)})`:'').filter(Boolean).join(' · '));
   for(const [field,label] of Object.entries({save:'Saving throws',skill:'Skills',vulnerable:'Vulnerabilities',resist:'Resistances',immune:'Damage immunities',conditionImmune:'Condition immunities',senses:'Senses',passive:'Passive perception',languages:'Languages',alignment:'Alignment'}))add(label,r[field]);
   if(r.legendaryGroup)warnings.push('Lair actions and regional effects may be stored in a separate file and are not included here.');
  }
  if(kind==='Item'){
   facts.push([r.rarity&&r.rarity!=='none'?r.rarity:'',r.reqAttune?'Requires attunement':''].filter(Boolean).join(' · '));
   add('Weight',r.weight!==undefined?`${r.weight} lb.`:'');add('Value',r.value!==undefined?`${Number(r.value)/100} gp`:'');
   add('Damage',[r.dmg1,r.dmgType,r.dmg2?'versatile '+r.dmg2:''].filter(Boolean).join(' · '));add('Armor class',r.ac);add('Properties',r.property);add('Range',r.range);
   if(!lengthOf(r.entries))warnings.push('This entry contains equipment statistics only; shared item-type rules are not expanded.');
  }
  add('Description',r.entries);add('At higher levels',r.entriesHigherLevel);
  for(const [field,label] of Object.entries(attackLabels))add(label,r[field]);
  if(lengthOf(r.additionalEntries)){add('Additional information',r.additionalEntries);}
  if(r.prerequisite)add('Prerequisites',r.prerequisite);
  const body=parts.join('\n\n');if(!body&&!facts.filter(Boolean).length){skipped++;continue;}
  if(body.includes('{@')||body.includes('[Nested content omitted]'))warnings.push('Some structured references could not be fully expanded.');
  if(body.length>30000)warnings.push('Long entry shortened to 30,000 characters.');
  entries.push({id:JSON.stringify([kind,source,name]),name,kind,source,edition:String(edition).slice(0,40),page:String(r.page??'').slice(0,30),summary:facts.filter(Boolean).join(' · '),body:body.slice(0,30000),warnings});
 }
 return {entries,skipped};
}
