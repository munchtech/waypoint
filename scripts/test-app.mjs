import assert from 'node:assert/strict';
import {demo,validateCampaign,affinity} from '../.sites-runtime/campaign-tests/campaign.mjs';
assert(validateCampaign(demo),'Example campaign should pass the backup validator');
assert(!validateCampaign({...demo,sessions:[]}),'Empty sessions must not crash the UI on import');
assert(!validateCampaign({...demo,events:[{text:'untrusted'}]}),'Malformed events must be rejected');
const c=structuredClone(demo);c.events.push({id:'test',sessionId:'session-demo',text:'A negotiated solution',style:'Roleplay',enjoyment:'Loved it',date:new Date().toISOString()});
assert.equal(affinity(c,'Roleplay'),affinity(demo,'Roleplay')+2,'Positive feedback should affect the party compass');
c.events[0].enjoyment='Less of this';assert.equal(affinity(c,'Roleplay'),affinity(demo,'Roleplay')-1,'Negative feedback should reduce affinity');
c.events=[];assert.equal(affinity(c,'Roleplay'),affinity(demo,'Roleplay'),'Removing an event must remove its influence');
console.log('Passed: backup validation, malformed history rejection, preference learning, corrected history. No browser data was written.');
if(process.argv.includes('--api')){
 const request={mode:'improvise',prompt:'Create a concise nervous apothecary NPC with a clue about a missing courier. This is non-persistent test input.',kind:'NPC',context:{name:'The Hollow Crown',tone:'Mysterious',confirmedEvents:['The party earned the trust of Captain Voss.']}};
 const response=await fetch('http://127.0.0.1:5173/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)});
 const packet=await response.json();assert(response.ok,packet.error||'Generation request failed');assert(packet.cards.length>0);assert(packet.cards[0].body.length>0);console.log('Passed: live AI generation returned a structured NPC card. No campaign data was written.');
 const invalid=await fetch('http://127.0.0.1:5173/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'invalid'})});assert.equal(invalid.status,400);console.log('Passed: invalid generation requests are rejected.');
}
