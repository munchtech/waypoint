// Reading a session plan at the table: its own pacing timeline ("| 0:20 to 0:50 | Scene 1 … |") and its "## Table card" section.
export type Row={from:number;to:number;what:string};
const plainText=(t:string)=>t.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/[*_`]/g,'').trim();
export function timeline(plan:string):Row[]{return [...plan.matchAll(/^\|\s*(\d+):(\d\d)\s+to\s+(\d+):(\d\d)\s*\|\s*(.+?)\s*\|\s*$/gm)].map(m=>({from:+m[1]*60+ +m[2],to:+m[3]*60+ +m[4],what:plainText(m[5])}))}
// The plan's "## Table card" section, up to the next heading of the same level.
export function tableCard(plan:string){const at=plan.search(/^## Table card/m);if(at<0)return '';const rest=plan.slice(at),next=rest.slice(3).search(/^## /m);return next<0?rest:rest.slice(0,next+3)}
export const clockText=(min:number)=>Math.floor(min/60)+':'+String(Math.floor(min%60)).padStart(2,'0');
// Where the plan's timeline says a session usually is after `min` minutes.
export function pace(rows:Row[],min:number){if(!rows.length)return null;const now=rows.find(r=>min>=r.from&&min<r.to),last=rows[rows.length-1];if(now){const next=rows[rows.indexOf(now)+1];return {now:now.what,next:next?next.what+' at '+clockText(next.from):'The closing question',over:false}}return min>=last.to?{now:'Past the planned time. Check “Running long” in Pacing for where to cut or stop.',next:'',over:true}:null}
