import {acceptProposal,type Memory,type Proposal,type WikiPage} from './memory';
const normalized=(s:string)=>s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function relatedEvidence(p:Proposal,pages:WikiPage[]){
 const name=normalized(p.title);
 return pages.filter(page=>[page.title,...page.aliases.split(/[,;\n]/)].some(alias=>{
  const a=normalized(alias);return a.length>=3&&(a===name||(' '+name+' ').includes(' '+a+' ')||(' '+a+' ').includes(' '+name+' '));
 })).slice(0,8);
}
export function applyReview(memory:Memory,noteId:string,proposalId:string,targetId:string,status:WikiPage['status'],visibility:WikiPage['visibility']):Memory{
 const source=memory.notes.find(n=>n.id===noteId),proposal=source?.proposals.find(p=>p.id===proposalId);
 if(!proposal||proposal.state!=='pending'||!proposal.body.trim())return memory;
 if(!targetId)return acceptProposal(memory,noteId,proposalId,status,visibility);
 const page=memory.pages.find(p=>p.id===targetId);if(!page)throw new Error('That wiki page no longer exists. Choose another destination.');
 const updated:WikiPage={...page,body:page.body+'\n\n'+proposal.body,status,visibility,sourceId:noteId,quote:proposal.quote,updated:new Date().toISOString(),history:[{body:page.body,status:page.status,visibility:page.visibility,date:page.updated,sourceId:page.sourceId,quote:page.quote},...page.history]};
 return {...memory,pages:memory.pages.map(p=>p.id===page.id?updated:p),notes:memory.notes.map(n=>n.id===noteId?{...n,proposals:n.proposals.map(p=>p.id===proposalId?{...p,state:'accepted',pageId:page.id,appliedToExisting:true}:p)}:n)};
}
