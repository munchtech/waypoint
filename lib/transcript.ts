import {z} from 'zod';
export const transcriptSchema=z.object({language:z.string().optional(),revision:z.number().int().min(0).default(0),segments:z.array(z.object({start:z.number().finite().nonnegative(),end:z.number().finite().nonnegative(),text:z.string().max(10000),speaker:z.string().max(100).optional()}).refine(s=>s.end>=s.start,'Segment end must not precede its start')).max(50000)});
export type Transcript=z.infer<typeof transcriptSchema>;
export function reviseTranscript(previous:unknown,next:unknown){
 const old=transcriptSchema.parse(previous),edited=transcriptSchema.parse(next);
 if(old.revision!==edited.revision)throw new Error('This transcript changed. Reopen it before saving.');
 if(old.segments.length!==edited.segments.length||old.segments.some((s,i)=>s.start!==edited.segments[i].start||s.end!==edited.segments[i].end))throw new Error('Transcript timestamps must stay unchanged.');
 return {...old,segments:edited.segments,revision:old.revision+1};
}
export function audioRange(value:string|null,size:number){
 if(!value)return {start:0,end:size-1,status:200};
 const m=/^bytes=(\d*)-(\d*)$/.exec(value);
 if(!m||(!m[1]&&!m[2]))throw new Error('Invalid byte range');
 const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2]));
 const end=m[1]?(m[2]?Math.min(size-1,Number(m[2])):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)throw new Error('Unsatisfiable byte range');
 return {start,end,status:206};
}
