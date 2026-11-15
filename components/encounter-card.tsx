'use client';
import {useState} from 'react';
import {ChevronDown,Swords} from 'lucide-react';
import CreatureStats from './creature-stats';
import type {EncounterCreature} from '../lib/combat';
import {difficulty,encounterXP,isPossible,scaleOptions,type Encounter,type Playbook} from '../lib/playbook';

function Combatant({creature,pb,defaultOpen,onBrowse}:{creature:EncounterCreature;pb:Playbook;defaultOpen:boolean;onBrowse?:(name:string)=>void}){
 const [open,setOpen]=useState(defaultOpen);
 return <li className="combatant"><button className="combatant-toggle" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><span><strong>{creature.count} × {creature.name}</strong><small>CR {creature.cr} · {creature.statblock?'Campaign profile':'Base creature'} · {creature.base}</small></span><span className="combatant-label">Stat block & abilities<ChevronDown size={15}/></span></button>{open&&<CreatureStats creature={creature} pb={pb} onBrowse={onBrowse}/>}</li>;
}
export default function EncounterCard({enc,pb,levels,defaultOpen=false,onBrowse}:{enc:Encounter;pb:Playbook;levels:number[];defaultOpen?:boolean;onBrowse?:(name:string)=>void}){
 const xp=encounterXP(enc),budget=difficulty(xp,levels),possible=isPossible(pb,enc),scaling=scaleOptions(enc,levels);
 return <article className={'encounter-card '+(possible?'':'blocked')}><div className="section-title"><div><span className="eyebrow">ENCOUNTER{possible?'':' · NOT POSSIBLE NOW'}</span><h3><Swords size={16}/>{enc.title}</h3></div><span className={'difficulty band-'+budget.band.toLowerCase().replace(/\s/g,'-')}>{budget.band==='Unknown'?xp+' XP':budget.band+' · '+xp+' XP'}</span></div><dl className="encounter-notes"><dt>Tactics</dt><dd>{enc.tactics}</dd><dt>Way out</dt><dd>{enc.exit}</dd><dt>Scaling</dt><dd>{enc.scale}</dd></dl><ul className="creature-list">{enc.creatures.map((creature,i)=><Combatant key={i+creature.name} creature={creature} pb={pb} defaultOpen={defaultOpen} onBrowse={onBrowse}/>)}</ul>{levels.length>0&&<p className="tiny muted">2024 party XP budget · Low {budget.low} · Moderate {budget.moderate} · High {budget.high}</p>}{scaling.length>0&&<p className="scale-options"><strong>Retune the encounter</strong> {scaling.map(option=>option.band+': '+(option.delta>0?'+':'−')+Math.abs(option.delta)+' '+option.name).join(' · ')}</p>}</article>;
}
