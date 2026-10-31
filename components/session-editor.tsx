'use client';
import {useEffect,useRef,useState} from 'react';
import {styles,type Session,type Style,type Event} from '../lib/campaign';
import BookText from './book-text';

export type SessionEdit={title:string;plan:string};
export type OutcomeEdit={text:string;sessionId:string;style:Style;enjoyment:Event['enjoyment'];branchId?:string};
type Value=SessionEdit|OutcomeEdit;
type Stored={base:string;value:Value};
function valid(value:unknown,plan:boolean):value is Value{
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 return plan?typeof v.title==='string'&&typeof v.plan==='string':typeof v.text==='string'&&typeof v.sessionId==='string'&&styles.includes(v.style as Style)&&['Neutral','Loved it','Less of this'].includes(String(v.enjoyment))&&(v.branchId===undefined||typeof v.branchId==='string');
}

// Mounted per editing target. Drafts never enter the campaign or generation context.
export default function SessionEditor({draftKey,initial,base,plan,sessions,onSave,onClose}:{draftKey:string;initial:Value;base:string;plan:boolean;sessions:Session[];onSave:(value:Value)=>void;onClose:()=>void}){
 const key='waypoint-session-edit-v1:'+draftKey;
 const [loaded]=useState(()=>{try{const raw=localStorage.getItem(key);if(!raw)return null;const d=JSON.parse(raw);return typeof d.base==='string'&&valid(d.value,plan)?d as Stored:null}catch{return null}});
 const [value,setValue]=useState<Value>(loaded?.value||initial),[origin,setOrigin]=useState(loaded?.base??base);
 const [failure,setFailure]=useState(''),[discard,setDiscard]=useState(false),[preview,setPreview]=useState(false),[changed,setChanged]=useState(!!loaded);
 const input=useRef<HTMLInputElement>(null);
 const conflict=origin!==base;
 function change(next:Value){setValue(next);setChanged(true);setDiscard(false);try{localStorage.setItem(key,JSON.stringify({base:origin,value:next}));setFailure('')}catch{setFailure('Draft could not be saved on this computer. Copy your text before closing.')}}
 useEffect(()=>{if(!failure)return;const guard=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard)},[failure]);
 function clear(){try{localStorage.removeItem(key);return true}catch{setFailure('Could not clear the local draft. Copy your text and try again.');return false}}
 const targetExists=plan||sessions.some(s=>s.id===(value as OutcomeEdit).sessionId);
 function save(){if(conflict||!targetExists||(!plan&&!(value as OutcomeEdit).text.trim()))return;if(!clear())return;onSave(value)}
 return <section className="session-editor" data-unsaved-draft={!!failure} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save()}}}>
  <span className="eyebrow">{plan?'PREPARE YOUR NEXT CHAPTER':'ADD TO YOUR CAMPAIGN’S MEMORY'}</span>
  <h2 id="modal-title">{plan?'Your session plan':'What actually happened?'}</h2>
  <p>{plan?'Write or import your outline. Preview it as formatted session notes.':'Record only what actually happened. Leave enjoyment Neutral if you are unsure.'}</p>
  <div className="editor-draft-status" role="status"><strong>{failure?'Draft needs attention':loaded&&changed?'Recovered local draft':changed?'Draft saved on this computer':'Ready to edit'}</strong><span>Closing keeps unfinished edits. {plan?'Plans stay prepared material.':'Nothing enters history until you save.'} Drafts are excluded from exports.</span></div>
  {failure&&<div role="alert" className="error-text"><p>{failure}</p><button className="button" onClick={()=>change(value)}>Retry draft save</button></div>}
  {conflict&&<div className="editor-conflict" role="alert"><strong>The saved version changed since this draft began.</strong><p>Compare it below before choosing which text to keep.</p><details><summary>Review current saved version</summary><pre>{plan?`${(initial as SessionEdit).title}\n\n${(initial as SessionEdit).plan}`:`${sessions.find(s=>s.id===(initial as OutcomeEdit).sessionId)?.title||'Unavailable session'}\n${(initial as OutcomeEdit).style} · ${(initial as OutcomeEdit).enjoyment}\n\n${(initial as OutcomeEdit).text}`}</pre></details><button className="button" onClick={()=>{try{localStorage.setItem(key,JSON.stringify({base,value}));setOrigin(base);setFailure('')}catch{setFailure('Could not save the draft. Copy your text before closing.')}}}>Use my draft over this version</button></div>}
  {plan?<><label>Session title<input value={(value as SessionEdit).title} maxLength={140} onChange={e=>change({...value,title:e.target.value})}/></label><div className="editor-mode"><button className="button" aria-pressed={!preview} onClick={()=>setPreview(false)}>Write</button><button className="button" aria-pressed={preview} onClick={()=>setPreview(true)}>Preview formatting</button></div>{preview?<div className="editor-preview"><BookText text={(value as SessionEdit).plan}/></div>:<label>Planned session<textarea rows={12} maxLength={30000} value={(value as SessionEdit).plan} onChange={e=>change({...value,plan:e.target.value})}/></label>}<input ref={input} hidden type="file" accept=".txt,.md,text/plain,text/markdown" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>120000)throw Error('Use a text file smaller than 120 KB.');const text=await file.text();if(text.length>30000)throw Error('These notes exceed 30,000 characters. Split them by session; nothing was truncated.');change({...value,plan:text});setPreview(false)}catch(err){setFailure(err instanceof Error?err.message:'Could not read notes.')}}}/></>:<><label>Session<select value={(value as OutcomeEdit).sessionId} onChange={e=>change({...value,sessionId:e.target.value,branchId:undefined})}>{sessions.map((s,i)=><option key={s.id} value={s.id}>Session {i+1} · {s.title}</option>)}</select></label><label>Confirmed event<textarea rows={6} maxLength={10000} value={(value as OutcomeEdit).text} onChange={e=>change({...value,text:e.target.value})}/></label><div className="two-cols"><label>Main approach<select value={(value as OutcomeEdit).style} onChange={e=>change({...value,style:e.target.value as Style})}>{styles.map(s=><option key={s}>{s}</option>)}</select></label><label>How did the table feel?<select value={(value as OutcomeEdit).enjoyment} onChange={e=>change({...value,enjoyment:e.target.value as Event['enjoyment']})}>{['Neutral','Loved it','Less of this'].map(s=><option key={s}>{s}</option>)}</select></label></div>{!targetExists&&<p role="alert">Choose an available session before saving.</p>}</>}
  <div className="editor-actions"><button className="button" disabled={!!failure} onClick={onClose}>Close & keep draft</button>{plan&&<button className="button" onClick={()=>input.current?.click()}>Import notes</button>}<button className="button primary" disabled={conflict||!targetExists||(!plan&&!(value as OutcomeEdit).text.trim())} onClick={save}>{plan?'Save session plan':'Save to chronicle'}</button></div>
  <div className="editor-discard">{discard?<><span>Discard these unfinished edits?</span><button className="text-button" onClick={()=>{if(clear())onClose()}}>Discard draft</button><button className="text-button" onClick={()=>setDiscard(false)}>Keep editing</button></>:<button className="text-button" onClick={()=>setDiscard(true)}>Discard unfinished edits…</button>}<small>Ctrl+S saves · Escape keeps draft</small></div>
 </section>;
}
