// One entry for every routine check. Runs each step in order, keeps going after a failure, writes full logs and prints one summary.
//   node scripts/verify.mjs [--skip-build] [--quick] [--tour] [--only name,name] [--logs dir]
//   --quick skips the Electron steps; --tour adds the 29-state screenshot tour; --only runs steps whose name contains any given text.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')),'..');
const argv=process.argv.slice(2),flag=name=>argv.includes('--'+name),value=name=>{const i=argv.indexOf('--'+name);return i>=0?argv[i+1]:undefined};
const electron=path.join(root,'node_modules/electron/dist/electron.exe');
const logs=path.resolve(value('logs')||path.join(os.tmpdir(),'waypoint-verify-'+new Date().toISOString().replace(/[:.]/g,'-')));
fs.mkdirSync(logs,{recursive:true});
const lintIgnores=['dist','.next','desktop/build/**','.sites-runtime/**','.wrangler/**','.vinext/**'].flatMap(p=>['--ignore-pattern',p]);
const node=(name,args,opts={})=>({name,cmd:process.execPath,args,...opts});
const ui=(name,script,args=[],opts={})=>({name,cmd:electron,args:[path.join('scripts',script),...args],electron:true,...opts});
const steps=[
 node('typescript',['node_modules/typescript/bin/tsc','--noEmit'],{timeout:300000}),
 node('eslint',['node_modules/eslint/bin/eslint.js','.',...lintIgnores],{timeout:300000}),
 node('build',['scripts/build-desktop.mjs'],{build:true,timeout:300000}),
 node('memory tests',['.sites-runtime/memory-tests/test-memory.mjs']),
 node('rules tests',['.sites-runtime/rules-tests/test-rules.mjs']),
 node('local engine tests',['scripts/test-local-engine.mjs']),
 node('book text tests',['.sites-runtime/book-tests/test-book-text.mjs']),
 node('playbook tests',['.sites-runtime/playbook-tests/test-playbook.mjs']),
 ui('ai ui','test-ai-ui.cjs'),
 ui('seventh bell','test-seventh-bell.cjs'),
 ui('session editor ui','test-session-editor-ui.cjs'),
 ui('history ui','test-history-ui.cjs',['--disable-gpu']),
 ui('audit demo 1420','ui-audit.cjs',['--width','1420','--height','940','--fixture','demo']),
 ui('audit demo 900','ui-audit.cjs',['--width','900','--height','760','--fixture','demo']),
 ui('audit seventh bell 1420','ui-audit.cjs',['--width','1420','--height','940','--fixture','seventh-bell']),
 ui('audit seventh bell 900','ui-audit.cjs',['--width','900','--height','760','--fixture','seventh-bell']),
 ui('focus','ui-focus.cjs'),
 ui('announce','ui-announce.cjs'),
 ui('player','ui-player.cjs'),
 ui('restore points','ui-restore.cjs'),
 ui('foresight','ui-foresight.cjs',['--fixture',path.resolve(root,'../../outputs/The-Seventh-Bell-v5.waypoint.json'),'--out',path.join(logs,'foresight')]),
 // The tour runs on The Seventh Bell: the demo campaign has no wiki pages, so two reader states cannot be reached there.
 ...(flag('tour')?[ui('tour seventh bell','ui-tour.cjs',['--fixture','seventh-bell','--out',path.join(logs,'tour-seventh-bell')],{timeout:600000})]:[]),
];
const only=value('only')?.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
const selected=steps.filter(s=>!(flag('skip-build')&&s.build)&&!(flag('quick')&&s.electron)&&(!only||only.some(o=>s.name.includes(o))));

function runStep(step){
 return new Promise(resolve=>{
  const started=Date.now(),file=path.join(logs,step.name.replace(/\W+/g,'-')+'.log'),chunks=[];
  const child=spawn(step.cmd,step.args,{cwd:root,windowsHide:true,env:{...process.env,ELECTRON_RUN_AS_NODE:undefined}});
  const timer=setTimeout(()=>{chunks.push('\nVERIFY: timed out after '+(step.timeout||180000)/1000+' s\n');child.kill()},step.timeout||180000);
  child.stdout.on('data',d=>chunks.push(d.toString()));child.stderr.on('data',d=>chunks.push(d.toString()));
  child.on('error',e=>chunks.push('\nVERIFY: could not start: '+e.message+'\n'));
  child.on('close',code=>{clearTimeout(timer);const text=chunks.join('');fs.writeFileSync(file,text);
   const lines=text.replace(/\x1b\[[0-9;]*m/g,'').split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!/^\(node:\d+\)|ExperimentalWarning|--trace-warnings|^Node\.js v/.test(l));
   // A failing step shows its first error line; a passing one shows its closing summary.
   const last=(code!==0&&lines.find(l=>/error|assert|fail|timed out/i.test(l)))||lines.pop()||'';
   resolve({name:step.name,ok:code===0,code,seconds:(Date.now()-started)/1000,last,file})});
 });
}

const results=[];
for(const step of selected){
 process.stdout.write(step.name.padEnd(26)+' ');
 const r=await runStep(step);results.push(r);
 console.log((r.ok?'pass':'FAIL (exit '+r.code+')').padEnd(14)+r.seconds.toFixed(1).padStart(6)+' s  '+r.last.slice(0,110));
}
const failed=results.filter(r=>!r.ok);
console.log('\n'+(failed.length?failed.length+' of '+results.length+' steps failed:':'All '+results.length+' steps passed.')+' Logs: '+logs);
for(const r of failed)console.log('  '+r.name+': '+r.file);
process.exitCode=failed.length?1:0;
