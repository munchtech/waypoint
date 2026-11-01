'use client';
import {useEffect,useState} from 'react';
import {Pause,Play,PenLine,Printer,RotateCcw,Timer} from 'lucide-react';
import BookText from './book-text';

// The bar pinned above a session plan while you run it: record what no play covers, a session clock that reads the plan's own
// timeline ("| 0:20 to 0:50 | Scene 1 … |") to say where a session usually is by now, and a print button for the plan's table card.
import {clockText,pace,tableCard,timeline} from '../lib/session-notes';
type Clock={start:number|null;banked:number};
const read=(key:string):Clock=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');if(v&&typeof v.banked==='number')return v}catch{}return {start:null,banked:0}};
export default function NotesBar({sessionId,plan,onRecord}:{sessionId:string;plan:string;onRecord:()=>void}){
 const key='waypoint-clock:'+sessionId,[clock,setClock]=useState<Clock>(()=>read(key)),[now,setNow]=useState(()=>Date.now()),[printing,setPrinting]=useState(false);
 const rows=timeline(plan),card=tableCard(plan),running=clock.start!==null,min=(clock.banked+(running?now-clock.start!:0))/60000,where=running||clock.banked?pace(rows,min):null;
 useEffect(()=>{if(!running)return;const t=setInterval(()=>setNow(Date.now()),15000);return ()=>clearInterval(t)},[running]);
 const save=(c:Clock)=>{setClock(c);setNow(Date.now());try{localStorage.setItem(key,JSON.stringify(c))}catch{}};
 function print(){setPrinting(true);requestAnimationFrame(()=>{document.body.classList.add('print-card');const done=()=>{document.body.classList.remove('print-card');setPrinting(false);window.removeEventListener('afterprint',done)};window.addEventListener('afterprint',done);window.print()})}
 return <div className="notes-bar no-print" role="toolbar" aria-label="Running this session">
  <button className="button small" onClick={onRecord} title="Write one line about something no play covers. It goes in the chronicle, and next week it can become a play."><PenLine size={14}/>Something else happened</button>
  {card&&<button className="button small" onClick={print}><Printer size={14}/>Print table card</button>}
  {rows.length>0&&<div className={'session-clock'+(where?.over?' over':'')}><Timer size={14} aria-hidden="true"/><strong aria-label="Session time">{clockText(min)}</strong>
   {running?<button className="text-button" onClick={()=>save({start:null,banked:clock.banked+Date.now()-clock.start!})}><Pause size={13}/>Pause</button>:<button className="text-button" onClick={()=>save({start:Date.now(),banked:clock.banked})}><Play size={13}/>{clock.banked?'Resume':'Start the clock'}</button>}
   {(running||clock.banked>0)&&<button className="text-button" aria-label="Reset the clock" onClick={()=>save({start:null,banked:0})}><RotateCcw size={13}/></button>}
   {where&&<span className="pace" role="status"><small>Usually by now</small> {where.now}{where.next&&<><small> · Next</small> {where.next}</>}</span>}</div>}
  {printing&&<div className="table-card-print"><BookText text={card}/></div>}
 </div>;
}
