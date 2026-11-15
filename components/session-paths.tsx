'use client';
import {useEffect,useRef,useState} from 'react';
import {Search} from 'lucide-react';
import type {Campaign,Session} from '../lib/campaign';
import {memoryOf} from '../lib/memory';
import {isPossible,rankPlays,searchPlays,type Play} from '../lib/playbook';
import PlayCard from './play-card';

type Props={campaign:Campaign;session:Session;expanded:string|null;onExpand:(id:string|null)=>void;onPlayed:(play:Play,sessionId?:string)=>void;onQuick:(play:Play,sessionId?:string)=>void;onAdapt:(prompt:string)=>void;targetId?:string};
export default function SessionPaths({campaign,session,expanded,onExpand,onPlayed,onQuick,onAdapt,targetId}:Props){
 const pb=memoryOf(campaign).playbook;
 const [query,setQuery]=useState(''),[scope,setScope]=useState(()=>targetId&&(pb?.anytime||[]).some(p=>p.id===targetId)?'Anytime':'This session'),[showBlocked,setShowBlocked]=useState(true);
 const list=useRef<HTMLDivElement>(null);
 const scoped=scope==='Anytime'?(pb?.anytime||[]):scope==='All sessions'?[...campaign.sessions.flatMap(s=>s.branches),...(pb?.anytime||[])]:session.branches;
 const ordered=query.trim()?searchPlays(query,scoped):pb?rankPlays(campaign,pb,scoped).map(r=>r.play):scoped;
 const plays=ordered.filter(p=>showBlocked||!pb||isPossible(pb,p));
 const scenes=[...new Set(plays.map(p=>p.scene||''))].sort((a,b)=>{
  const at=(scene:string)=>scene&&session.plan.includes('### '+scene)?session.plan.indexOf('### '+scene):Infinity;
  return at(a)-at(b);
 });
 useEffect(()=>{
  if(!targetId)return;
  const card=[...(list.current?.querySelectorAll<HTMLElement>('[data-play-id]')||[])].find(el=>el.dataset.playId===targetId);
  requestAnimationFrame(()=>{card?.scrollIntoView({block:'center'});card?.querySelector<HTMLButtonElement>('.branch-head')?.focus({preventScroll:true})});
 },[targetId]);
 return <div className="session-paths" ref={list}><div className="path-search"><label><Search size={16}/><input aria-label="Search prepared paths" placeholder="A choice, character, spell, or response…" value={query} onChange={e=>setQuery(e.target.value)} maxLength={200}/></label><select aria-label="Which plays" value={scope} onChange={e=>setScope(e.target.value)}>{['This session',...(pb?['Anytime']:[]),'All sessions'].map(s=><option key={s}>{s}</option>)}</select>{pb&&<label className="check-label"><input type="checkbox" checked={showBlocked} onChange={e=>setShowBlocked(e.target.checked)}/>Include blocked paths</label>}</div><p className="tiny muted" role="status">{plays.length} prepared {plays.length===1?'path':'paths'}</p>{!plays.length&&<div className="empty"><p>{query?'No prepared paths match. Try a name or a shorter phrase.':'Add session notes, then prepare paths.'}</p></div>}{scenes.map(scene=>{
  const items=plays.filter(p=>(p.scene||'')===scene).map(play=>{
   const at=campaign.sessions.find(s=>s.branches.some(p=>p.id===play.id));
   return <div key={play.id} data-play-id={play.id}><PlayCard play={play} pb={pb} label={scope==='This session'?undefined:at?.title||'Anytime'} open={expanded===play.id} recorded={campaign.events.some(e=>e.branchId===play.id)} onToggle={()=>onExpand(expanded===play.id?null:play.id)} onPlayed={p=>onPlayed(p,at?.id)} onQuick={p=>onQuick(p,at?.id)} onAdapt={()=>onAdapt(`Help me respond to this possible choice: ${play.title}.\nPrepared response: ${play.response}\nPlayers actually said or did: \nTreat this as hypothetical until I record an outcome.`)}/></div>;
  });
  return scene?<details className="scene-group" key={scene} open><summary><span>{scene}</span><small>{items.length} paths</small></summary>{items}</details>:<div className="branches" key="ungrouped">{items}</div>;
 })}</div>;
}
