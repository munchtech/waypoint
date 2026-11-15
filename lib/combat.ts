import type {Playbook,Encounter} from './playbook';
import type {WikiPage} from './memory';

export type EncounterCreature=Encounter['creatures'][number];
export function sessionEncounters(pb:Playbook|undefined,sessionId:string){
 if(!pb)return [];
 const listed=pb.briefs.find(brief=>brief.sessionId===sessionId)?.encounters||[];
 return pb.encounters.filter(encounter=>encounter.sessionId===sessionId||listed.includes(encounter.id));
}
const normalized=(text:string)=>text.toLowerCase().replace(/^\s*[\d.]+\s*/,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function pageCreatures(page:WikiPage,pb?:Playbook):EncounterCreature[]{
 if(!pb)return [];
 const names=[page.title,...page.aliases.split(/[,;\n]/)].map(normalized).filter(name=>name.length>=4);
 const matches=(name:string)=>names.some(alias=>{const candidate=normalized(name);return candidate===alias||(' '+candidate+' ').includes(' '+alias+' ')});
 const blocks=pb.statblocks.map(block=>({name:block.name,statblock:block.id,base:block.base,cr:block.cr,count:1}));
 const all=[...pb.encounters.flatMap(encounter=>encounter.creatures),...blocks];
 const exact=all.filter(creature=>names.includes(normalized(creature.name)));
 const candidates=exact.length?exact:all.filter(creature=>matches(creature.name));
 return candidates.filter((creature,i,list)=>list.findIndex(other=>(other.statblock||other.base)===(creature.statblock||creature.base))===i);
}
