import {z} from 'zod';
import {validateCampaign,type Branch,type Campaign,type Card} from './campaign';
import {memoryOf,pageKinds,factStates,type WikiPage} from './memory';
import {count} from './plural';
import {playSchema,playbookSchema,type Playbook} from './playbook-schema';

// An update pack brings new content into an existing campaign as a reviewed list of changes.
// Text edits are find-and-replace, so the DM's own additions to a plan survive; a missing anchor is reported, never forced.
// `unless`: text that, once present, means the edit is already in (a later edit may have reworded part of what it inserted).
const edit=z.object({find:z.string().min(1).max(20000),replace:z.string().max(40000),unless:z.string().min(1).max(400).optional()});
type TextEdit={find:string;replace:string;unless?:string};
const packPage=z.object({id:z.string().max(120),title:z.string().min(1).max(160),kind:z.enum(pageKinds),body:z.string().max(12000),aliases:z.string().max(1000),status:z.enum(factStates),visibility:z.enum(['DM only','Party knows'])});
const packCard=z.object({id:z.string().max(120),kind:z.string().max(80),title:z.string().max(200),body:z.string().max(12000),readAloud:z.string().max(6000),consequence:z.string().max(6000),source:z.string().max(300)});
export const updatePackSchema=z.object({kind:z.literal('waypoint-update-pack'),version:z.literal(1),id:z.string().max(120),title:z.string().max(200),summary:z.string().max(4000),match:z.object({campaignIds:z.array(z.string().max(120)).max(20),names:z.array(z.string().max(200)).max(20)}),
 campaign:z.object({premise:z.string().max(12000).optional(),tone:z.string().max(400).optional(),arc:z.string().max(40000).optional(),edits:z.array(edit.extend({field:z.enum(['premise','arc','party','boundaries'])})).max(40).optional()}).optional(),
 planner:z.object({locked:z.array(edit).max(40).optional()}).optional(),
 sessions:z.array(z.object({id:z.string().max(120),summary:z.string().max(2000).optional(),edits:z.array(edit).max(40).optional(),plays:z.array(playSchema).max(40).optional(),retire:z.array(z.string().max(120)).max(40).optional()})).max(80).optional(),
 pages:z.array(z.object({mode:z.enum(['add','replace']),page:packPage,note:z.string().max(400).optional()})).max(200).optional(),
 pageEdits:z.array(z.object({id:z.string().max(120),title:z.string().min(1).max(160).optional(),edits:z.array(edit).min(1).max(40)})).max(200).optional(),
 cards:z.array(packCard).max(100).optional(),
 terms:z.object({replace:z.array(z.tuple([z.string().min(1).max(400),z.string().max(400)])).min(1).max(40),keep:z.array(z.string().min(1).max(200)).max(40).optional(),note:z.string().max(400).optional()}).optional(),
 playbook:playbookSchema.omit({state:true,log:true,checks:true}).optional(),
 // Material the pack retires: a section of every session plan (by its heading line, ending at the next heading or at its `until` line), and wiki pages and saved cards by id.
 remove:z.object({sections:z.array(z.object({heading:z.string().min(2).max(200),until:z.string().min(1).max(400).optional()})).max(20).optional(),pages:z.array(z.string().max(120)).max(100).optional(),cards:z.array(z.string().max(120)).max(100).optional(),note:z.string().max(400).optional()}).optional()});
