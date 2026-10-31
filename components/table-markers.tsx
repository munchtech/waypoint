'use client';
import {useEffect,useState} from 'react';
import {X} from 'lucide-react';
import type {Campaign} from '../lib/campaign';
import {addTableMarker,markerKinds,markersForSession,memoryOf,removeTableMarker,type MarkerKind,type TableMarker} from '../lib/memory';

export type WikiSeed={title:string;kind:'NPC'|'Ruling';body:string};
type Props={campaign:Campaign;sessionId:string;update:(fn:(c:Campaign)=>Campaign)=>void;onMakePage?:(seed:WikiSeed)=>void;compact?:boolean};
const clock=(iso:string)=>new Date(iso).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
const recentCount=3;
const wikiKinds:Partial<Record<MarkerKind,WikiSeed['kind']>>={'New NPC':'NPC',Ruling:'Ruling'};
// A wiki draft starts from the first clause of the note; the DM edits it before anything is saved.
const seedFrom=(k:TableMarker,kind:WikiSeed['kind']):WikiSeed=>({title:k.text.split(/[.!?\n]/)[0].trim().slice(0,80)||k.kind,kind,body:k.text});

// Compact mode sits above the play area during Live mode: chips and note only, with the newest few markers.
// Alt+1 to Alt+6 save the matching marker type from anywhere on the desk.
export default function TableMarkers({campaign,sessionId,update,onMakePage,compact=false}:Props){
 const [note,setNote]=useState(''),[announcement,setAnnouncement]=useState({n:0,text:''});
 const markers=markersForSession(memoryOf(campaign),sessionId);
 const shown=compact?markers.slice(0,recentCount):markers;
 const field=<input value={note} maxLength={500} aria-label="Optional marker note" onChange={e=>setNote(e.target.value)} placeholder="Who promised what, or the ruling in a few words…"/>;
 function add(kind:MarkerKind){const text=note.trim();update(c=>({...c,memory:addTableMarker(memoryOf(c),{id:crypto.randomUUID(),sessionId,kind,text,created:new Date().toISOString()})}));setNote('');setAnnouncement(a=>({n:a.n+1,text:`${kind} marker saved${text?': '+text:''}`}))}
 function remove(id:string){const gone=markers.find(k=>k.id===id);update(c=>({...c,memory:removeTableMarker(memoryOf(c),id)}));setAnnouncement(a=>({n:a.n+1,text:`${gone?.kind||'Marker'} marker removed`}))}
 useEffect(()=>{
  if(!compact)return;
  const onKey=(e:KeyboardEvent)=>{if(!e.altKey||e.ctrlKey||e.metaKey)return;const n=Number(e.key);if(Number.isInteger(n)&&n>=1&&n<=markerKinds.length){e.preventDefault();add(markerKinds[n-1])}};
  window.addEventListener('keydown',onKey);
  return()=>window.removeEventListener('keydown',onKey);
 });
 return <section className={'paper table-markers'+(compact?' compact':'')} aria-labelledby="table-markers-title">
  <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement.text}{announcement.n%2?' ':''}</div>
  <div className="section-title"><h3 id="table-markers-title">Mark this moment</h3><small className="muted">{markers.length} this session</small></div>
  {!compact&&<p className="muted tiny">One click saves a timestamped marker. Markers are your notes; none of them becomes canon until you say so.</p>}
  {compact?field:<label>Optional note{field}</label>}
  <div className="chips" role="group" aria-label="Marker type">{markerKinds.map((kind,i)=><button type="button" key={kind} title={compact?'Alt+'+(i+1):undefined} onClick={()=>add(kind)}>{kind}</button>)}</div>
  {shown.length?<ol className="marker-list">{shown.map(k=>{const wikiKind=wikiKinds[k.kind];return <li key={k.id}><span className="pill neutral">{k.kind}</span><div><strong>{clock(k.created)}</strong>{k.text&&<p>{k.text}</p>}{wikiKind&&k.text&&onMakePage&&<button type="button" className="text-button" onClick={()=>onMakePage(seedFrom(k,wikiKind))}>Add to wiki as a draft</button>}</div><button type="button" className="text-button" aria-label={'Remove '+k.kind+' marker from '+clock(k.created)} onClick={()=>remove(k.id)}><X size={14}/></button></li>})}</ol>:<p className="muted tiny">No markers yet this session.</p>}
  {compact&&markers.length>shown.length&&<p className="muted tiny">{markers.length-shown.length} more in At the table.</p>}
 </section>;
}
