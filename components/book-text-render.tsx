import {createElement, Fragment, useId, useMemo, type ReactNode} from 'react';
import MarkdownIt from 'markdown-it';
type Token = ReturnType<typeof markdown.parse>[number];
import {safeWebLink} from '../lib/safe-web-link';

// Parse Markdown, but construct React elements ourselves. Raw HTML and arbitrary
// token attributes never enter the DOM, and images never load remote resources.
const markdown = new MarkdownIt({html:false, linkify:false, breaks:false});
const tags = new Set(['p','blockquote','ul','ol','li','strong','em','s','table','thead','tbody','tr','th','td']);
const slug = (value:string) => value.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu,'').replace(/\s+/g,'-');
function plain(tokens:Token[]):string {
 return tokens.map(t=>t.type==='image'?t.content:t.children?plain(t.children):t.content).join('');
}
// A link to `play:<id>` names a prepared play. Where the page knows its plays (session notes), the link becomes a button that opens
// the play's card in place; elsewhere (the book, the wiki) it reads as plain text.
export type PlayLinks={open:string|null;toggle:(id:string)=>void;render:(id:string)=>ReactNode};
function render(tokens:Token[], prefix:string, plays?:PlayLinks):ReactNode[] {
 let index=0;
 function walk():ReactNode[] {
  const nodes:ReactNode[]=[];
  while(index<tokens.length){
   const key=index, token=tokens[index++];
   if(token.nesting===-1)break;
   const children=token.nesting===1?walk():token.children?render(token.children,prefix,plays):[];
   if(token.hidden){nodes.push(<Fragment key={key}>{children}</Fragment>);continue;}
   if(token.type==='inline'){nodes.push(<Fragment key={key}>{children}</Fragment>);continue;}
   if(token.type==='text'){nodes.push(token.content.replace(/^\[ \] /,'☐ ').replace(/^\[[xX]\] /,'☑ '));continue;}
   if(token.type==='softbreak'){nodes.push(' ');continue;}
   if(token.type==='hardbreak'){nodes.push(<br key={key}/>);continue;}
   if(token.type==='code_inline'){nodes.push(<code key={key}>{token.content}</code>);continue;}
   if(token.type==='fence'||token.type==='code_block'){nodes.push(<pre key={key}><code>{token.content.replace(/\n$/,'')}</code></pre>);continue;}
   if(token.type==='hr'){nodes.push(<hr key={key}/>);continue;}
   if(token.type==='link_open'&&String(token.attrGet('href')||'').startsWith('play:')){
    const id=String(token.attrGet('href')).slice(5),open=plays?.open===id;
    nodes.push(plays?<Fragment key={key}><button type="button" className={'play-link'+(open?' open':'')} aria-expanded={open} onClick={()=>plays.toggle(id)}>{children}</button>{open&&plays.render(id)}</Fragment>:<Fragment key={key}>{children}</Fragment>);
    continue;
   }
   if(token.type==='link_open'||token.type==='image'){
    const href=String(token.attrGet(token.type==='image'?'src':'href')||'');
    const label=token.type==='image'?token.content||'Image':children;
    const web=safeWebLink(href);
    let anchor='';
    if(href.startsWith('#')){try{anchor=prefix+decodeURIComponent(href.slice(1))}catch{}}
    nodes.push(web?<a key={key} href={web} target="_blank" rel="noopener noreferrer" title={web+' (opens in browser)'}>{label}</a>:anchor?<a key={key} href={'#'+anchor} onClick={event=>{event.preventDefault();const target=document.getElementById(anchor);target?.scrollIntoView({block:'start'});target?.focus({preventScroll:true})}}>{label}</a>:<span key={key} title={'Unsupported link: '+href}>{label}</span>);
    continue;
   }
   if(token.type==='heading_open'){
    const level=Math.min(6,Number(token.tag.slice(1))+2);
    nodes.push(createElement('h'+level,{key,id:token.attrGet('id'),tabIndex:-1},children));continue;
   }
   if(tags.has(token.tag)){
    const props:Record<string,unknown>={key};
    if(token.tag==='ol'&&token.attrGet('start'))props.start=Number(token.attrGet('start'));
    if(token.tag==='td'||token.tag==='th'){
     const alignment=String(token.attrGet('style')||'').match(/^text-align:(left|center|right)$/)?.[1];
     if(alignment)props.style={textAlign:alignment};
    }
    const element=createElement(token.tag,props,children);
    nodes.push(token.tag==='table'?<div className="book-table" key={key}>{element}</div>:element);
   }else nodes.push(<Fragment key={key}>{token.content}{children}</Fragment>);
  }
  return nodes;
 }
 return walk();
}
export default function BookText({text,plays}:{text:string;plays?:PlayLinks}){
 const prefix=useId()+'-';
 const tokens=useMemo(()=>{
  const tokens=markdown.parse(text,{}),counts=new Map<string,number>();
  for(let i=0;i<tokens.length;i++)if(tokens[i].type==='heading_open'){
   const name=slug(plain(tokens[i+1]?.children||[]))||'section',count=counts.get(name)||0;
   counts.set(name,count+1);tokens[i].attrSet('id',prefix+name+(count?'-'+count:''));
  }
  return tokens;
 },[text,prefix]);
 return <div className="book-text">{render(tokens,prefix,plays)}</div>;
}


