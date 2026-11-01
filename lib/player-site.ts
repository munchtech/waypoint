import type {Campaign} from './campaign';
import {memoryOf,type Memory} from './memory';
import {holds,stateOf} from './playbook';
import {wikiKinds,type PlayerEntry} from './playbook-schema';

// The player site is one self-contained site.html the DM uploads: the fixed pages the pack ships (handouts, map) and the wiki entries
// the DM has sent. Nothing reaches it unless the DM pressed "Send to wiki"; the text sent is exactly the text shown.
export type SentEntry=NonNullable<Memory['site']>['entries'][number];
export type WikiDraft=Pick<SentEntry,'id'|'title'|'kind'|'body'>;

const esc=(t:string)=>t.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const inline=(t:string)=>esc(t).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
// Plain paragraphs, **bold**, *italic* and "- " lists: all a wiki entry needs, and everything is escaped first.
export function markdown(md:string){return md.trim().split(/\n\s*\n/).map(block=>{const lines=block.split('\n').map(l=>l.trim()).filter(Boolean);return lines.every(l=>/^[-*] /.test(l))?'<ul>'+lines.map(l=>'<li>'+inline(l.slice(2))+'</li>').join('')+'</ul>':'<p>'+lines.map(inline).join('<br>')+'</p>'}).join('\n')}

export const sentEntries=(c:Campaign)=>memoryOf(c).site?.entries||[];
export function sendEntry(c:Campaign,draft:WikiDraft,sessionId:string):Campaign{const m=memoryOf(c),entry:SentEntry={...draft,title:draft.title.trim().slice(0,200),body:draft.body.trim().slice(0,6000),sentAt:new Date().toISOString(),sessionId};return {...c,memory:{...m,site:{entries:[entry,...sentEntries(c).filter(e=>e.id!==draft.id)].slice(0,600)}}}}
export function takeDown(c:Campaign,id:string):Campaign{const m=memoryOf(c);return {...c,memory:{...m,site:{entries:sentEntries(c).filter(e=>e.id!==id)}}}}

// Where a prepared entry stands: already public, due, or not yet. An entry belongs AFTER its session, so it is due only once that
// session is marked done or the DM has moved on to a later one; entries with no session are session-zero knowledge.
export type EntryStatus='sent'|'due'|'later'|'waiting';
const holdsNow=(c:Campaign,e:PlayerEntry)=>{const pb=memoryOf(c).playbook;return !pb||!e.when?.length||e.when.every(w=>holds(w,stateOf(pb)))};
export function entryStatus(c:Campaign,e:PlayerEntry,currentIndex:number):EntryStatus{if(sentEntries(c).some(x=>x.id===e.id))return 'sent';const at=e.revealAt?c.sessions.findIndex(s=>s.id===e.revealAt):-1;if(at>currentIndex||(at>=0&&at===currentIndex&&!c.sessions[at].done))return 'later';return holdsNow(c,e)?'due':'waiting'}
// What the prep brief offers to send after this session: entries suggested for it, plus earlier ones still unsent.
export function dueAfter(c:Campaign,sessionId:string){const pb=memoryOf(c).playbook,i=c.sessions.findIndex(s=>s.id===sessionId),sent=new Set(sentEntries(c).map(e=>e.id));return (pb?.playerWiki||[]).filter(e=>{if(sent.has(e.id)||!holdsNow(c,e))return false;const at=e.revealAt?c.sessions.findIndex(s=>s.id===e.revealAt):-1;return e.revealAt===sessionId||(at>=0&&at<i)})}

const siteCss=`.site-nav{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line);margin:0 calc(-1*max(16px,env(safe-area-inset-left,0px))) 1.5rem;padding:.6rem max(16px,env(safe-area-inset-left,0px))}
.site-nav ul{list-style:none;margin:0 auto;padding:0;max-width:46rem;display:flex;flex-wrap:wrap;gap:.2rem 1.1rem}.site-nav li{margin:0}.site-nav a{text-decoration:none;font-weight:600}
main>section{display:none}main>section:target,main>section:has(:target){display:block}body:not(:has(main :target)) #home{display:block}
.cards{display:grid;gap:.8rem;margin:0 0 1rem;padding:0;list-style:none}.cards li{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:.9rem 1.1rem;margin:0}.cards a{font-family:var(--serif);font-size:1.15rem;font-weight:700}
.wiki-index{columns:2 14rem}.wiki-entry{border-top:1px solid var(--line);padding-top:.8rem;margin-top:1.2rem}.wiki-entry h3{margin:0 0 .2rem}.wiki-kind{color:var(--muted);font-size:.9rem;margin:0 0 .5rem}.updated{color:var(--muted);font-size:.95rem}`;

