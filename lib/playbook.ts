import {affinity,styles,type Branch,type Campaign,type Style} from './campaign';
import type {Memory} from './memory';
import type {Brief,Cond,Effect,Encounter,Playbook,RosterMember} from './playbook-schema';
export type {Bargain,Brief,Cond,Effect,Encounter,Ending,Flag,LedgerEntry,LogEntry,Playbook,RosterMember,StatBlock} from './playbook-schema';
export {ledgerKinds} from './playbook-schema';

// A playbook makes preparation predictive: world-state flags, plays with conditions and effects, encounters, briefs and endings.
// Plays for a session live in session.branches (origin 'playbook'); campaign-wide plays live in playbook.anytime.
export type Play=Branch;export type FlagValue=string|number;export type WorldState=Record<string,FlagValue>;

export const playbookOf=(m:Memory):Playbook|undefined=>m.playbook;
export function stateOf(pb:Playbook):WorldState{const s:WorldState={};for(const f of pb.flags)s[f.id]=pb.state[f.id]??f.initial;return s}
export const flagLabel=(pb:Playbook,id:string)=>pb.flags.find(f=>f.id===id)?.label||id;
export function valueLabel(pb:Playbook,id:string,value:FlagValue|undefined){const f=pb.flags.find(x=>x.id===id);if(!f||value===undefined)return String(value??'');if(f.options)return f.options.find(o=>o.id===value)?.label||String(value);return String(value)+(f.max!==undefined?' / '+f.max:'')}
export function holds(c:Cond,s:WorldState){const v=s[c.flag];if(c.in&&!c.in.includes(String(v)))return false;if(c.not&&c.not.includes(String(v)))return false;if(c.min!==undefined&&!(Number(v)>=c.min))return false;if(c.max!==undefined&&!(Number(v)<=c.max))return false;return true}
// Why a condition fails, phrased from the current state: "Ossa's Heart is Court custody".
export function blockers(pb:Playbook,when:Cond[]|undefined,s=stateOf(pb)){return (when||[]).filter(c=>!holds(c,s)).map(c=>flagLabel(pb,c.flag)+' is '+valueLabel(pb,c.flag,s[c.flag]))}
export const isPossible=(pb:Playbook|undefined,play:{when?:Cond[]},s?:WorldState)=>!pb||!play.when?.length||play.when.every(c=>holds(c,s||stateOf(pb)));
// Effects resolved against the current state; clock additions clamp to the flag's range. Unchanged values are dropped.
export function resolveEffects(pb:Playbook,effects:Effect[]|undefined,s=stateOf(pb)){return (effects||[]).flatMap(e=>{const f=pb.flags.find(x=>x.id===e.flag);if(!f)return [];const from=s[e.flag];let to:FlagValue;if(f.options){if(e.set===undefined||!f.options.some(o=>o.id===e.set))return [];to=e.set}else{to=Math.max(0,Math.min(f.max??99,Number(from||0)+Number(e.add||0)))}return from===to?[]:[{flag:e.flag,from,to}]})}
export function applyChanges(pb:Playbook,changes:{flag:string;from:FlagValue;to:FlagValue}[],meta:{sessionId:string;title:string;playId?:string}):Playbook{if(!changes.length)return pb;const state={...pb.state};for(const c of changes)state[c.flag]=c.to;return {...pb,state,log:[{id:crypto.randomUUID(),at:new Date().toISOString(),sessionId:meta.sessionId,title:meta.title.slice(0,300),...(meta.playId?{playId:meta.playId.slice(0,120)}:{}),changes},...pb.log].slice(0,500)}}
// Undo restores each flag only if nothing changed it since; later changes win and are reported back.
export function undoEntry(pb:Playbook,id:string){const entry=pb.log.find(l=>l.id===id);if(!entry||entry.undone)return {pb,kept:[] as string[]};const s=stateOf(pb),state={...pb.state},kept:string[]=[];for(const c of entry.changes){if(s[c.flag]===c.to)state[c.flag]=c.from;else kept.push(flagLabel(pb,c.flag))}return {pb:{...pb,state,log:pb.log.map(l=>l.id===id?{...l,undone:true}:l)},kept}}
export const setFlag=(pb:Playbook,flag:string,to:FlagValue,sessionId:string)=>{const from=stateOf(pb)[flag];return from===to?pb:applyChanges(pb,[{flag,from,to}],{sessionId,title:'Set by hand: '+flagLabel(pb,flag)})};

