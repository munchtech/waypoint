import {styles,type Campaign} from './campaign';
// Observation counts are evidence, not probabilities or enjoyment scores.
export function partySignals(campaign:Campaign){
 const recent=campaign.events.slice(-20);
 return {sampleSize:recent.length,window:'Last 20 recorded outcomes in recording order',
  caveat:recent.length<5?'Limited history: use the current scene and stated preferences; do not claim a learned pattern.':'Actions show what happened; only explicit enjoyment ratings show what players liked.',
  styles:styles.map(style=>{const events=recent.filter(e=>e.style===style);return {style,statedPreference:campaign.preferences[style],observed:events.length,loved:events.filter(e=>e.enjoyment==='Loved it').length,lessOfThis:events.filter(e=>e.enjoyment==='Less of this').length,neutral:events.filter(e=>e.enjoyment==='Neutral').length,evidence:events.slice(-2).map(e=>({eventId:e.id,text:e.text,enjoyment:e.enjoyment}))}})};
}
export const responseSituations=[
 {label:'They negotiate',prompt:'The party wants to bargain instead of accepting the obvious route.',tip:'Ask what they offer. Give the NPC a concrete need, a concession, and a limit. Let a good offer change the situation.'},
 {label:'They miss the clue',prompt:'The party missed or misread an important clue.',tip:'Keep the essential information reachable through a different source. Change the cost or timing instead of repeating the same check.'},
 {label:'The roll fails',prompt:'A meaningful player check has failed.',tip:'State what changes: time, exposure, resources, or a new complication. Keep a next action available; avoid a dead end.'},
 {label:'They leave the plot',prompt:'The party walks away from the prepared hook.',tip:'Ask what they want to pursue. Let the unattended situation evolve visibly, and offer a new opening without forcing their return.'},
 {label:'They start a fight',prompt:'The party initiates an unexpected confrontation.',tip:'Clarify intent and stakes. Establish terrain, a retreat route, and what each opponent wants before choosing appropriate rules or creatures.'},
 {label:'They surprise me',prompt:'The party attempts an unexpected approach.',tip:'Clarify the intended result. Decide what is certain, what is risky, and what changes on success or failure. Reward a workable idea.'}
] as const;
