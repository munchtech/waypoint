import type {WikiPage} from './memory';

export type Mention={text:string;pageId?:string};
const genericAliases=new Set(['keep','change','changes','rule','rules','note','notes','party','session','sessions','world','story','time','pilot']);
// Three-letter names (Ila, Tam, Eld) link only when written exactly as on the page, capital first, so "ila" or "TAM" stay plain text.
const shortName=(name:string)=>/^\p{Lu}\p{Ll}{2}$/u.test(name);
export function mentionIndex(pages:WikiPage[],excludeId?:string){
 const names=new Map<string,{name:string;ids:Set<string>}>();
 for(const page of pages){
  const aliases=page.aliases.split(/[,;\n]/).map(name=>name.trim()).filter(name=>!genericAliases.has(name.toLocaleLowerCase())&&!/^\d+$/.test(name));
  for(const name of [page.title,...aliases].map(name=>name.trim()).filter(name=>name.length>=4||shortName(name))){
   const key=name.toLocaleLowerCase();
   const entry=names.get(key)||{name,ids:new Set<string>()};
   entry.ids.add(page.id);
   names.set(key,entry);
  }
 }
 const unique=[...names.values()].filter(entry=>entry.ids.size===1&&!entry.ids.has(excludeId||''));
 const byName=new Map(unique.map(entry=>[entry.name.toLocaleLowerCase(),[...entry.ids][0]]));
 const exact=new Map(unique.filter(entry=>entry.name.length<4).map(entry=>[entry.name.toLocaleLowerCase(),entry.name]));
 const escaped=unique.map(entry=>entry.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).sort((a,b)=>b.length-a.length);
 const pattern=escaped.length?new RegExp('(?<![\\p{L}\\p{N}_])(?:'+escaped.join('|')+')(?![\\p{L}\\p{N}_])','giu'):null;
 return {byName,exact,pattern};
}

// Link the first unambiguous mention of a page in a document, or every mention when `every` is set (session notes and
// play cards, read at the table), preserving the original words.
export function splitMentions(text:string,index:ReturnType<typeof mentionIndex>,seen:Set<string>,every=false):Mention[]{
 if(!index.pattern)return [{text}];
 const parts:Mention[]=[];
 let start=0;
 for(const match of text.matchAll(index.pattern)){
  const key=match[0].toLocaleLowerCase(),id=index.byName.get(key),exact=index.exact.get(key);
  if(!id||(!every&&seen.has(id))||(exact&&exact!==match[0]))continue;
  if(match.index>start)parts.push({text:text.slice(start,match.index)});
  parts.push({text:match[0],pageId:id});
  seen.add(id);
  start=match.index+match[0].length;
 }
 if(start<text.length)parts.push({text:text.slice(start)});
 return parts;
}