export type UpdatePack=z.infer<typeof updatePackSchema>;
// A renamed term ("Tongue" → "Heart") is applied to the DM's text first, and every edit is matched against the renamed text, so edits
// written in the new words still find their anchors. Phrases in `keep` (a spell name, an idiom) are left alone. The chronicle is history and is never renamed.
export function renameTerms(text:string,t?:UpdatePack['terms']){if(!t||!text)return text;const keep=(t.keep||[]).filter(k=>text.includes(k));let out=text;keep.forEach((k,i)=>{out=out.split(k).join('§§'+i+'§§')});for(const [a,b] of t.replace)out=out.split(a).join(b);keep.forEach((k,i)=>{out=out.split('§§'+i+'§§').join(k)});return out}
const branchText=['title','why','readAloud','response','consequence','fallback','tells','rules','later'] as const;
function renameCampaign(c:Campaign,t?:UpdatePack['terms']):Campaign{if(!t)return c;const r=(x:string)=>renameTerms(x,t);const m=memoryOf(c);
 return {...c,premise:r(c.premise),arc:r(c.arc),party:r(c.party),boundaries:r(c.boundaries),twist:r(c.twist),sessions:c.sessions.map(s=>({...s,title:r(s.title),plan:r(s.plan),summary:r(s.summary),branches:s.branches.map(b=>{const o={...b};for(const k of branchText)if(typeof o[k]==='string')(o as Record<string,unknown>)[k]=r(o[k] as string);return o})})),cards:c.cards.map(x=>({...x,title:r(x.title),body:r(x.body),readAloud:r(x.readAloud),consequence:r(x.consequence)})),memory:{...m,pages:m.pages.map(pg=>({...pg,title:r(pg.title),body:r(pg.body),aliases:r(pg.aliases)})),planner:{...m.planner,locked:r(m.planner.locked)}}}}
export type PlannedChange={id:string;group:'Foresight playbook'|'Session plays'|'Session notes'|'World wiki'|'Campaign'|'Saved material';label:string;detail:string;status:'ready'|'applied'|'conflict'};

