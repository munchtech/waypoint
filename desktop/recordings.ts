type RouteBody={campaignId?:string;id?:string;consent?:boolean;created?:string;data?:string;failed?:boolean;label?:string;seconds?:number;segments?:unknown[];sequence?:number;sessionId?:string;title?:string;transcript?:unknown;vocabulary?:unknown};
import {recordingId,recordingSchema,type RecordingMetadata} from '../lib/recording-metadata';
import {reviseTranscript} from '../lib/transcript';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn,ChildProcess} from 'node:child_process';
import {dialog,shell} from 'electron';

type Recording=RecordingMetadata;
export class RecordingLibrary {
 private folder:string; private active:string|null=null; private worker:ChildProcess|null=null;
 private jobs=new Map<string,{state:string;error?:string;segments:number}>();
 constructor(dataDir:string,private speechRoot:string,private script:string){this.folder=path.join(dataDir,'recordings');fs.mkdirSync(this.folder,{recursive:true});for(const r of this.list()){if(r.state==='recording'){r.state='interrupted';this.save(r)}}}
 private meta(id:string){recordingId.parse(id);return path.join(this.folder,id+'.json')}
 private read(id:string):Recording{const r=recordingSchema.parse(JSON.parse(fs.readFileSync(this.meta(id),'utf8')));if(r.id!==id)throw new Error('Recording metadata ID mismatch');return r}
 private save(r:Recording){const file=this.meta(r.id);fs.writeFileSync(file+'.tmp',JSON.stringify(r));fs.renameSync(file+'.tmp',file)}
 list(){return fs.readdirSync(this.folder).filter(f=>/^[a-f0-9-]{36}\.json$/.test(f)).flatMap(f=>{try{return [this.read(f.slice(0,-5))]}catch{return []}}).sort((a,b)=>b.created.localeCompare(a.created))}
 audioFile(id:string){const r=this.read(id);if(!['.webm','.wav','.mp3','.m4a','.ogg','.flac'].some(ext=>r.file===id+ext))throw new Error('Invalid audio file');return path.join(this.folder,r.file)}
 get isRecording(){return !!this.active}
 get isTranscribing(){return !!this.worker}
 async route(action:string,b:RouteBody){
  if(action==='list')return {recordings:this.list().filter(r=>r.campaignId===b.campaignId),jobs:Object.fromEntries(this.jobs),invalidRecordings:fs.readdirSync(this.folder).filter(f=>/^[a-f0-9-]{36}\.json$/.test(f)).length-this.list().length,speechReady:fs.existsSync(path.join(this.speechRoot,'python.exe'))&&fs.existsSync(path.join(this.speechRoot,'model','model.bin'))};
  if(action==='start'){
   if(this.active)throw new Error('A recording is already running.');
   if(!b.consent||typeof b.campaignId!=='string'||typeof b.sessionId!=='string')throw new Error('Confirm participant agreement and choose a session.');
   const r:Recording={id:randomUUID(),campaignId:b.campaignId,sessionId:b.sessionId,title:String(b.title||'Session recording').slice(0,160),created:new Date().toISOString(),file:'',bytes:0,chunks:0,state:'recording',markers:[]};r.file=r.id+'.webm';this.save(r);this.active=r.id;return r;
  }
  if(action==='import'){
   const result=await dialog.showOpenDialog({title:'Import session audio',properties:['openFile'],filters:[{name:'Audio',extensions:['webm','wav','mp3','m4a','ogg','flac']} ]});if(result.canceled)return {cancelled:true};const file=result.filePaths[0];if(!['.webm','.wav','.mp3','.m4a','.ogg','.flac'].includes(path.extname(file).toLowerCase()))throw new Error('Choose a supported audio file.');if(fs.statSync(file).size>4*1024**3)throw new Error('Import audio smaller than 4 GB.');
   const id=randomUUID();const r:Recording={id,campaignId:String(b.campaignId),sessionId:String(b.sessionId),title:path.basename(file),created:new Date().toISOString(),file:id+path.extname(file).toLowerCase(),bytes:fs.statSync(file).size,chunks:1,state:'imported',markers:[]};await fs.promises.copyFile(file,path.join(this.folder,r.file));this.save(r);return r;
  }
  if(action==='chunk'){
   const r=this.read(b.id??'');if(this.active!==r.id)throw new Error('This recording is no longer active.');if(typeof b.data!=='string'||b.data.length>4000000||(typeof b.sequence!=='number'||!Number.isInteger(b.sequence)))throw new Error('Invalid audio chunk.');if(b.sequence<r.chunks)return {saved:true};if(b.sequence!==r.chunks)throw new Error('Missing audio chunk. Stop recording and check the saved audio.');
   const bytes=Buffer.from(b.data,'base64');const target=path.join(this.folder,r.file);const space=fs.statfsSync(this.folder);if(space.bavail*space.bsize<bytes.length+20*1024*1024)throw new Error('Disk space is low. Recording stopped to protect saved audio.');
   const fd=fs.openSync(target,'a');try{let offset=0;while(offset<bytes.length){const written=fs.writeSync(fd,bytes,offset,bytes.length-offset);if(!written)throw new Error('Audio write made no progress');offset+=written}fs.fsyncSync(fd)}finally{fs.closeSync(fd)}r.bytes+=bytes.length;r.chunks++;this.save(r);return {saved:true};
  }
  if(action==='stop'){const r=this.read(b.id??'');r.state=b.failed?'interrupted':'complete';this.save(r);if(this.active===r.id)this.active=null;return r}
  if(action==='marker'){const r=this.read(b.id??'');if(typeof b.seconds!=='number'||!Number.isFinite(b.seconds)||b.seconds<0)throw new Error('Invalid marker');r.markers.push({seconds:b.seconds,label:String(b.label||'Important moment').slice(0,200)});this.save(r);return r}
  if(action==='open'){const r=this.read(b.id??'');const error=await shell.openPath(this.audioFile(r.id));if(error)throw new Error(error);return {ok:true}}
  if(action==='transcript'){const r=this.read(b.id??'');const file=path.join(this.folder,r.id+'.transcript.json');if(!fs.existsSync(file))throw new Error('No completed transcript yet.');return JSON.parse(fs.readFileSync(file,'utf8'))}
  if(action==='save-transcript'){
   const r=this.read(b.id??'');if(this.worker)throw new Error('Wait for transcription to finish.');
   const file=path.join(this.folder,r.id+'.transcript.json');const old=fs.readFileSync(file,'utf8');const next=reviseTranscript(JSON.parse(old),b.transcript);
   const archive=path.join(this.folder,r.id+'.transcript-revision-'+(next.revision-1)+'.json');
   if(!fs.existsSync(archive))fs.writeFileSync(archive,old,{flag:'wx'});
   fs.writeFileSync(file+'.tmp',JSON.stringify(next));fs.renameSync(file+'.tmp',file);return next;
  }
  if(action==='cancel'){this.worker?.kill();return {ok:true}}
  if(action==='transcribe'){
   if(this.worker)throw new Error('A transcription is already running.');const r=this.read(b.id??'');if(this.active===r.id)throw new Error('Stop recording before transcribing.');
   const python=path.join(this.speechRoot,'python.exe'),model=path.join(this.speechRoot,'model');if(!fs.existsSync(python)||!fs.existsSync(path.join(model,'model.bin')))throw new Error('Keep the Waypoint-Speech folder next to Waypoint.exe. The local speech model is missing.');
   const output=path.join(this.folder,r.id+'.transcript.json');if(fs.existsSync(output))throw new Error('A transcript already exists. Open Review transcript to correct it.');this.jobs.set(r.id,{state:'transcribing',segments:0});let error='';
   this.worker=spawn(python,['-X','utf8',this.script,model,this.audioFile(r.id),output,String(b.vocabulary||'').slice(0,1500)],{windowsHide:true,env:{...process.env,HF_HUB_OFFLINE:'1'}});
   this.worker.stdout?.on('data',data=>{const job=this.jobs.get(r.id)!;job.segments+=(data.toString().match(/SEGMENT/g)||[]).length});
   this.worker.stderr?.on('data',data=>{error=(error+data.toString()).slice(-2000)});
   this.worker.on('error',e=>{error=e.message});this.worker.on('close',code=>{this.worker=null;this.jobs.set(r.id,{state:code===0?'complete':'failed',segments:this.jobs.get(r.id)?.segments||0,error:code===0?undefined:error||'Transcription stopped. Audio is preserved.'})});return {started:true};
  }
  throw new Error('Unknown recording action.');
 }
 close(){this.worker?.kill();if(this.active){const r=this.read(this.active);r.state='interrupted';this.save(r)}}
}
