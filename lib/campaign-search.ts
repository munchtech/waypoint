import type {Campaign} from './campaign';
import {memoryOf} from './memory';

export type SearchHit={id:string;kind:'Wiki'|'Journal'|'Event'|'Session'|'Material';title:string;body:string;status:string;date:string;sessionId?:string;sourceId?:string;score:number};
const stop=new Set(['the','and','what','did','was','were','with','from','that','this','have','has','for','our','are','who','how']);
export function terms(text:string){return [...new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(t=>t.length>2&&!stop.has(t)).map(t=>t.replace(/(?:ing|ed|es|s)$/,'')))].filter(Boolean)}
export function relevance(text:string,query:string){const words=terms(text),tokens=terms(query);return tokens.reduce((sum,t)=>sum+(words.some(w=>w===t||w.startsWith(t)||t.startsWith(w))?1:0),0)}
export function searchCampaign(c:Campaign,query:string,kind='All'):SearchHit[]{
 const m=memoryOf(c);
 const entries:Omit<SearchHit,'score'>[]=[
  ...m.pages.map(p=>({id:p.id,kind:'Wiki' as const,title:p.title+(p.aliases?' · '+p.aliases:''),body:p.body,status:p.status+' · '+p.visibility,date:p.updated,sourceId:p.sourceId})),
  ...m.notes.map(n=>({id:n.id,kind:'Journal' as const,title:n.title,body:n.text,status:'Source notes · may contain claims or plans',date:n.date,sessionId:n.sessionId})),
  ...c.events.map(e=>({id:e.id,kind:'Event' as const,title:c.sessions.find(s=>s.id===e.sessionId)?.title||'Recorded event',body:e.text,status:'Confirmed · '+e.enjoyment,date:e.date,sessionId:e.sessionId})),
  ...c.sessions.map(s=>({id:s.id,kind:'Session' as const,title:s.title,body:s.plan+'\n'+s.summary,status:s.done?'Completed session plan · not a record of outcomes':'Prepared draft',date:'',sessionId:s.id})),
  ...c.cards.map(card=>({id:card.id,kind:'Material' as const,title:card.title,body:card.body+'\n'+card.readAloud,status:'Suggested material · not canon',date:''}))
 ];
 return entries.filter(e=>kind==='All'||e.kind===kind).map(e=>({...e,score:relevance(e.title,query)*4+relevance(e.body,query)})).filter(e=>!query.trim()||e.score>0).sort((a,b)=>b.score-a.score||b.date.localeCompare(a.date)).slice(0,80);
}
export function excerpt(body:string,query:string){const token=terms(query).find(t=>body.toLowerCase().includes(t));const at=token?body.toLowerCase().indexOf(token):0;const start=Math.max(0,at-90);return (start?'…':'')+body.slice(start,start+360)+(start+360<body.length?'…':'')}

export function playerFacts(c:Campaign,ids:string[]){return memoryOf(c).pages.filter(p=>ids.includes(p.id)&&p.visibility==='Party knows'&&p.status!=='Planned').map(p=>({id:p.id,title:p.title,status:p.status,body:p.body}));}
export function composePlayerHandout(c:Campaign,ids:string[]){return playerFacts(c,ids).map(p=>`${p.title}\n${p.status==='Confirmed'?'Known fact':p.status}\n${p.body}`).join('\n\n');}
