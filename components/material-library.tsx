'use client';
import {useState} from 'react';
import {Search,Sparkles,ArrowRight,ArrowUpRight,X,UserRound,Swords,MapPin,KeyRound,Gift,GitBranch,MessageCircle} from 'lucide-react';
import type {Card} from '../lib/campaign';
import {count} from '../lib/plural';
import {plainPreview} from '../lib/plain-text';
const materialIcons:Record<string,typeof Sparkles>={NPC:UserRound,Encounter:Swords,Location:MapPin,Clue:KeyRound,Loot:Gift,Twist:GitBranch,'DM response':MessageCircle};
export default function MaterialLibrary({cards,onOpen,onDesk}:{cards:Card[];onOpen:(card:Card)=>void;onDesk:()=>void}){
 const [query,setQuery]=useState(''),[kind,setKind]=useState('All');
 const kinds=['All',...new Set(cards.map(c=>c.kind))];
 const found=cards.filter(c=>(kind==='All'||c.kind===kind)&&(c.title+' '+c.body+' '+c.kind).toLowerCase().includes(query.trim().toLowerCase()));
 const reset=()=>{setQuery('');setKind('All')};
 return <section className="material-library"><div className="library-toolbar"><div className="library-search"><Search size={17}/><input aria-label="Search saved material" placeholder="Find a character, clue, response…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label="Clear material search" onClick={()=>setQuery('')}><X size={15}/></button>}</div><span role="status">{found.length} of {count(cards.length,'idea')}</span></div>{cards.length>0&&<div className="library-filters" aria-label="Material type">{kinds.map(k=><button aria-pressed={kind===k} className={kind===k?'selected':''} key={k} onClick={()=>setKind(k)}>{k}<span>{k==='All'?cards.length:cards.filter(c=>c.kind===k).length}</span></button>)}</div>}<div className="material-grid">{found.map(c=>{const Icon=materialIcons[c.kind]||Sparkles;return <button className="material-card" key={c.id} onClick={()=>onOpen(c)}><div className="material-card-heading"><span className="material-glyph" aria-hidden="true"><Icon size={21}/></span><span className="eyebrow">{c.kind}</span><span className="material-draft">Draft</span></div><h3>{c.title}</h3><p>{plainPreview(c.body,160)}</p><span className="text-button">Open material<ArrowUpRight size={15}/></span></button>})}</div>{!found.length&&<div className="paper empty library-empty"><Sparkles size={30}/><h3>{cards.length?'No ideas match those filters.':'Keep a little magic in reserve.'}</h3><p>{cards.length?'Try another word or show every type of material. Your saved ideas are still here.':'Generate an idea from the session desk. It will be saved here and available with AI off.'}</p><button className="button" onClick={cards.length?reset:onDesk}>{cards.length?'Clear filters':'Go to session desk'}<ArrowRight size={15}/></button></div>}</section>;
}
