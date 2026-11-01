'use client';
import {useEffect,useState} from 'react';
import {Globe,Send,Pencil,Undo2,FolderOpen,RefreshCw,X} from 'lucide-react';
import type {Campaign,Session} from '../lib/campaign';
import {memoryOf} from '../lib/memory';
import {appFetch,isDesktop} from '../lib/transport';
import {plainPreview} from '../lib/plain-text';
import {count} from '../lib/plural';
import {wikiKinds,type PlayerEntry} from '../lib/playbook-schema';
import {sessionTag} from '../lib/playbook';
import {entryStatus,publishSite,sendEntry,sentEntries,takeDown,type WikiDraft} from '../lib/player-site';

type Notify={update:(fn:(c:Campaign)=>Campaign)=>void;notify:(m:string)=>void;fail:(m:string)=>void};
// Sends an entry and rewrites site.html. Players only ever see what was sent, word for word.
export async function sendToWiki(campaign:Campaign,draft:WikiDraft,sessionId:string,{update,notify,fail}:Notify){const next=sendEntry(campaign,draft,sessionId);update(()=>next);if(!isDesktop()){notify('“'+draft.title+'” is on the wiki list. Open the desktop app to write site.html.');return}try{const r=await publishSite(next,appFetch);notify(r.saved?'“'+draft.title+'” is on the wiki. site.html is updated; upload it when you’re ready.':'“'+draft.title+'” is on the wiki list. site.html wasn’t saved: choose where to keep it in Player handouts.')}catch(e){fail(e instanceof Error?e.message:'site.html could not be written.')}}
const asDraft=(e:PlayerEntry):WikiDraft=>({id:e.id,title:e.title,kind:e.kind,body:e.body});

