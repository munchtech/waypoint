import fs from 'node:fs';
import {generateLocal} from '../.sites-runtime/desktop-tests/local-engine.mjs';
const baseURL='http://127.0.0.1:8188';
const q=await fetch(baseURL+'/queue',{signal:AbortSignal.timeout(5000)}).then(r=>r.json());
if(q.queue_running?.length||q.queue_pending?.length){console.log('Skipped live check: existing ComfyUI jobs are active.');process.exit(0)}
const result=await generateLocal({provider:'comfyui',baseURL,model:'qwen_3_4b.safetensors',comfyInstall:'',autoStart:false},{mode:'improvise',kind:'DM response',prompt:'The party offers Captain Voss a night watch shift in exchange for supervised access to the sealed bell tower. What should I say and do next?',context:{requestedKind:'DM response',campaign:{name:'The Hollow Crown',tone:'Mysterious',party:'Four level 3 adventurers',boundaries:'No harm to children',twist:'None'},currentSession:{plan:'Voss sealed the tower to protect the village. He is cautious, not secretly evil.'},confirmedEvents:[{id:'e1',text:'Voss accepted the party as temporary watch volunteers.',style:'Roleplay',enjoyment:'Loved it'}],playerSignals:{sampleSize:1,caveat:'Limited history: do not infer a pattern.'}}},AbortSignal.timeout(180000));
fs.writeFileSync('.sites-runtime/desktop-tests/coach-live-result.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result.cards,null,2));