// The number a session goes by in the book ("Session 16A: …" → "16A"). Plays' "Down the line" notes use these numbers, not list positions.
export const sessionNumber=(title:string,index:number)=>title.match(/^Sessions?\s+(\d+[A-Z]?)/i)?.[1]||String(index+1);
export const sessionTag=(c:Campaign,id?:string)=>{const i=c.sessions.findIndex(s=>s.id===id);return i<0?'Anytime':'S'+sessionNumber(c.sessions[i].title,i)};
// "S16" finds 16A, "S29" finds "Sessions 28 to 30".
export function sessionByRef(c:Campaign,ref:string){const m=ref.match(/^S?(\d+)([A-Z]?)$/i);if(!m)return -1;const n=Number(m[1]),letter=m[2].toUpperCase();return c.sessions.findIndex(s=>{const t=s.title.match(/^Sessions?\s+(\d+)([A-Z]?)(?:\s*(?:to|–|-)\s*(\d+))?/i);if(!t)return false;const a=Number(t[1]),b=Number(t[3]||t[1]);return n>=a&&n<=b&&(!letter||!t[2]||t[2].toUpperCase()===letter)})}
// Plays the table has actually made: chronicle outcomes and world-state changes applied from a play (undone ones excluded).
export function recordedPlays(c:Campaign,pb?:Playbook){const all=new Map<string,Play>();for(const s of c.sessions)for(const b of s.branches)all.set(b.id,b);for(const b of pb?.anytime||[])all.set(b.id,b);const out=new Map<string,{play:Play;sessionId:string}>();
 for(const e of [...c.events].reverse())if(e.branchId&&all.has(e.branchId)&&!out.has(e.branchId))out.set(e.branchId,{play:all.get(e.branchId)!,sessionId:e.sessionId});
 for(const l of [...(pb?.log||[])].reverse())if(l.playId&&!l.undone&&all.has(l.playId)&&!out.has(l.playId))out.set(l.playId,{play:all.get(l.playId)!,sessionId:l.sessionId});
 return [...out.values()]}
