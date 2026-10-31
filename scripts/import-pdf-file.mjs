import {Worker} from 'node:worker_threads';
import {DatabaseSync,backup} from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
const dbPath=path.join(process.env.APPDATA,'Waypoint','rules.sqlite');
if(process.argv[2]==='--sources'){const db=new DatabaseSync(dbPath,{readOnly:true});console.log(JSON.stringify(db.prepare("SELECT DISTINCT source FROM entries WHERE kind='PDF page'").all().map(r=>r.source)));db.close();}
else if(process.argv[2]==='--backup'){
 const db=new DatabaseSync(dbPath);const dest=path.join(path.dirname(dbPath),'rules-before-drive-'+Date.now()+'.sqlite');await backup(db,dest);db.close();console.log(JSON.stringify({backup:dest}));
}else{
 const worker=new Worker(path.resolve('desktop/build/pdf-worker.mjs'),{workerData:{file:path.resolve(process.argv[2])},resourceLimits:{maxOldGenerationSizeMb:768}});
 const failTimeout=()=>{clearTimeout(timer);clearTimeout(idleTimer);void worker.terminate();console.error('OCR page stalled for three minutes');process.exitCode=1};
 const timer=setTimeout(()=>{clearTimeout(idleTimer);failTimeout()},7200000);let idleTimer=setTimeout(failTimeout,180000);
 worker.on('message',m=>{
  if(m.progress){clearTimeout(idleTimer);idleTimer=setTimeout(()=>{clearTimeout(timer);failTimeout()},180000)}
  if(m.progress)fs.writeFileSync(path.resolve('.sites-runtime/active-book-ocr.json'),JSON.stringify({file:path.basename(process.argv[2]),...m.progress,updated:new Date().toISOString()}));
  if(m.error){clearTimeout(timer);clearTimeout(idleTimer);console.error(m.error);void worker.terminate();process.exitCode=1}
  if(m.result){clearTimeout(timer);clearTimeout(idleTimer);void worker.terminate();const db=new DatabaseSync(dbPath);db.exec('PRAGMA busy_timeout=15000');
   try{db.exec('BEGIN IMMEDIATE');const prefix=m.result.entries[0]?.id.match(/^pdf:[a-f0-9]{64}:/)?.[0];if(!prefix)throw new Error('Invalid PDF import');db.prepare('DELETE FROM entries WHERE id LIKE ?').run(prefix+'%');const put=db.prepare('INSERT OR REPLACE INTO entries VALUES(?,?,?,?,?,?,?)');for(const e of m.result.entries)put.run(e.id,e.name,e.kind,e.source,e.edition,[e.name,e.source,e.summary,e.body].join(' ').toLowerCase(),JSON.stringify(e));db.exec('COMMIT');console.log(JSON.stringify({passages:m.result.entries.length,pages:m.result.pages,skipped:m.result.skipped,ocrPages:m.result.ocrPages}));}
   catch(e){db.exec('ROLLBACK');console.error(e.message);process.exitCode=1}finally{db.close()}
  }
 });
 worker.on('error',e=>{clearTimeout(timer);clearTimeout(idleTimer);console.error(e.message);process.exitCode=1});
}
