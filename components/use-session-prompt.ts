'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
type Draft={text:string;kind:string;previous?:{text:string;kind:string}};
const empty:Draft={text:'',kind:'NPC'};
function read(key:string):Draft{try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d&&typeof d.text==='string'&&d.text.length<=10000&&typeof d.kind==='string')return {text:d.text,kind:d.kind,previous:d.previous&&typeof d.previous.text==='string'&&d.previous.text.length<=10000&&typeof d.previous.kind==='string'?d.previous:undefined}}catch{}return {...empty}}
export function useSessionPrompt(campaignId:string,sessionId:string){
 const key='waypoint-prompt-v1:'+encodeURIComponent(campaignId)+':'+encodeURIComponent(sessionId);
 const saved=useMemo(()=>read(key),[key]);
 const [state,setState]=useState<{key:string;draft:Draft}|null>(null),[failure,setFailure]=useState('');
 const current=state?.key===key?state.draft:saved;
 const ref=useRef({key,draft:current});useEffect(()=>{ref.current={key,draft:current}});
 function commit(change:(draft:Draft)=>Draft){const before=ref.current.key===key?ref.current.draft:saved;const next=change(before);ref.current={key,draft:next};setState({key,draft:next});try{localStorage.setItem(key,JSON.stringify(next));setFailure('')}catch{setFailure('This prompt could not be saved locally. Copy it before closing.')}}
 return {quick:current.text,kind:current.kind,failure,canUndo:!!current.previous,
  setQuick:(text:string)=>commit(d=>({...d,text})),setKind:(kind:string)=>commit(d=>({...d,kind})),
  replace:(text:string,kind:string)=>commit(d=>({text,kind,previous:d.text.trim()?{text:d.text,kind:d.kind}:d.previous})),
  undo:()=>commit(d=>d.previous?{...d.previous,previous:{text:d.text,kind:d.kind}}:d)};
}
