import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {validateCampaign} from '../lib/campaign';

export type RestoreReason='opened'|'autosave'|'update';
export type RestorePoint={id:number;created:number;reason:RestoreReason;campaigns:{name:string;sessions:number}[];bytes:number};
export const RESTORE_INTERVAL=15*60*1000,RESTORE_RECENT=24,RESTORE_DAYS=14;
const dayKey=(time:number)=>{const d=new Date(time);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate()};
// Rows arrive newest first. Keep the newest RESTORE_RECENT, then the newest point of each earlier day for RESTORE_DAYS days.
export function prunedPoints(rows:{id:number;created:number}[]){const days=new Set<string>(),drop:number[]=[];rows.forEach((r,i)=>{if(i<RESTORE_RECENT)return;const day=dayKey(r.created);if(!days.has(day)&&days.size<RESTORE_DAYS&&!rows.slice(0,RESTORE_RECENT).some(n=>dayKey(n.created)===day))days.add(day);else drop.push(r.id)});return drop}

export class CampaignStore {
 private db:DatabaseSync;
 constructor(directory:string,private now:()=>number=Date.now){
  fs.mkdirSync(directory,{recursive:true});
  this.db=new DatabaseSync(path.join(directory,'waypoint.sqlite'));
  const version=this.db.prepare('PRAGMA user_version').get() as {user_version:number};if(version.user_version>1){this.db.close();throw new Error('This database was created by a newer Waypoint version. Use the newer app.')}
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY CHECK(id IN (1,2)), content TEXT NOT NULL); PRAGMA user_version=1;');
  // Restore points are an added table, so the schema version stays 1 and older builds still open this database.
  this.db.exec('CREATE TABLE IF NOT EXISTS restore_points (id INTEGER PRIMARY KEY AUTOINCREMENT, created INTEGER NOT NULL, reason TEXT NOT NULL, summary TEXT NOT NULL, content BLOB NOT NULL);');
  if(!this.read()){
   const legacy=path.join(directory,'campaigns.json');
   if(fs.existsSync(legacy)){
    const content=fs.readFileSync(legacy,'utf8');
    const data=JSON.parse(content);this.validate(data);
    const backup=path.join(directory,'campaigns.pre-v2.json');
    if(!fs.existsSync(backup))fs.writeFileSync(backup,content,{flag:'wx'});
    this.save(data);
    if(JSON.stringify(this.read())!==JSON.stringify(data))throw new Error('Campaign migration verification failed. Original JSON is preserved.');
   }
  }
  const current=this.currentContent();if(current)this.addPoint(current,'opened');
 }
 private currentContent(){return (this.db.prepare('SELECT content FROM snapshots WHERE id=1').get() as {content:string}|undefined)?.content}
 // Keep the state as it was before a burst of edits: on open, and on the first save after a quiet interval.
 private addPoint(content:string,reason:RestoreReason){const newest=this.db.prepare('SELECT content FROM restore_points ORDER BY created DESC, id DESC LIMIT 1').get() as {content:Uint8Array}|undefined;if(newest&&zlib.gunzipSync(newest.content).toString('utf8')===content)return;const campaigns=(JSON.parse(content) as {campaigns?:{name?:unknown;sessions?:unknown[]}[]}).campaigns||[];const summary=JSON.stringify(campaigns.map(c=>({name:String(c.name||'Untitled campaign'),sessions:Array.isArray(c.sessions)?c.sessions.length:0})));this.db.prepare('INSERT INTO restore_points(created,reason,summary,content) VALUES(?,?,?,?)').run(this.now(),reason,summary,zlib.gzipSync(content));this.prune()}
 private prune(){const rows=this.db.prepare('SELECT id,created FROM restore_points ORDER BY created DESC, id DESC').all() as {id:number;created:number}[];const drop=prunedPoints(rows);if(!drop.length)return;const remove=this.db.prepare('DELETE FROM restore_points WHERE id=?');for(const id of drop)remove.run(id)}
 // Kept on request, for example just before a campaign update pack changes saved content.
 keepPoint(reason:RestoreReason){const current=this.currentContent();if(!current)return false;this.addPoint(current,reason);return true}
 restorePoints():RestorePoint[]{return (this.db.prepare('SELECT id,created,reason,summary,length(content) AS bytes FROM restore_points ORDER BY created DESC, id DESC').all() as {id:number;created:number;reason:RestoreReason;summary:string;bytes:number}[]).map(r=>({id:r.id,created:r.created,reason:r.reason,campaigns:JSON.parse(r.summary),bytes:r.bytes}))}
 restorePoint(id:number){const row=this.db.prepare('SELECT content FROM restore_points WHERE id=?').get(id) as {content:Uint8Array}|undefined;if(!row)throw new Error('That restore point is no longer available.');return JSON.parse(zlib.gunzipSync(row.content).toString('utf8'))}
 private validate(value:unknown){const campaigns=(value as {campaigns?:unknown}|null)?.campaigns;if(!Array.isArray(campaigns)||!campaigns.length||!campaigns.every(validateCampaign))throw new Error('Campaign data is invalid. Original data has not been overwritten.');}
 read(){const row=this.db.prepare('SELECT content FROM snapshots WHERE id=1').get() as {content:string}|undefined;return row?JSON.parse(row.content):null;}
 save(value:unknown){this.validate(value);const content=JSON.stringify(value);const current=this.db.prepare('SELECT content FROM snapshots WHERE id=1').get() as {content:string}|undefined;if(current?.content===content)return;this.db.exec('BEGIN IMMEDIATE');try{const newest=this.db.prepare('SELECT created FROM restore_points ORDER BY created DESC LIMIT 1').get() as {created:number}|undefined;if(current&&(!newest||this.now()-newest.created>=RESTORE_INTERVAL))this.addPoint(current.content,'autosave');this.db.exec('INSERT OR REPLACE INTO snapshots SELECT 2,content FROM snapshots WHERE id=1');this.db.prepare('INSERT OR REPLACE INTO snapshots(id,content) VALUES(1,?)').run(content);this.db.exec('COMMIT')}catch(e){this.db.exec('ROLLBACK');throw e}}
 previous(){const row=this.db.prepare('SELECT content FROM snapshots WHERE id=2').get() as {content:string}|undefined;return row?JSON.parse(row.content):null;}
 close(){this.db.close()}
}
