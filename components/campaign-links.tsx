'use client';
import {createContext,useContext,useMemo} from 'react';
import type {ReactNode} from 'react';
import type {WikiPage} from '../lib/memory';
import {mentionIndex,splitMentions} from '../lib/wiki-mentions';
import {plainPreview} from '../lib/plain-text';

type Links={pages:WikiPage[];onOpen:(id:string)=>void};
export const CampaignLinks=createContext<Links|null>(null);

export function useMentionRenderer(excludeId?:string){
 const links=useContext(CampaignLinks);
 const pages=links?.pages;
 const index=useMemo(()=>mentionIndex(pages||[],excludeId),[pages,excludeId]);
 return (text:string,seen:Set<string>):ReactNode=>{
  if(!links)return text;
  return splitMentions(text,index,seen).map((part,i)=>{
   const page=part.pageId?links.pages.find(page=>page.id===part.pageId):undefined;
   return page?<button type="button" key={i} className="wiki-mention" title={page.title+' · '+page.status+'\n'+plainPreview(page.body,180)} onClick={()=>links.onOpen(page.id)}>{part.text}</button>:part.text;
  });
 };
}
