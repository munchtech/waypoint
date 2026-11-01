import {z} from 'zod';
import type {Campaign} from './campaign';
import {bargainSchema,ledgerSchema,playbookSchema,rosterSchema,wikiKinds} from './playbook-schema';

export const pageKinds=['NPC','Character','Location','Faction','Quest','Item','Lore','Ruling'] as const;
export const factStates=['Confirmed','Rumor','Planned','Unresolved'] as const;
const revision=z.object({sourceId:z.string().optional(),quote:z.string().optional(),body:z.string(),date:z.string(),status:z.enum(factStates),visibility:z.enum(['DM only','Party knows'])});
export const wikiPage=z.object({related:z.array(z.string()).optional(),clock:z.object({progress:z.number().min(0).max(6),stakes:z.string()}).optional(),id:z.string(),title:z.string().min(1),kind:z.enum(pageKinds),body:z.string(),aliases:z.string(),status:z.enum(factStates),visibility:z.enum(['DM only','Party knows']),sourceId:z.string(),quote:z.string(),updated:z.string(),history:z.array(revision)});
const proposal=z.object({appliedToExisting:z.boolean().optional(),id:z.string(),title:z.string(),kind:z.enum(pageKinds),body:z.string(),quote:z.string(),state:z.enum(['pending','accepted','dismissed']),pageId:z.string().optional()});
const note=z.object({recordingId:z.string().optional(),transcriptRevision:z.number().int().nonnegative().optional(),id:z.string(),sessionId:z.string(),title:z.string(),text:z.string(),date:z.string(),summary:z.string(),proposals:z.array(proposal)});
export const tableSchema=z.object({actors:z.array(z.object({id:z.string(),name:z.string(),initiative:z.number()})),current:z.string(),round:z.number()});
export type TableState=z.infer<typeof tableSchema>;
export const handoutSchema=z.object({id:z.string(),title:z.string().max(200),body:z.string().max(30000),sourcePageIds:z.array(z.string()),updated:z.string()});
export type Handout=z.infer<typeof handoutSchema>;
export const markerKinds=['Important moment','New NPC','Promise','Ruling','Follow up','Loved this'] as const;
export type MarkerKind=typeof markerKinds[number];
const tableMarker=z.object({id:z.string(),sessionId:z.string(),kind:z.enum(markerKinds),text:z.string(),created:z.string()});
export type TableMarker=z.infer<typeof tableMarker>;
// What the DM has sent to the player wiki: the exact text that is public, newest first.
const sentEntry=z.object({id:z.string().max(120),title:z.string().min(1).max(200),kind:z.enum(wikiKinds),body:z.string().min(1).max(6000),sentAt:z.string().max(40),sessionId:z.string().max(120)});
export const memorySchema=z.object({playbook:playbookSchema.optional(),site:z.object({entries:z.array(sentEntry).max(600)}).optional(),roster:rosterSchema.optional(),ledger:ledgerSchema.optional(),bargains:bargainSchema.optional(),pins:z.array(z.string()).optional(),handouts:z.array(handoutSchema).optional(),table:tableSchema.optional(),markers:z.array(tableMarker).optional(),pages:z.array(wikiPage),notes:z.array(note),planner:z.object({threadIds:z.array(z.string()).optional(),levers:z.array(z.string()).optional(),duration:z.string(),focus:z.string(),spotlight:z.string(),locked:z.string()})});
export type Memory=z.infer<typeof memorySchema>;
export type WikiPage=z.infer<typeof wikiPage>;
// An unsaved wiki draft. Call it from an event handler: it reads the clock and generates an id.
export const draftPage=(seed:Pick<WikiPage,'title'|'kind'|'body'>):WikiPage=>({id:crypto.randomUUID(),title:seed.title,kind:seed.kind,body:seed.body,aliases:'',status:'Unresolved',visibility:'DM only',sourceId:'',quote:'',updated:new Date().toISOString(),history:[]});
export type SessionNote=Memory['notes'][number];
export type Proposal=SessionNote['proposals'][number];
export const emptyMemory=():Memory=>({pages:[],notes:[],planner:{duration:'3 hours',focus:'Follow unresolved choices and consequences',spotlight:'',locked:''}});
export const memoryOf=(c:Campaign)=>c.memory||emptyMemory();
// Levers are DM-chosen adjustments to the next-session plan. Tone levers replace each other; shape levers combine.
export const plannerLevers=[
 {id:'more-combat',label:'More combat',group:'tone',instruction:'Give combat more weight, with at least one encounter that has clear stakes and a retreat route.'},
 {id:'more-roleplay',label:'More roleplay',group:'tone',instruction:'Center negotiation, relationships and NPC motivations. Keep fights brief.'},
 {id:'more-mystery',label:'More mystery',group:'tone',instruction:'Lead with clues, contradictions and hidden motives. Each clue should point toward a choice.'},
 {id:'more-exploration',label:'More exploration',group:'tone',instruction:'Offer open locations and discoveries the party can pursue in any order.'},
 {id:'add-twist',label:'Add a twist',group:'shape',instruction:'Include one twist that introduces clues and choices. Check it against confirmed facts and boundaries.'},
 {id:'avoid-repeats',label:'Avoid repeats',group:'shape',instruction:'Do not reuse an encounter, location or NPC role from the most recent sessions.'},
 {id:'two-hours',label:'Two-hour session',group:'shape',instruction:'Fit the plan into about two hours: three scenes at most, with a clear closing beat.'},
] as const;
export function toggleLever(levers:string[],id:string):string[]{
 const lever=plannerLevers.find(l=>l.id===id);
 if(!lever)return levers;
 if(levers.includes(id))return levers.filter(x=>x!==id);
 const replaced=lever.group==='tone'?plannerLevers.filter(l=>l.group==='tone').map(l=>l.id as string):[];
 return [...levers.filter(x=>!replaced.includes(x)),id];
}
export const plannerLeverInstructions=(levers:string[]=[])=>plannerLevers.filter(l=>levers.includes(l.id)).map(l=>l.instruction);
export const markersForSession=(m:Memory,sessionId:string)=>(m.markers||[]).filter(k=>k.sessionId===sessionId).sort((a,b)=>b.created.localeCompare(a.created));
export const addTableMarker=(m:Memory,marker:TableMarker):Memory=>({...m,markers:[...(m.markers||[]),{...marker,text:marker.text.trim().slice(0,500)}]});
export const removeTableMarker=(m:Memory,id:string):Memory=>({...m,markers:(m.markers||[]).filter(k=>k.id!==id)});
const normalize=(s:string)=>s.trim().replace(/\s+/g,' ').toLowerCase();
export function groundedProposals(cards:{title:string;kind:string;body:string;readAloud:string}[],text:string):Proposal[]{
 const seen=new Set<string>();
 return cards.filter(c=>c.title.trim()&&c.body.trim()&&c.readAloud.trim().length>=8&&normalize(text).includes(normalize(c.readAloud))).filter(c=>{const key=normalize(c.title+' '+c.body);if(seen.has(key))return false;seen.add(key);return true}).map(c=>({id:crypto.randomUUID(),title:c.title,kind:pageKinds.includes(c.kind as typeof pageKinds[number])?c.kind as typeof pageKinds[number]:'Lore',body:c.readAloud,quote:c.readAloud,state:'pending'}));
}
export function acceptProposal(memory:Memory,noteId:string,id:string,status:WikiPage['status'],visibility:WikiPage['visibility']):Memory{
 const source=memory.notes.find(n=>n.id===noteId),candidate=source?.proposals.find(p=>p.id===id);
 if(!candidate||candidate.state!=='pending')return memory;
 const pageId=crypto.randomUUID();
 const page:WikiPage={id:pageId,title:candidate.title,kind:candidate.kind,body:candidate.body,aliases:'',status,visibility,sourceId:noteId,quote:candidate.quote,updated:new Date().toISOString(),history:[]};
 return {...memory,pages:[page,...memory.pages],notes:memory.notes.map(n=>n.id===noteId?{...n,proposals:n.proposals.map(p=>p.id===id?{...p,state:'accepted',pageId}:p)}:n)};
}
export function memoryContext(c:Campaign,partyOnly=false,query=''){
 const m=memoryOf(c);const words=(query.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[]).slice(0,150);
 const eligible=m.pages.filter(p=>!partyOnly||p.visibility==='Party knows');
 const score=(p:WikiPage)=>words.reduce((n,w)=>n+((p.title+' '+p.aliases).toLowerCase().includes(w)?6:p.body.toLowerCase().includes(w)?1:0),0)+(m.planner.threadIds?.includes(p.id)?20:0)+(m.pins?.includes(p.id)?5:0)+(p.clock?2:0);
 const selected=[...eligible].sort((a,b)=>Number(m.planner.threadIds?.includes(b.id)||false)-Number(m.planner.threadIds?.includes(a.id)||false)||score(b)-score(a)||b.updated.localeCompare(a.updated)).slice(0,40);
 // Live markers are DM-only: they are left out of the player-safe context entirely.
 const tableMarkers=partyOnly?[]:(m.markers||[]).slice(-80).map(k=>({kind:k.kind,text:k.text,session:c.sessions.find(s=>s.id===k.sessionId)?.title||'',created:k.created}));
 return {wiki:selected.map(p=>({id:p.id,title:p.title,kind:p.kind,status:p.status,visibility:p.visibility,body:p.body.slice(0,1800),source:p.sourceId,related:p.related||[],clock:p.clock})),wikiSelection:{included:selected.length,total:eligible.length,method:'Relevant words, pinned pages, clocks and recent updates'},planningPreferences:{...m.planner,leverInstructions:plannerLeverInstructions(m.planner.levers)},tableMarkers};
}
