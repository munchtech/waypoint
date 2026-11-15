'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Pin,X} from 'lucide-react';
import type {Campaign} from '../lib/campaign';
import {memoryOf} from '../lib/memory';
import {searchCampaign,type SearchHit} from '../lib/campaign-search';
import BookText from './book-text';
import CreatureStats from './creature-stats';
import {pageCreatures} from '../lib/combat';
import {CampaignLinks} from './campaign-links';

type Props={campaign:Campaign;pageId:string;onClose:()=>void;onOpen:(hit:SearchHit)=>void;onPin:(id:string)=>void};
export default function ReferencePanel({campaign,pageId,onClose,onOpen,onPin}:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 const [trail,setTrail]=useState<string[]>([pageId]);
 const memory=memoryOf(campaign),page=memory.pages.find(page=>page.id===trail[trail.length-1]);
 useEffect(()=>{const d=dialog.current,opener=document.activeElement as HTMLElement|null;d?.showModal();return()=>{d?.close();opener?.focus?.()}},[]);
 const creatures=page?pageCreatures(page,memory.playbook):[];
 const related=page?memory.pages.filter(p=>page.related?.includes(p.id)||p.related?.includes(page.id)):[];
 function open(kind:SearchHit['kind'],id:string){const hit=searchCampaign(campaign,'',kind).find(hit=>hit.id===id);if(hit){onClose();onOpen(hit)}}
 return <CampaignLinks.Provider value={{pages:memory.pages,onOpen:id=>setTrail(ids=>[...ids,id])}}><dialog className="reference-dialog" aria-label="Campaign reference" ref={dialog} onCancel={onClose} onClick={e=>{if(e.target===dialog.current)onClose()}}><div className="reference-surface"><header><button className="text-button" disabled={trail.length<2} onClick={()=>setTrail(ids=>ids.slice(0,-1))}><ArrowLeft size={15}/>Back</button><button className="icon-button" aria-label="Close reference" onClick={onClose}><X size={20}/></button></header>{page?<><div className="reference-heading"><span className="eyebrow">{page.kind} · {page.status} · {page.visibility}</span><h2>{page.title}</h2><div className="flow-actions"><button className="button" aria-pressed={memory.pins?.includes(page.id)||false} onClick={()=>onPin(page.id)}><Pin size={14}/>{memory.pins?.includes(page.id)?'Kept handy':'Keep handy'}</button><button className="button" onClick={()=>open('Wiki',page.id)}>Open wiki editor<ArrowUpRight size={14}/></button></div></div><article className="reference-body" key={page.id}><BookText text={page.body} excludePageId={page.id}/></article>{creatures.length>0&&<section className="reference-combat"><h3>Combat profile</h3>{creatures.map(creature=><details key={creature.statblock||creature.base} open><summary>{creature.name} · CR {creature.cr}</summary><CreatureStats creature={creature} pb={memory.playbook} onBrowse={name=>{onClose();onOpen({id:'',kind:'Rule',title:name,body:'',status:'Creature lookup',date:'',score:0})}}/></details>)}</section>}{related.length>0&&<section className="reference-related"><h3>Related pages</h3>{related.map(p=><button key={p.id} className="text-button" onClick={()=>setTrail(ids=>[...ids,p.id])}>{p.title}<ArrowUpRight size={13}/></button>)}</section>}{page.sourceId&&memory.notes.some(n=>n.id===page.sourceId)&&<footer><button className="text-button" onClick={()=>open('Journal',page.sourceId)}>Open original source note <ArrowUpRight size={14}/></button></footer>}</>:<div className="empty"><p>This page is no longer available.</p></div>}</div></dialog></CampaignLinks.Provider>;
}
