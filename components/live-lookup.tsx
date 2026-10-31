'use client';
import {useState} from 'react';
import {Search,X} from 'lucide-react';
import PlayCard from './play-card';
import type {Campaign,Session} from '../lib/campaign';
import {searchPlays,type Play,type Playbook} from '../lib/playbook';

// Live mode's "what did they just do?": searches this session's plays first, then anytime plays, then the rest of the campaign.
export default function LiveLookup({campaign,session,pb,onPlayed}:{campaign:Campaign;session:Session;pb:Playbook;onPlayed:(play:Play,sessionId?:string)=>void}){
 const [query,setQuery]=useState(''),[open,setOpen]=useState('');
 const here=searchPlays(query,session.branches),anytime=searchPlays(query,pb.anytime),elsewhere=here.length+anytime.length<3?searchPlays(query,campaign.sessions.filter(s=>s.id!==session.id).flatMap(s=>s.branches)):[];
 const results=[...here.map(p=>({p,label:'This session',at:session.id})),...anytime.map(p=>({p,label:'Anytime',at:session.id})),...elsewhere.map(p=>{const at=campaign.sessions.find(s=>s.branches.includes(p));return {p,label:at?.title.split(':')[0]||'Elsewhere',at:at?.id}})].slice(0,5);
 const recorded=new Set(campaign.events.map(e=>e.branchId));
 return <section className="live-lookup" aria-labelledby="live-lookup-title"><h3 id="live-lookup-title" className="sr-only">What did they just do?</h3><div className="search-row"><Search size={18}/><input aria-label="What did they just do?" placeholder="What did they just do? “bribe Quill”, “dive”, “Speak with Dead”…" value={query} maxLength={200} onChange={e=>{setQuery(e.target.value);setOpen('')}}/>{query&&<button className="icon-button" aria-label="Clear lookup" onClick={()=>setQuery('')}><X size={15}/></button>}</div>
  {query.trim().length>1&&(results.length?<div className="live-results" role="status" aria-live="polite">{results.map(({p,label,at})=><PlayCard key={p.id} play={p} pb={pb} label={label} open={open===p.id} recorded={recorded.has(p.id)} onToggle={()=>setOpen(open===p.id?'':p.id)} onPlayed={play=>onPlayed(play,at)}/>)}</div>:<p className="tiny muted" role="status">No prepared play matches. Use the four responses: can it happen, what does it cost, how does the world react, what door does it open?</p>)}
 </section>;
}
