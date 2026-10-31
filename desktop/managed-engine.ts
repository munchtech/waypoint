import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {spawn,execFile,type ChildProcess} from 'node:child_process';
import {inspectEngine,validateLocalURL,type Settings} from './local-engine';
export type EngineState='stopped'|'starting'|'running'|'stopping'|'external'|'failed';
export function portOccupied(baseURL:string){const u=new URL(validateLocalURL(baseURL));return new Promise<boolean>(resolve=>{const socket=net.createConnection({host:u.hostname,port:Number(u.port||80)});const finish=(value:boolean)=>{socket.destroy();resolve(value)};socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.setTimeout(1500,()=>finish(true))})}
export class ManagedEngine {
 private child:ChildProcess|null=null;private epoch=0;private phase:EngineState='stopped';private message='';private launch:Settings|null=null;private stopping:Promise<ReturnType<ManagedEngine['status']>>|null=null;
 constructor(private deps:{occupied:(url:string)=>Promise<boolean>;spawn:(settings:Settings)=>ChildProcess;inspect:(settings:Settings)=>Promise<unknown>;terminate:(child:ChildProcess)=>Promise<void>;wait:()=>Promise<void>}){}
 status(){return {state:this.phase,owned:!!this.child,message:this.message}}
 get active(){return ['starting','running','stopping'].includes(this.phase)}
 async start(settings:Settings){
  if(this.active||this.child)return this.status();
  if(settings.provider!=='comfyui')throw new Error('Start this provider in its own app, then use Connect & list models. Waypoint manages ComfyUI startup.');
  const epoch=++this.epoch;this.launch={...settings};this.phase='starting';this.message='Checking the local address…';
  try{
   const occupied=await this.deps.occupied(settings.baseURL);if(epoch!==this.epoch)return this.status();
   if(occupied){this.phase='external';this.message='A server is already running at this address. It was not launched by Waypoint and will not be stopped by Waypoint.';return this.status()}
   this.launch={...settings};const child=this.deps.spawn(settings);this.child=child;
   child.once('error',e=>{if(epoch===this.epoch){this.message=e.message;this.phase='failed';this.child=null}});
   child.once('exit',()=>{if(this.child===child){this.child=null;if(epoch===this.epoch){this.phase='failed';this.message='The local server exited. Check the engine log before starting again.'}}});
   this.message='Starting ComfyUI…';void this.monitor(settings,epoch);return this.status();
  }catch(e){if(epoch===this.epoch){this.phase='failed';this.message=e instanceof Error?e.message:String(e)}throw e}
 }
 private async monitor(settings:Settings,epoch:number){
  const until=Date.now()+120000;
  while(epoch===this.epoch&&this.child){
   try{await this.deps.inspect(settings);if(epoch!==this.epoch||!this.child)return;this.phase='running';this.message='ComfyUI is ready. Closing Waypoint will stop this server.';return}catch{}
   if(epoch!==this.epoch||!this.child)return;
   if(Date.now()>until){this.message='Startup timed out. Stop the server and check the engine log before retrying.';this.phase='failed';return}
   await this.deps.wait();
  }
 }
 stop(){if(this.stopping)return this.stopping;this.stopping=this.stopOwned().finally(()=>{this.stopping=null});return this.stopping}
 private async stopOwned(){
  ++this.epoch;const child=this.child;this.phase='stopping';this.message='Stopping the server…';
  try{if(child)await this.deps.terminate(child);if(this.child===child)this.child=null;this.phase='stopped';this.message='Local AI is stopped. Start it when you need it.';this.launch=null}
  catch(e){this.phase='failed';this.message='Could not stop the local server. '+String(e);throw e}
  return this.status();
 }
 assertSettings(next:Settings){if((this.active||this.child)&&this.launch&&['provider','baseURL','comfyInstall'].some(k=>next[k as keyof Settings]!==this.launch![k as keyof Settings]))throw new Error('Stop the managed server before changing its engine, address or folder.')}
}
export function createManagedEngine(dataDir:string){return new ManagedEngine({occupied:portOccupied,inspect:inspectEngine,wait:()=>new Promise(r=>setTimeout(r,1000)),spawn(settings){
 const directory=path.resolve(settings.comfyInstall),script=path.join(directory,'main.py'),python=path.join(directory,'.venv','Scripts','python.exe');
 if(!settings.comfyInstall||!fs.existsSync(script)||!fs.existsSync(python))throw new Error('Choose the ComfyUI folder containing main.py and .venv in AI & backups.');
 const url=new URL(validateLocalURL(settings.baseURL));if(!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Managed startup uses 127.0.0.1 or localhost.');
 const base=path.join(dataDir,'comfy-runtime');for(const sub of ['user','output','temp'])fs.mkdirSync(path.join(base,sub),{recursive:true});
 const args=[script,'--listen','127.0.0.1','--port',url.port||'80','--disable-auto-launch','--offline','--disable-all-custom-nodes','--user-directory',path.join(base,'user'),'--output-directory',path.join(base,'output'),'--temp-directory',path.join(base,'temp')];
 const models=path.join(directory,'..','..','..','ComfyUI-Shared','models');if(fs.existsSync(models))args.push('--models-directory',models);
 const log=fs.openSync(path.join(base,'engine.log'),'a');try{return spawn(python,args,{cwd:directory,windowsHide:true,stdio:['ignore',log,log]})}finally{fs.closeSync(log)}
 },terminate:terminateOwnedProcess})}
export function terminateOwnedProcess(child:ChildProcess){return new Promise<void>((resolve,reject)=>{
 if(child.exitCode!==null||child.signalCode!==null||!child.pid){resolve();return}
 if(process.platform==='win32'){execFile(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,timeout:10000},error=>{if(error&&child.exitCode===null&&child.signalCode===null)reject(error);else resolve()})}
 else{child.once('exit',()=>resolve());if(!child.kill())reject(new Error('Server did not accept termination'))}
})}
