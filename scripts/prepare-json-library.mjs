import fs from 'node:fs';
import path from 'node:path';
import {normalizeRules} from '../lib/rules-import.ts';
const folder=path.resolve('../../outputs/Waypoint-JSON');
const entries=new Map();let skipped=0,raw=0;
for(const file of fs.readdirSync(folder).filter(f=>f.endsWith('.json')&&f!=='import-report.json')){const data=JSON.parse(fs.readFileSync(path.join(folder,file),'utf8'));const result=normalizeRules(data);raw+=data.length;skipped+=result.skipped;for(const e of result.entries)entries.set(e.id,e);}
fs.writeFileSync('.sites-runtime/json-library-entries.json',JSON.stringify([...entries.values()]));
const report={raw,unique:entries.size,skipped,duplicates:raw-skipped-entries.size,sources:new Set([...entries.values()].map(e=>e.source)).size};fs.writeFileSync(path.join(folder,'import-report.json'),JSON.stringify(report,null,2));console.log(report);
