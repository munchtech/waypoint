import {ArrowRight,Search,ScrollText,Undo2} from 'lucide-react';
import {styles,type Campaign,type Event} from '../lib/campaign';

export type HistoryFilters={query:string;session:string;enjoyment:string;style:string};
export const emptyHistory:HistoryFilters={query:'',session:'',enjoyment:'',style:''};
type Props={campaign:Campaign;filters:HistoryFilters;onFilters:(filters:HistoryFilters)=>void;onEdit:(event:Event)=>void;onRemove:(event:Event)=>void;onRecord:()=>void;onSession:(id:string)=>void;sessionLocked:boolean};

export default function CampaignHistory({campaign,filters,onFilters,onEdit,onRemove,onRecord,onSession,sessionLocked}:Props){
 const sessions=new Map(campaign.sessions.map(s=>[s.id,s]));
 const query=filters.query.trim().toLocaleLowerCase();
 const events=[...campaign.events].reverse().filter(e=>(!filters.session||e.sessionId===filters.session)&&(!filters.style||e.style===filters.style)&&(!filters.enjoyment||e.enjoyment===filters.enjoyment)&&(!query||[e.text,sessions.get(e.sessionId)?.title].join(' ').toLocaleLowerCase().includes(query)));
 const filtered=Object.values(filters).some(Boolean);
 const field=(key:keyof HistoryFilters,value:string)=>onFilters({...filters,[key]:value});
 return <section className="paper chronicle">
  <div className="history-controls">
   <div className="search-row"><Search size={18}/><input aria-label="Search recorded events" placeholder="Find an outcome or session title…" value={filters.query} onChange={e=>field('query',e.target.value)}/>{filters.query&&<button className="text-button" onClick={()=>field('query','')}>Clear search</button>}</div>
   <div className="history-filters">
    <label>Session<select aria-label="Filter history by session" value={filters.session} onChange={e=>field('session',e.target.value)}><option value="">All sessions</option>{campaign.sessions.map((s,i)=><option key={s.id} value={s.id}>{i+1}. {s.title}</option>)}</select></label>
    <label>Approach<select aria-label="Filter history by approach" value={filters.style} onChange={e=>field('style',e.target.value)}><option value="">All approaches</option>{styles.map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Enjoyment<select aria-label="Filter history by enjoyment" value={filters.enjoyment} onChange={e=>field('enjoyment',e.target.value)}><option value="">All feedback</option>{['Neutral','Loved it','Less of this'].map(s=><option key={s}>{s}</option>)}</select></label>
   </div>
   <div className="history-results"><p role="status">{events.length} of {count(campaign.events.length,'confirmed event')} · newest recorded first</p>{filtered&&<button className="text-button" onClick={()=>onFilters({...emptyHistory})}>Reset filters</button>}</div>
  </div>
  {!campaign.events.length?<div className="empty"><ScrollText size={34}/><h3>No confirmed events yet.</h3><p>Record what actually happened during play. Prepared paths stay possibilities.</p><button className="button primary" onClick={onRecord}>Record your first event</button></div>:!events.length?<div className="empty history-empty"><Search size={28}/><h3>No matching outcomes.</h3><p>Try another session or clear the filters to see the whole history.</p><button className="button" onClick={()=>onFilters({...emptyHistory})}>Reset filters</button></div>:events.map(e=><article className="timeline-item" key={e.id}><span className="timeline-dot"/><div className="section-title"><span className="eyebrow">{sessions.get(e.sessionId)?.title||'Campaign event'}</span><small>{new Date(e.date).toLocaleDateString()}</small></div><p className="prose">{e.text}</p><div className="event-footer"><span className="pill neutral">{e.style}</span><span className="tiny">{e.enjoyment}</span><button className="text-button" onClick={()=>onEdit(e)}>Edit</button><button className="text-button" onClick={()=>onRemove(e)}><Undo2 size={13}/> Remove</button>{sessions.has(e.sessionId)&&<button className="text-button history-open-session" disabled={sessionLocked} title={sessionLocked?'Stop recording or wait for generation before changing sessions':undefined} onClick={()=>onSession(e.sessionId)}>Open session <ArrowRight size={14}/></button>}</div></article>)}
 </section>;
}
import {count} from '../lib/plural';
