import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectEngine,generateLocal,makeComfyWorkflow,parseMaterial,validateLocalURL} from '../.sites-runtime/desktop-tests/local-engine.mjs';
assert.equal(validateLocalURL('http://127.0.0.1:8188'),'http://127.0.0.1:8188');
for(const url of ['https://example.com','http://192.168.1.1','file:///tmp','http://user:pass@localhost:8188'])assert.throws(()=>validateLocalURL(url));
assert.equal(makeComfyWorkflow('qwen_3_4b.safetensors','hello')['2'].inputs.prompt,'hello');
assert.throws(()=>parseMaterial('not json','prepare'));
const sample={title:'',summary:'',plan:'',arc:'',branches:[],events:[],cards:[{kind:'NPC',title:'Mara',body:'An apothecary.',readAloud:'Hello.',consequence:'An ally.'}]};
assert.equal(parseMaterial('```json\n'+JSON.stringify(sample)+'\n```','improvise').cards[0].title,'Mara');
assert.deepEqual(parseMaterial(JSON.stringify({cards:sample.cards,events:[{text:'Hallucinated event'}]}),'improvise').events,[]);
console.log('Passed: loopback-only destinations, workflow wiring, structured-output parsing, invalid-output rejection.');
if(process.argv.includes('--live')){const settings={provider:'comfyui',baseURL:'http://127.0.0.1:8188',model:'qwen_3_4b.safetensors',comfyInstall:'',autoStart:false};const status=await inspectEngine(settings);assert(status.models.includes(settings.model));console.log('ComfyUI connected; Qwen 3 4B is available.');const result=await generateLocal(settings,{mode:'improvise',kind:'NPC',prompt:'Create a brief apothecary NPC who has one useful clue about the missing courier. Keep the card under 150 words.',context:{campaign:{name:'The Hollow Crown',tone:'Mysterious',party:'Four level 3 adventurers',boundaries:'No harm to children'},confirmedEvents:['Captain Voss agreed to help the party search for the courier.']}},AbortSignal.timeout(240000));assert(result.cards.length);fs.writeFileSync('.sites-runtime/desktop-tests/live-result.json',JSON.stringify(result,null,2));console.log('Passed: live local text generation returned a valid NPC card: '+result.cards[0].title);}
