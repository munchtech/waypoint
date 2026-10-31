'use client';
import {useState} from 'react';
import {ArrowRight,Check,GitBranch,Lock,Unlock,Compass} from 'lucide-react';
import type {Campaign,Session} from '../lib/campaign';
import {blockers,flagLabel,resolveEffects,ripple,sessionNumber,valueLabel,type FlagValue,type Play,type Playbook} from '../lib/playbook';

// Shown when the DM marks a prepared play as what happened: confirm its world changes and see what they open or close later.
export default function RippleDialog({campaign,session,pb,play,onApply,onCancel}:{campaign:Campaign;session:Session;pb:Playbook;play:Play;onApply:(changes:{flag:string;from:FlagValue;to:FlagValue}[],record:boolean)=>void;onCancel:()=>void}){
 const changes=resolveEffects(pb,play.effects),[keep,setKeep]=useState<string[]>(changes.map(c=>c.flag));
 const chosen=changes.filter(c=>keep.includes(c.flag)),index=campaign.sessions.findIndex(s=>s.id===session.id),r=ripple(campaign,pb,chosen,index+1),blocked=blockers(pb,play.when);
 const where=(i:number)=>i<0?'Anytime':'Session '+sessionNumber(campaign.sessions[i].title,i)+' · '+campaign.sessions[i].title.replace(/^Sessions? [\dA-Z–\- to]+:\s*/,'');
 return <><span className="eyebrow">THE PARTY DID THIS</span><h2 id="modal-title">{play.title}</h2>
  {blocked.length>0&&<p className="play-blocked"><Lock size={14}/>Your recorded world state says this wasn’t possible ({blocked.join('; ')}). If it happened anyway, the changes below still apply.</p>}
  <div className="ripple-now"><h4>What changes now</h4><p>{play.consequence}</p></div>
  {changes.length>0?<fieldset className="ripple-changes"><legend>World changes to record</legend>{changes.map(c=><label className="check-label" key={c.flag}><input type="checkbox" checked={keep.includes(c.flag)} onChange={e=>setKeep(k=>e.target.checked?[...k,c.flag]:k.filter(x=>x!==c.flag))}/><span>{flagLabel(pb,c.flag)}: {valueLabel(pb,c.flag,c.from)} <ArrowRight size={11} aria-hidden="true"/> <strong>{valueLabel(pb,c.flag,c.to)}</strong></span></label>)}</fieldset>:<p className="tiny muted">This play changes no tracked facts. Record what happened in the chronicle.</p>}
  {play.later&&<div className="ripple-later"><h4><GitBranch size={14}/> Down the line</h4><p>{play.later}</p></div>}
  {(r.opened.length>0||r.closed.length>0||r.endings.length>0)&&<div className="ripple-ahead"><h4><Compass size={14}/> What this opens and closes</h4><ul>{r.closed.slice(0,8).map(d=><li key={'c'+d.play.id}><Lock size={12}/><span><strong>Closes</strong> {d.play.title} <small>{where(d.index)}</small></span></li>)}{r.opened.slice(0,8).map(d=><li key={'o'+d.play.id}><Unlock size={12}/><span><strong>Opens</strong> {d.play.title} <small>{where(d.index)}</small></span></li>)}{r.endings.filter(e=>e.before!==e.after).map(e=><li key={e.ending.id}><Compass size={12}/><span><strong>{e.ending.title}</strong> {e.before} → {e.after} of {e.total} requirements in place</span></li>)}</ul>{r.opened.length+r.closed.length>16&&<p className="tiny muted">More changes are listed in Foresight.</p>}</div>}
  <div className="modal-actions"><button className="button" onClick={onCancel}>Cancel</button><button className="button" onClick={()=>onApply(chosen,false)}>Apply without a chronicle entry</button><button className="button primary" onClick={()=>onApply(chosen,true)}><Check size={14}/>Apply and record the outcome</button></div>
  <p className="tiny muted">World changes are kept in Foresight’s history and can be undone there.</p></>;
}
