import {Worker} from 'node:worker_threads';
import path from 'node:path';
import type {RuleEntry} from '../lib/rules';
export type PdfResult={entries:RuleEntry[];skipped:number;ocrPages:number;pages:number};
let active:Worker|null=null;
export function cancelPdfImport(){void active?.terminate();active=null}
export function extractPdf(file:string,onProgress:(progress:{page:number;pages:number;stage?:string})=>void,workerFile=path.join(__dirname,'pdf-worker.mjs'),ocrMode:'auto'|'always'|'off'='auto'):Promise<PdfResult>{
 return new Promise((resolve,reject)=>{
  const worker=new Worker(workerFile,{workerData:{file,ocrMode},resourceLimits:{maxOldGenerationSizeMb:768}});active=worker;
  let settled=false;
  const finish=(error?:Error,result?:PdfResult)=>{if(settled)return;settled=true;clearTimeout(timer);clearTimeout(overall);if(active===worker)active=null;void worker.terminate();if(error)reject(error);else resolve(result!)};
  let timer=setTimeout(()=>finish(new Error('PDF extraction timed out. Try a smaller PDF.')),180000);
  const overall=setTimeout(()=>finish(new Error('This book exceeded the two-hour import limit. Split it into smaller PDFs.')),7200000);
  worker.on('message',message=>{if(message.progress){clearTimeout(timer);timer=setTimeout(()=>finish(new Error('A PDF page took too long to process. Try a smaller or clearer scan.')),180000);onProgress(message.progress);}else if(message.error)finish(new Error(message.error));else if(message.result)finish(undefined,message.result)});
  worker.on('error',error=>finish(error));
  worker.on('exit',()=>{if(!settled)finish(new Error('PDF import stopped before completion.'))});
 });
}
