'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {appFetch,isDesktop} from '../lib/transport';
type Status={ready:boolean;provider:string;model:string;state:string;owned:boolean;message:string};
export function useAIStatus(){
 const [status,setStatus]=useState<Status>({ready:false,provider:'',model:'',state:'checking',owned:false,message:''});
 const [starting,setStarting]=useState(false),[error,setError]=useState('');
 const pending=useRef<Promise<boolean>|null>(null),mounted=useRef(true),startLock=useRef(false);
 const refresh=useCallback(()=>{
  if(pending.current)return pending.current;
  const task=(async()=>{try{
   const [health,engine]=await Promise.all([appFetch('/api/generate'),isDesktop()?appFetch('/api/local-engine'):Promise.resolve(null)]);
   if(!health.ok||engine&&!engine.ok)throw new Error('Could not check local AI.');
   const h=await health.json() as {ready:boolean;provider?:string;model?:string},e=engine?await engine.json() as Pick<Status,'state'|'owned'|'message'>:{state:'external',owned:false,message:''};
   const usable=Boolean(h.ready)&&!['starting','stopping'].includes(e.state);
   if(mounted.current)setStatus({...e,ready:usable,provider:h.provider||'',model:h.model||''});
   return usable;
  }catch{if(mounted.current)setStatus(s=>({...s,ready:false,state:'unreachable',message:'Could not check the AI connection.'}));return false}
  finally{pending.current=null}})();pending.current=task;return task;
 },[]);
 useEffect(()=>{mounted.current=true;void refresh();const timer=setInterval(()=>void refresh(),3000);return()=>{mounted.current=false;clearInterval(timer)}},[refresh]);
 async function start(){if(startLock.current)return;startLock.current=true;setStarting(true);setError('');try{
  const r=await appFetch('/api/local-engine/start',{method:'POST'}),data=await r.json() as Pick<Status,'state'|'owned'|'message'>&{error?:string};if(!r.ok)throw new Error(data.error||'Could not start local AI.');
  if(mounted.current)setStatus(s=>({...s,...data,ready:false}));await refresh();
 }catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Could not start local AI.')}finally{startLock.current=false;if(mounted.current)setStarting(false)}}
 return {...status,refresh,start,starting,error};
}