// The whole site as one HTML file. Page bodies come from the installed pack; wiki entries are escaped Markdown.
export function siteHtml(c:Campaign,now=new Date()){const pb=memoryOf(c).playbook,site=pb?.site;if(!site)return '';const entries=[...sentEntries(c)].sort((a,b)=>a.title.localeCompare(b.title));
 const img=(html:string)=>(site.images||[]).reduce((h,i)=>h.split('IMG:'+i.name).join(i.dataUrl),html);
 const nav=[['home','Home'],...site.pages.map(p=>[p.id,p.title]),['wiki','Wiki']].map(([id,t])=>`<li><a href="#${id}">${esc(t)}</a></li>`).join('');
 const recent=[...sentEntries(c)].slice(0,6);
 const home=`<section id="home"><h1>${esc(site.title)}</h1><p class="subtitle">The players' site for our campaign. Everything here is safe to read: no spoilers.</p><ul class="cards">${site.pages.map(p=>`<li><a href="#${p.id}">${esc(p.title)}</a><p>${esc(p.summary)}</p></li>`).join('')}<li><a href="#wiki">The wiki</a><p>${entries.length?`${entries.length} entries so far. More unlock as you discover them.`:'Unlocks as you discover.'}</p></li></ul>${recent.length?`<h2>New in the wiki</h2><ul>${recent.map(e=>`<li><a href="#${esc(e.id)}">${esc(e.title)}</a></li>`).join('')}</ul>`:''}<p class="updated">Updated ${esc(now.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}))}.</p></section>`;
 const byKind=wikiKinds.map(k=>({k,list:entries.filter(e=>e.kind===k)})).filter(g=>g.list.length);
 const wiki=`<section id="wiki"><h1>The wiki</h1><p class="subtitle">What your characters have learned so far. Entries unlock as you discover them.</p>${entries.length?byKind.map(g=>`<h2>${g.k==='Person'?'People':g.k==='Lore'?'Lore':g.k+'s'}</h2><ul class="wiki-index">${g.list.map(e=>`<li><a href="#${esc(e.id)}">${esc(e.title)}</a></li>`).join('')}</ul>`).join('')+entries.map(e=>`<article class="wiki-entry" id="${esc(e.id)}"><h3>${esc(e.title)}</h3><p class="wiki-kind">${esc(e.kind)}</p>${markdown(e.body)}</article>`).join(''):'<div class="box"><p><strong>Unlocks as you discover.</strong> People, places and secrets appear here as your characters find them.</p></div>'}</section>`;
 return `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<title>${esc(site.title)}</title>\n<style>\n${site.css}\n${siteCss}\n</style>\n</head>\n<body>\n<nav class="site-nav" aria-label="Site"><ul>${nav}</ul></nav>\n<main>\n${home}\n${site.pages.map(p=>`<section id="${p.id}">${img(p.body)}</section>`).join('\n')}\n${wiki}\n<footer>${esc(site.title)} · player site · no spoilers</footer>\n</main>\n</body>\n</html>\n`}

// Writes site.html where the DM chose (asked once); the desktop app keeps the path.
export async function publishSite(c:Campaign,fetcher:(path:string,init:RequestInit)=>Promise<Response>,choose=false){const html=siteHtml(c);if(!html)throw new Error('Install the campaign update first: it carries the site pages.');const r=await fetcher('/api/site/write',{method:'POST',body:JSON.stringify({html,choose})});const data=await r.json() as {path?:string;saved?:boolean;error?:string};if(!r.ok)throw new Error(data.error||'site.html could not be written.');return data}
