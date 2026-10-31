import {transcriptSchema,type Transcript} from './transcript';
import type {SessionNote} from './memory';
export function timestamp(seconds:number){
 const total=Math.floor(Math.max(0,Number.isFinite(seconds)?seconds:0));
 return [Math.floor(total/3600),Math.floor(total/60)%60,total%60].map(n=>String(n).padStart(2,'0')).join(':');
}
export function transcriptText(data:Transcript){return data.segments.filter(s=>s.text.trim()).map(s=>`[${timestamp(s.start)}] ${s.speaker?s.speaker+': ':''}${s.text}\n`).join('')}
export function importTranscript(recording:{id:string;sessionId:string;title:string},value:unknown,existing:SessionNote[]):SessionNote[]{
 const data=transcriptSchema.parse(value),parts:string[]=[];let part='';
 for(const segment of data.segments.filter(s=>s.text.trim())){
  const line=transcriptText({...data,segments:[segment]});
  if(part&&part.length+line.length>28000){parts.push(part);part=''}part+=line;
 }
 if(part)parts.push(part);
 if(!parts.length)throw new Error('No speech was detected. Audio remains available.');
 return parts.flatMap((text,i)=>{
  const id=`recording-${recording.id}-v${data.revision}-${i}`,legacy=`recording-${recording.id}-${i}`;
  if(existing.some(n=>n.id===id||data.revision===0&&n.id===legacy))return [];
  return [{id,recordingId:recording.id,transcriptRevision:data.revision,sessionId:recording.sessionId,title:`${recording.title} · transcript ${i+1} (revision ${data.revision})`,date:new Date().toISOString(),text,summary:'',proposals:[]}];
 });
}