// The Player site panel: what is public, what is ready to send, and where site.html is kept.
export default function PlayerSite({campaign,session,update,notify,fail,seed,onSeedUsed}:Notify&{campaign:Campaign;session:Session;seed?:WikiDraft|null;onSeedUsed?:()=>void}){
 const pb=memoryOf(campaign).playbook,sent=sentEntries(campaign),index=campaign.sessions.findIndex(s=>s.id===session.id);
 const [draft,setDraft]=useState<WikiDraft|null>(seed||null),[where,setWhere]=useState(''),[busy,setBusy]=useState(false);
 // A page sent from the DM wiki opens here as the draft; the seed is cleared once it has been taken.
 useEffect(()=>{if(seed)onSeedUsed?.()},[seed,onSeedUsed]);
 useEffect(()=>{if(!isDesktop())return;let live=true;void appFetch('/api/site/where',{method:'GET'}).then(r=>r.json() as Promise<{path?:string}>).then(d=>{if(live)setWhere(d.path||'')}).catch(()=>{});return()=>{live=false}},[busy]);
 const prepared=pb?.playerWiki||[],status=(e:PlayerEntry)=>entryStatus(campaign,e,index);
 const due=prepared.filter(e=>status(e)==='due'),later=prepared.filter(e=>status(e)==='later'||status(e)==='waiting');
 const when=(e:PlayerEntry)=>(e.revealAt?'After '+sessionTag(campaign,e.revealAt):'Before Session 1')+(e.when?.length&&status(e)==='waiting'?' · once the world state allows':'');
 async function send(d:WikiDraft){setBusy(true);try{await sendToWiki(campaign,d,session.id,{update,notify,fail});setDraft(null)}finally{setBusy(false)}}
 // Sends every ready entry at once (useful at session zero) and writes site.html once.
 async function sendAll(){setBusy(true);try{const next=due.reduce((c,e)=>sendEntry(c,asDraft(e),session.id),campaign);update(()=>next);if(isDesktop()){const r=await publishSite(next,appFetch);notify(count(due.length,'entry','entries')+' sent to the wiki.'+(r.saved?' site.html is updated.':''))}}catch(e){fail(e instanceof Error?e.message:'site.html could not be written.')}finally{setBusy(false)}}
 async function rewrite(choose:boolean){setBusy(true);try{const r=await publishSite(campaign,appFetch,choose);notify(r.saved?'site.html written to '+r.path+'.':'site.html wasn’t saved.')}catch(e){fail(e instanceof Error?e.message:'site.html could not be written.')}finally{setBusy(false)}}
 async function remove(id:string,title:string){const next=takeDown(campaign,id);update(()=>next);if(isDesktop()){try{await publishSite(next,appFetch);notify('“'+title+'” is off the wiki. site.html is updated.')}catch(e){fail(e instanceof Error?e.message:'site.html could not be written.')}}}
 const row=(e:PlayerEntry,ready:boolean)=><li key={e.id}><div><strong>{e.title}</strong><small>{e.kind} · {when(e)}</small><p>{plainPreview(e.body,160)}</p></div>{ready&&<div className="row-actions"><button className="button small primary" disabled={busy} onClick={()=>void send(asDraft(e))}><Send size={13}/>Send to wiki</button><button className="text-button" onClick={()=>setDraft(asDraft(e))}><Pencil size={13}/>Edit first</button></div>}</li>;
 return <section className="paper player-site" aria-labelledby="player-site-title"><div className="section-title"><div><span className="eyebrow">THE PLAYERS’ WEBSITE</span><h2 id="player-site-title"><Globe size={18}/>Player site</h2><p>One file, <strong>site.html</strong>: your handouts, the map, and the wiki entries you send. Players see nothing until you press <strong>Send to wiki</strong>, and they see exactly the text you sent. Upload the file whenever you like.</p></div>
  {isDesktop()&&<div className="heading-actions"><button className="button" disabled={busy||!pb?.site} onClick={()=>void rewrite(false)}><RefreshCw size={14}/>Write site.html now</button><button className="text-button" disabled={busy||!pb?.site} onClick={()=>void rewrite(true)}><FolderOpen size={13}/>Change where it’s saved</button></div>}</div>
  {!pb?.site&&<p className="muted">Install the campaign update in Foresight first: it carries the site pages and the prepared wiki entries.</p>}
  {where&&<p className="tiny muted">Saved to {where}</p>}
  {draft&&<div className="wiki-draft"><h3>Check it before it goes out</h3><p className="tiny muted">Players will read exactly this. Take out anything they shouldn’t know yet.</p><div className="ledger-form"><label className="wide">Title<input value={draft.title} maxLength={200} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>Kind<select value={draft.kind} onChange={e=>setDraft({...draft,kind:e.target.value as WikiDraft['kind']})}>{wikiKinds.map(k=><option key={k}>{k}</option>)}</select></label></div><label>Text (plain paragraphs, **bold**, *italic*, “- ” lists)<textarea rows={8} maxLength={6000} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></label><div className="modal-actions"><button className="button" onClick={()=>setDraft(null)}><X size={14}/>Cancel</button><button className="button primary" disabled={busy||!draft.title.trim()||!draft.body.trim()} onClick={()=>void send(draft)}><Send size={14}/>Send to wiki</button></div></div>}
  <div className="ready-head"><h3>Ready to send <small className="muted">{count(due.length,'entry','entries')}</small></h3>{due.length>1&&<button className="button small" disabled={busy} onClick={()=>void sendAll()}><Send size={13}/>Send all {due.length}</button>}</div>{due.length?<ul className="wiki-list">{due.map(e=>row(e,true))}</ul>:<p className="tiny muted">Nothing waiting. Entries become ready when you reach the session they belong to.</p>}
  <h3>On the wiki now <small className="muted">{count(sent.length,'entry','entries')}</small></h3>{sent.length?<ul className="wiki-list">{sent.map(e=><li key={e.id}><div><strong>{e.title}</strong><small>{e.kind} · sent in {sessionTag(campaign,e.sessionId)}</small><p>{plainPreview(e.body,160)}</p></div><div className="row-actions"><button className="text-button" onClick={()=>setDraft({id:e.id,title:e.title,kind:e.kind,body:e.body})}><Pencil size={13}/>Edit</button><button className="text-button" disabled={busy} onClick={()=>void remove(e.id,e.title)}><Undo2 size={13}/>Take down</button></div></li>)}</ul>:<p className="tiny muted">Nothing public yet.</p>}
  {later.length>0&&<details className="wiki-later"><summary>Coming later ({later.length})</summary><ul className="wiki-list">{later.map(e=>row(e,false))}</ul></details>}
 </section>;
}
