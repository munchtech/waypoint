'use client';
import {useEffect,useRef,useState} from 'react';
import {Search,ArrowUpRight,X} from 'lucide-react';
export type QuickAction={label:string;detail:string;run:()=>void};
export default function QuickNavigation({actions,onClose}:{actions:QuickAction[];onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[query,setQuery]=useState(''),[index,setIndex]=useState(0);
 const matches=actions.filter(a=>(a.label+' '+a.detail).toLowerCase().includes(query.toLowerCase()));
 useEffect(()=>{const d=dialog.current,opener=document.activeElement as HTMLElement|null;d?.showModal();return()=>{d?.close();opener?.focus?.()}},[]);
 useEffect(()=>{dialog.current?.querySelector('.command-results .selected')?.scrollIntoView({block:'nearest'})},[index,query]);
 function choose(action:QuickAction){onClose();action.run()}
 return <dialog aria-label="Quick navigation" ref={dialog} className="command-dialog" onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose()}}><div className="command-surface"><div className="command-input"><Search size={22}/><input autoFocus aria-label="Find a destination or action" placeholder="Where shall we go?" value={query} onChange={e=>{setQuery(e.target.value);setIndex(0)}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setIndex(i=>Math.max(0,Math.min(i+1,matches.length-1)))}if(e.key==='ArrowUp'){e.preventDefault();setIndex(i=>Math.max(0,i-1))}if(e.key==='Enter'&&matches[index]){e.preventDefault();choose(matches[index])}}}/><button aria-label="Close quick navigation" onClick={onClose}><X size={18}/></button></div><div className="command-results">{matches.map((action,i)=><button key={action.label} className={index===i?'selected':''} onMouseEnter={()=>setIndex(i)} onClick={()=>choose(action)}><span><strong>{action.label}</strong><small>{action.detail}</small></span><ArrowUpRight size={17}/></button>)}{!matches.length&&<p>No destinations match. Try “wiki”, “notes”, or “dice”.</p>}</div><footer><span>↑ ↓ to browse · Enter to open</span><span>Esc to close</span></footer></div></dialog>;
}