// Callbacks: each recorded play's "Down the line" note, sentence by sentence, lands on the later session it names.
// "S4: Maudrin opens with their names." goes to Session 4 as "Maudrin opens with their names."; "Quill returns in S3." goes to Session 3 whole.
export function echoes(c:Campaign,pb?:Playbook){const out:{sessionId:string;text:string;play:Play;from:string}[]=[];
 for(const r of recordedPlays(c,pb)){const from=c.sessions.findIndex(s=>s.id===r.sessionId);for(const sentence of (r.play.later||'').split(/(?<=[.!?])\s+(?=[A-Z"“‘'])/)){const lead=sentence.match(/^S(\d+[A-Z]?)\s*:\s*/);const refs=lead?[lead[1]]:[...new Set([...sentence.matchAll(/\bS(\d+[A-Z]?)\b/g)].map(m=>m[1]))],text=lead?sentence.slice(lead[0].length):sentence;for(const ref of refs){const i=sessionByRef(c,ref);if(i>from&&!out.some(o=>o.sessionId===c.sessions[i].id&&o.play.id===r.play.id&&o.text===text))out.push({sessionId:c.sessions[i].id,text,play:r.play,from:r.sessionId})}}}
 return out}

export const likelihoodWeight=(l:string)=>/^likely|worth preparing/i.test(l)?3:/^possible|strong alternative/i.test(l)?2:1;
// Ranking uses the authored likelihood and the table's recorded style preferences. It is a preparation order, not a probability.
// A lean is named only when one style clearly leads the recorded preferences.
export function rankPlays(campaign:Campaign,pb:Playbook|undefined,plays:Play[]){const s=pb?stateOf(pb):{};const aff=Object.fromEntries(styles.map(st=>[st,affinity(campaign,st)])) as Record<Style,number>;const top=Math.max(...Object.values(aff),1);
 const leader=styles.filter(st=>aff[st]===top).length===1?styles.find(st=>aff[st]===top):undefined;
 // A play that only became possible because of what the table did rises, and says why.
 const opened=(p:Play)=>pb?(p.when||[]).filter(c=>{const f=pb.flags.find(x=>x.id===c.flag);return f&&s[c.flag]!==f.initial&&holds(c,s)}).map(c=>flagLabel(pb,c.flag)+' is '+valueLabel(pb,c.flag,s[c.flag])):[];
 return plays.map((p,i)=>{const possible=isPossible(pb,p,s);const lean=Math.max(0,aff[p.style])/top;const because=possible?opened(p):[];const score=(possible?10:0)+likelihoodWeight(p.likelihood)*2+lean+(because.length?1.5:0);const reasons=[...(because.length?['Because '+because[0]]:[]),...(p.style===leader?['Your table leans '+p.style]:[])];return {play:p,possible,score,order:i,reasons}}).sort((a,b)=>b.score-a.score||a.order-b.order)}
// Which plays and endings read a flag: the forward-looking half of a ripple.
export function dependents(campaign:Campaign,pb:Playbook,flag:string){const plays:{play:Play;sessionId?:string;index:number}[]=[];campaign.sessions.forEach((s,index)=>{for(const b of s.branches)if(b.when?.some(c=>c.flag===flag))plays.push({play:b,sessionId:s.id,index})});for(const b of pb.anytime)if(b.when?.some(c=>c.flag===flag))plays.push({play:b,index:-1});const endings=pb.endings.filter(e=>e.requires.some(r=>r.when.some(c=>c.flag===flag)||r.routes?.some(x=>x.when?.some(c=>c.flag===flag))));const encounters=pb.encounters.filter(e=>e.when?.some(c=>c.flag===flag));return {plays,endings,encounters}}
// Before and after a set of changes: plays that open, plays that close, and endings whose requirements move.
export function ripple(campaign:Campaign,pb:Playbook,changes:{flag:string;to:FlagValue}[],fromIndex=-1){const before=stateOf(pb),after={...before};for(const c of changes)after[c.flag]=c.to;const touched=new Set(changes.map(c=>c.flag));const seen=new Set<string>(),opened:{play:Play;index:number}[]=[],closed:{play:Play;index:number}[]=[];
 for(const flag of touched)for(const d of dependents(campaign,pb,flag).plays){if(seen.has(d.play.id)||(d.index>=0&&d.index<fromIndex))continue;seen.add(d.play.id);const was=isPossible(pb,d.play,before),now=isPossible(pb,d.play,after);if(was&&!now)closed.push(d);if(!was&&now)opened.push(d)}
 const endings=pb.endings.filter(e=>e.requires.some(r=>r.when.some(c=>touched.has(c.flag)))).map(e=>({ending:e,before:e.requires.filter(r=>r.when.every(c=>holds(c,before))).length,after:e.requires.filter(r=>r.when.every(c=>holds(c,after))).length,total:e.requires.length}));
 return {opened,closed,endings}}
// An ending is open when every requirement holds, and reached once its own closing state is recorded.
export function forecast(pb:Playbook){const s=stateOf(pb);return pb.endings.map(e=>{const reqs=e.requires.map(r=>({label:r.label,met:r.when.every(c=>holds(c,s)),routes:(r.routes||[]).filter(x=>!x.when||x.when.every(c=>holds(c,s))).map(x=>x.text)}));return {ending:e,reqs,met:reqs.filter(r=>r.met).length,open:reqs.every(r=>r.met),reached:!!e.reached?.length&&e.reached.every(c=>holds(c,s))}})}
export function clockAlerts(pb:Playbook){const s=stateOf(pb);return pb.flags.filter(f=>!f.options&&f.thresholds?.length).flatMap(f=>{const v=Number(s[f.id]||0);const next=f.thresholds!.find(t=>t.at>v),reached=[...f.thresholds!].reverse().find(t=>t.at<=v);return [...(reached?[{flag:f,value:v,at:reached.at,text:reached.text,state:'reached' as const}]:[]),...(next&&next.at-v<=1?[{flag:f,value:v,at:next.at,text:next.text,state:'next' as const}]:[])]})}
export function stateSummary(pb:Playbook){const s=stateOf(pb);return pb.flags.filter(f=>s[f.id]!==f.initial).map(f=>f.label+': '+valueLabel(pb,f.id,s[f.id])).slice(0,60)}

const words=(t:string)=>t.toLowerCase().match(/[\p{L}\p{N}']+/gu)||[];
// Search for "what did they just do": keywords and titles weigh most, then the response text.
export function searchPlays(query:string,plays:Play[]){const q=words(query).filter(w=>w.length>1);if(!q.length)return [];return plays.map(p=>{const title=words(p.title),keys=words(p.keywords||''),body=words([p.response,p.why,p.tells||'',p.consequence].join(' '));let score=0;for(const w of q){if(keys.some(k=>k===w))score+=5;else if(keys.some(k=>k.startsWith(w)))score+=3;if(title.some(k=>k===w))score+=4;else if(title.some(k=>k.startsWith(w)))score+=2;if(body.some(k=>k.startsWith(w)))score+=1}return {play:p,score}}).filter(r=>r.score>=Math.min(4,q.length*2)).sort((a,b)=>b.score-a.score).map(r=>r.play)}

// 2024 Dungeon Master's Guide: XP by challenge rating, and the XP budget per character by level (Low, Moderate, High).
export const XP_BY_CR:Record<string,number>={'0':10,'1/8':25,'1/4':50,'1/2':100,'1':200,'2':450,'3':700,'4':1100,'5':1800,'6':2300,'7':2900,'8':3900,'9':5000,'10':5900,'11':7200,'12':8400,'13':10000,'14':11500,'15':13000,'16':15000,'17':18000,'18':20000,'19':22000,'20':25000};
export const BUDGET:[number,number,number][]=[[50,75,100],[100,150,200],[150,225,400],[250,375,500],[500,750,1100],[600,1000,1400],[750,1300,1700],[1000,1700,2100],[1300,2000,2600],[1600,2300,3100],[1900,2900,4100],[2200,3700,4700],[2600,4200,5400],[2900,4900,6200],[3300,5400,7800],[3800,6100,9800],[4500,7200,11700],[5000,8700,14200],[5500,10700,17200],[6400,13200,22000]];
export const encounterXP=(e:Encounter)=>e.creatures.reduce((n,c)=>n+(XP_BY_CR[c.cr]||0)*c.count,0);
export function partyBudget(levels:number[]){return levels.reduce((b,l)=>{const row=BUDGET[Math.max(1,Math.min(20,Math.round(l)))-1];return [b[0]+row[0],b[1]+row[1],b[2]+row[2]]},[0,0,0])}
export function difficulty(xp:number,levels:number[]){const [low,moderate,high]=partyBudget(levels);const band=!levels.length?'Unknown':xp<low*0.7?'Trivial':xp<moderate?'Low':xp<high?'Moderate':xp<=high*1.15?'High':'Beyond High';return {low,moderate,high,band}}
// The smallest count change that moves an encounter into each other 2024 band, using its most numerous, then cheapest, then last-listed creature
// (named leaders come first in a list, so the rank and file get scaled). A solo creature is never removed.
export function scaleOptions(e:Encounter,levels:number[]){if(!levels.length)return [];const xp=encounterXP(e),d=difficulty(xp,levels),c=e.creatures.map((x,i)=>({x,i})).sort((a,b)=>b.x.count-a.x.count||(XP_BY_CR[a.x.cr]||0)-(XP_BY_CR[b.x.cr]||0)||b.i-a.i)[0].x,unit=XP_BY_CR[c.cr]||0;if(!unit)return [];const floor=e.creatures.length>1?0:1;
 return ([['Low',d.low*0.7,d.moderate],['Moderate',d.moderate,d.high],['High',d.high,d.high*1.15+1]] as const).filter(([band])=>band!==d.band).flatMap(([band,min,max])=>{const delta=xp<min?Math.ceil((min-xp)/unit):Math.ceil((max-xp)/unit)-1;return delta&&c.count+delta>=floor&&xp+delta*unit>=min&&xp+delta*unit<max&&Math.abs(delta)<=12?[{band,delta,name:c.name}]:[]})}
// Expected level at the start of each chapter, from the v5 milestone list; the roster overrides it.
export function partyLevels(roster:RosterMember[]|undefined,brief?:Brief){if(roster?.length)return roster.map(r=>r.level);return brief?.level?[brief.level,brief.level,brief.level,brief.level]:[]}
export const crLabel=(cr:string)=>'CR '+cr;
// Revision 7.5 Tolls escalate: Heavy while fewer than two regional bells are rung, Grievous for the third and fourth, Ruinous after.
export const regionalBells=['vaer','ossa','calla','hieme','thrane','mirel'];
export function tollWeight(pb:Playbook){const rung=regionalBells.filter(b=>stateOf(pb)['bell_'+b]==='rung').length;return {rung,weight:rung<2?'Heavy':rung<4?'Grievous':'Ruinous'}}
// A play rings a bell when it sets a regional bell to rung.
export const ringsBell=(play:Play)=>!!play.effects?.some(e=>e.flag.startsWith('bell_')&&e.set==='rung');