export const packMatches=(c:Campaign,p:UpdatePack)=>p.match.campaignIds.includes(c.id)||p.match.names.some(n=>c.name.trim().toLowerCase().startsWith(n.toLowerCase()));
// An edit counts as applied once its replacement (or its `unless` text) is present, so edits that append to their anchor never apply twice.
const done=(text:string,e:TextEdit)=>!!(e.replace&&text.includes(e.replace))||!!(e.unless&&text.includes(e.unless));
const applyEdits=(text:string,edits:TextEdit[]=[])=>edits.reduce((t,e)=>!done(t,e)&&t.includes(e.find)?t.replace(e.find,e.replace):t,text);
const editStatus=(text:string,e:TextEdit):PlannedChange['status']=>done(text,e)?'applied':text.includes(e.find)?'ready':'conflict';
// Edits in one list are checked in order against the text as the earlier ready ones leave it, so a pack can build on its own earlier edits.
const chain=(text:string,edits:TextEdit[])=>{let t=text;return edits.map(e=>{const status=editStatus(t,e);if(status==='ready')t=applyEdits(t,[e]);return status})};
// Cuts a section from its heading line to the next heading of the same or a higher level (or the end), with the blank lines and rule before it.
export function withoutSection(text:string,heading:string,until?:string){const lines=text.split('\n'),at=lines.findIndex(l=>l.trim()===heading);if(at<0)return text;const level=heading.match(/^#+/)?.[0].length||0;let end=at+1;while(end<lines.length&&!((lines[end].match(/^(#+) /)?.[1].length??99)<=level))end++;if(until){const k=lines.findIndex((l,i)=>i>at&&i<end&&l.includes(until));if(k>=0)end=k+1}let start=at;while(start>0&&(!lines[start-1].trim()||(end===lines.length&&/^(-{3,}|\*{3,})$/.test(lines[start-1].trim()))))start--;const before=lines.slice(0,start),after=lines.slice(end);return after.length?[...before,'',...after].join('\n'):before.join('\n')}
const hasSection=(text:string,heading:string)=>text.split('\n').some(l=>l.trim()===heading);
const snippet=(t:string,n=110)=>{const s=t.replace(/\s+/g,' ').replace(/[*_>#]/g,'').trim();return s.length>n?s.slice(0,n-1)+'…':s};

// Imported paths the pack supersedes; one the chronicle points at is kept.
const retired=(c:Campaign,branches:Branch[],ids:string[]=[])=>branches.filter(b=>ids.includes(b.id)&&b.origin!=='playbook'&&!c.events.some(e=>e.branchId===b.id));
export function planUpdate(original:Campaign,p:UpdatePack):PlannedChange[]{const out:PlannedChange[]=[];
 if(p.terms){const renamed=renameCampaign(original,p.terms),changed=JSON.stringify(renamed)!==JSON.stringify(original);const n=(xs:string[])=>xs.length;const pages=n(memoryOf(original).pages.filter((pg,i)=>JSON.stringify(pg)!==JSON.stringify(memoryOf(renamed).pages[i])).map(pg=>pg.id)),sessions=n(original.sessions.filter((s,i)=>JSON.stringify(s)!==JSON.stringify(renamed.sessions[i])).map(s=>s.id)),cards=n(original.cards.filter((x,i)=>JSON.stringify(x)!==JSON.stringify(renamed.cards[i])).map(x=>x.id));out.push({id:'terms',group:'Campaign',label:'Rename '+p.terms.replace.slice(0,1).map(([a,b])=>'“'+a+'” to “'+b+'”').join('')+' everywhere',detail:(changed?`Changes ${count(sessions,'session')}, ${count(pages,'wiki page')} and ${count(cards,'saved card')}. `:'')+(p.terms.note||'')+' Your chronicle is history and keeps its words. Untick this and edits written in the new words can’t be placed.',status:changed?'ready':'applied'})}
 const c=renameCampaign(original,p.terms),m=memoryOf(c);
 if(p.playbook){const old=m.playbook;out.push({id:'playbook',group:'Foresight playbook',label:old?'Refresh the playbook ('+old.version+' → '+p.playbook.version+')':'Install the playbook',detail:`${p.playbook.flags.length} world-state facts, ${p.playbook.anytime.length} anytime plays, ${p.playbook.encounters.length} encounters, ${p.playbook.statblocks.length} 2024 stat blocks, ${p.playbook.briefs.length} session briefs, ${p.playbook.endings.length} endings. ${old?'Your current world state and history are kept.':'World state starts at the campaign opening.'}`,status:old&&JSON.stringify({...old,state:undefined,log:undefined,checks:undefined})===JSON.stringify({...p.playbook,state:undefined,log:undefined,checks:undefined})?'applied':'ready'})}
 for(const s of p.sessions||[]){const session=c.sessions.find(x=>x.id===s.id);const name=session?session.title:'Missing session';
  if(s.plays?.length){const current=(session?.branches||[]).filter(b=>b.origin==='playbook'),retiring=retired(c,session?.branches||[],s.retire);out.push({id:'plays:'+s.id,group:'Session plays',label:name,detail:`${s.plays.length} prepared plays.${current.length?' Replaces '+current.length+' earlier playbook plays.':''}${retiring.length?' Retires '+retiring.length+' imported guide scenarios the plays now cover.':''} Your own and AI paths stay.`,status:!session?'conflict':!retiring.length&&JSON.stringify(current)===JSON.stringify(s.plays.map(x=>({...x,origin:'playbook'})))?'applied':'ready'})}
  const st=session?chain(session.plan,s.edits||[]):[];(s.edits||[]).forEach((e,i)=>out.push({id:'edit:'+s.id+':'+i,group:'Session notes',label:name,detail:'Replace “'+snippet(e.find)+'” with “'+snippet(e.replace)+'”',status:st[i]||'conflict'}));
  if(s.summary&&session)out.push({id:'summary:'+s.id,group:'Session notes',label:name+' · summary',detail:snippet(s.summary,160),status:session.summary===s.summary?'applied':'ready'})}
 for(const x of p.pages||[]){const old=m.pages.find(pg=>pg.id===x.page.id);out.push({id:'page:'+x.page.id,group:'World wiki',label:(old?'Update ':'Add ')+x.page.title,detail:(x.note?x.note+' ':'')+(old?'The current text moves to the page’s revision history.':snippet(x.page.body,140)),status:old&&old.body===x.page.body&&old.title===x.page.title?'applied':x.mode==='add'&&old?'applied':'ready'})}
 for(const x of p.pageEdits||[]){const old=m.pages.find(pg=>pg.id===x.id),st=old?chain(old.body,x.edits):[];x.edits.forEach((e,i)=>out.push({id:'pedit:'+x.id+':'+i,group:'World wiki',label:(old?old.title:'Missing page')+(x.title&&i===0?' → '+x.title:''),detail:'Replace “'+snippet(e.find)+'” with “'+snippet(e.replace)+'”',status:st[i]||'conflict'}))}
 if(p.campaign){for(const k of ['premise','tone','arc'] as const)if(p.campaign[k]!==undefined)out.push({id:'campaign:'+k,group:'Campaign',label:'Replace the campaign '+k,detail:snippet(p.campaign[k]!,160),status:c[k]===p.campaign[k]?'applied':'ready'});const text={premise:c.premise,arc:c.arc,party:c.party,boundaries:c.boundaries};(p.campaign.edits||[]).forEach((e,i)=>{const status=editStatus(text[e.field],e);if(status==='ready')text[e.field]=applyEdits(text[e.field],[e]);out.push({id:'cedit:'+i,group:'Campaign',label:'Edit the campaign '+e.field,detail:'Replace “'+snippet(e.find)+'” with “'+snippet(e.replace)+'”',status})})}
 const lst=chain(m.planner.locked,p.planner?.locked||[]);(p.planner?.locked||[]).forEach((e,i)=>out.push({id:'planner:'+i,group:'Campaign',label:'Edit the locked facts for next-session planning',detail:'Replace “'+snippet(e.find)+'” with “'+snippet(e.replace)+'”',status:lst[i]}));
 const rm=p.remove,why=rm?.note?' '+rm.note:'';
 for(const {heading:h} of rm?.sections||[])for(const s of c.sessions)if(hasSection(s.plan,h))out.push({id:'rmsec:'+s.id+':'+h,group:'Session notes',label:s.title,detail:'Remove the “'+h.replace(/^#+\s*/,'')+'” section.'+why,status:'ready'});
 for(const id of rm?.pages||[]){const pg=m.pages.find(x=>x.id===id);if(pg)out.push({id:'rmpage:'+id,group:'World wiki',label:'Remove '+pg.title,detail:'Deletes the page.'+why,status:'ready'})}
 for(const id of rm?.cards||[]){const card=c.cards.find(x=>x.id===id);if(card)out.push({id:'rmcard:'+id,group:'Saved material',label:'Remove '+card.title,detail:'Deletes the saved card.'+why,status:'ready'})}
 for(const card of p.cards||[])out.push({id:'card:'+card.id,group:'Saved material',label:'Add '+card.title,detail:card.kind,status:c.cards.some(x=>x.id===card.id)?'applied':'ready'});
 return out}

// Applies only the chosen, ready changes. Existing playbook state, roster, ledger and bargains are never reset;
// a recorded value the new playbook no longer offers falls back to its opening value, and clocks clamp to their new range.
export function applyUpdate(original:Campaign,p:UpdatePack,chosen:Set<string>):Campaign{const planned=new Map(planUpdate(original,p).map(x=>[x.id,x]));const c=chosen.has('terms')&&planned.get('terms')?.status==='ready'?renameCampaign(original,p.terms):original;const take=(id:string)=>chosen.has(id)&&planned.get(id)?.status==='ready';const now=new Date().toISOString();
 let m=memoryOf(c);
 if(p.playbook&&take('playbook')){const old=m.playbook;const flags=new Set(p.playbook.flags.map(f=>f.id));const byId=new Map(p.playbook.flags.map(f=>[f.id,f]));const next:Playbook={...p.playbook,state:Object.fromEntries(Object.entries(old?.state||{}).flatMap(([k,v])=>{const f=byId.get(k);if(!flags.has(k)||!f)return [];if(f.options)return f.options.some(o=>o.id===v)?[[k,v]]:[];return [[k,Math.max(0,Math.min(f.max??99,Number(v)||0))]]})),log:old?.log||[],checks:old?.checks};m={...m,playbook:next}}
 const sessions=c.sessions.map(s=>{const u=(p.sessions||[]).find(x=>x.id===s.id);if(!u)return s;let plan=s.plan,branches=s.branches,summary=s.summary;
  (u.edits||[]).forEach((e,i)=>{if(take('edit:'+s.id+':'+i))plan=applyEdits(plan,[e])});
  if(u.plays&&take('plays:'+s.id)){const gone=new Set(retired(c,s.branches,u.retire).map(b=>b.id));branches=[...s.branches.filter(b=>b.origin!=='playbook'&&!gone.has(b.id)),...u.plays.map(x=>({...x,origin:'playbook' as const}))] as Branch[]}
  if(u.summary&&take('summary:'+s.id))summary=u.summary;
  return {...s,plan,branches,summary}});
 let pages=m.pages;for(const x of p.pages||[]){if(!take('page:'+x.page.id))continue;const old=pages.find(pg=>pg.id===x.page.id);const page:WikiPage={related:old?.related,clock:old?.clock,...x.page,sourceId:old?.sourceId||'',quote:old?.quote||'',updated:now,history:old?[{sourceId:old.sourceId,quote:old.quote,body:old.body,status:old.status,visibility:old.visibility,date:old.updated},...old.history]:[]};pages=old?pages.map(pg=>pg.id===page.id?page:pg):[...pages,page]}
 for(const x of p.pageEdits||[]){const old=pages.find(pg=>pg.id===x.id);if(!old)continue;const taken=x.edits.filter((e,i)=>take('pedit:'+x.id+':'+i));if(!taken.length)continue;const page:WikiPage={...old,title:x.title&&take('pedit:'+x.id+':0')?x.title:old.title,body:applyEdits(old.body,taken),updated:now,history:[{sourceId:old.sourceId,quote:old.quote,body:old.body,status:old.status,visibility:old.visibility,date:old.updated},...old.history]};pages=pages.map(pg=>pg.id===page.id?page:pg)}
 let locked=m.planner.locked;(p.planner?.locked||[]).forEach((e,i)=>{if(take('planner:'+i))locked=applyEdits(locked,[e])});
 const rm=p.remove,goneCards=new Set((rm?.cards||[]).filter(id=>take('rmcard:'+id))),gonePages=new Set((rm?.pages||[]).filter(id=>take('rmpage:'+id)));
 const trimmed=sessions.map(s=>{const plan=(rm?.sections||[]).reduce((t,x)=>take('rmsec:'+s.id+':'+x.heading)?withoutSection(t,x.heading,x.until):t,s.plan);return {...s,plan,pinnedCardId:s.pinnedCardId&&goneCards.has(s.pinnedCardId)?undefined:s.pinnedCardId}});
 if(gonePages.size)pages=pages.filter(pg=>!gonePages.has(pg.id)).map(pg=>pg.related?.some(id=>gonePages.has(id))?{...pg,related:pg.related.filter(id=>!gonePages.has(id))}:pg);
 const keep=(ids?:string[])=>ids?.filter(id=>!gonePages.has(id));
 const next:Campaign={...c,sessions:trimmed,cards:[...c.cards.filter(x=>!goneCards.has(x.id)),...(p.cards||[]).filter(card=>take('card:'+card.id)) as Card[]],memory:{...m,pages,pins:keep(m.pins),planner:{...m.planner,locked,threadIds:keep(m.planner.threadIds)}}};
 if(p.campaign){for(const k of ['premise','tone','arc'] as const)if(p.campaign[k]!==undefined&&take('campaign:'+k))next[k]=p.campaign[k]!;(p.campaign.edits||[]).forEach((e,i)=>{if(take('cedit:'+i))next[e.field]=applyEdits(next[e.field],[e])})}
 if(!validateCampaign(next))throw new Error('This update would produce an invalid campaign, so nothing was changed.');
 return next}
