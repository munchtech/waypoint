'use client';
import {useState} from 'react';
import {Compass,ArrowUpRight} from 'lucide-react';
import {partySignals,responseSituations} from '../lib/party-signals';
import type {Campaign} from '../lib/campaign';
export default function TableCoach({campaign,onPrompt}:{campaign:Campaign;onPrompt:(prompt:string)=>void}){
 const [selected,setSelected]=useState(0);const situation=responseSituations[selected],signals=partySignals(campaign);
 return <section className="table-coach"><div className="section-title"><div><span className="eyebrow">WHEN THE PLAN MEETS THE PARTY</span><h3><Compass size={18}/> Your next move</h3></div><span className="coach-offline">Always available</span></div><div className="coach-situations" aria-label="Player situation">{responseSituations.map((s,i)=><button key={s.label} aria-pressed={selected===i} className={selected===i?'selected':''} onClick={()=>setSelected(i)}>{s.label}</button>)}</div><p className="coach-tip">{situation.tip}</p><button className="text-button" onClick={()=>onPrompt(`${situation.prompt}\nWhat they actually said or attempted: \nGive me a concise, playable DM response for this session. Ask for the missing detail instead of assuming the outcome.`)}>Tailor this to our scene · uses AI<ArrowUpRight size={14}/></button><details className="prediction-evidence"><summary>What we know about this party <span>{signals.sampleSize} recent outcomes</span></summary><p>{signals.caveat}</p><div className="signal-grid">{signals.styles.map(s=><div key={s.style}><strong>{s.style}</strong><span>{count(s.observed,'choice')} · {s.loved} loved · {s.lessOfThis} less wanted</span><small>Stated preference {s.statedPreference}/5</small></div>)}</div><p>Preparation priorities are suggestions, not measured odds. Record what happened and how the table felt to improve future advice.</p></details></section>;
}
import {count} from '../lib/plural';
