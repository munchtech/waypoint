type NativeReply={status:number;body:unknown};
declare global {interface Window {waypoint?:{request:(path:string,method:string,body?:string)=>Promise<NativeReply>;cancel:()=>Promise<void>;desktop:true}}}
export const isDesktop=()=>typeof window!=='undefined'&&!!window.waypoint;
export async function appFetch(path:string,options:RequestInit={}){if(window.waypoint){const r=await window.waypoint.request(path,options.method||'GET',typeof options.body==='string'?options.body:undefined);return new Response(JSON.stringify(r.body),{status:r.status,headers:{'Content-Type':'application/json'}})}return fetch(path,options)}
