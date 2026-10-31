import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {normalizeRules} from '../lib/rules-import';
import type {RuleEntry} from '../lib/rules';
export class RulesStore{
 private db:DatabaseSync;
 constructor(directory:string,starter?:string){
  this.db=new DatabaseSync(path.join(directory,'rules.sqlite'));
  this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY,name TEXT,kind TEXT,source TEXT,edition TEXT,search TEXT,content TEXT); CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT);');
  if(starter){const content=fs.readFileSync(starter,'utf8'),digest=createHash('sha256').update(content).digest('hex');
   const previous=this.db.prepare("SELECT value FROM meta WHERE key='starter-digest'").get() as {value:string}|undefined;
   if(previous?.value!==digest){this.importData([JSON.parse(content)],false);this.db.prepare("INSERT OR REPLACE INTO meta VALUES('starter-digest',?)").run(digest)}
  }
 }
 importData(packs:unknown[],overwrite=true){
  const all=packs.map(normalizeRules);const entries=all.flatMap(p=>p.entries);
  if(!entries.length)throw new Error('No supported entries found. Choose 5etools data JSON, not an index file. Inherited _copy entries must be exported with their full data.');
  if(entries.length>60000)throw new Error('Import at most 60,000 entries at a time.');
  return this.importEntries(entries,all.reduce((n,p)=>n+p.skipped,0),overwrite);
 }
 importEntries(entries:RuleEntry[],skipped=0,overwrite=true,pdfPrefix?:string){
  if(!entries.length||entries.length>60000)throw new Error('Import between 1 and 60,000 references at a time.');
  const put=this.db.prepare(`${overwrite?'INSERT OR REPLACE':'INSERT OR IGNORE'} INTO entries VALUES(?,?,?,?,?,?,?)`);
  let written=0;this.db.exec('BEGIN IMMEDIATE');try{if(pdfPrefix)this.db.prepare('DELETE FROM entries WHERE id LIKE ?').run(pdfPrefix+'%');for(const e of entries)written+=Number(put.run(e.id,e.name,e.kind,e.source,e.edition,[e.name,e.source,e.summary,e.body].join(' ').toLowerCase(),JSON.stringify(e)).changes);this.db.exec('COMMIT')}catch(e){this.db.exec('ROLLBACK');throw e}
  return {written,skipped:skipped,total:(this.db.prepare('SELECT count(*) AS n FROM entries').get() as {n:number}).n};
 }
 importPdf(entries:RuleEntry[]){
  const prefix=entries[0]?.id.match(/^pdf:[a-f0-9]{64}:/)?.[0];
  if(!prefix||entries.some(e=>!e.id.startsWith(prefix)))throw new Error('Invalid PDF references.');
  return this.importEntries(entries,0,true,prefix);
 }
 search(input:{query?:string;kind?:string;source?:string;edition?:string;offset?:number}){
  const clauses:string[]=[],params:string[]=[];
  for(const token of String(input.query||'').toLowerCase().slice(0,200).split(/\s+/).filter(Boolean).slice(0,10)){clauses.push("search LIKE ? ESCAPE '\\'");params.push('%'+token.replace(/[\\%_]/g,'\\$&')+'%')}
  for(const key of ['kind','source','edition'] as const)if(input[key]&&input[key]!=='All'){clauses.push(key+'=?');params.push(String(input[key]).slice(0,key==='source'?500:120))}
  const where=clauses.length?' WHERE '+clauses.join(' AND '):'';const offset=Math.max(0,Math.min(100000,Math.floor(Number(input.offset)||0)));
  const rows=this.db.prepare('SELECT content FROM entries'+where+' ORDER BY name COLLATE NOCASE,source LIMIT 50 OFFSET ?').all(...params,offset) as {content:string}[];
  return {entries:rows.map(r=>{const e=JSON.parse(r.content) as RuleEntry;return {...e,body:''}}),total:(this.db.prepare('SELECT count(*) AS n FROM entries'+where).get(...params) as {n:number}).n,offset,facets:{kinds:this.db.prepare('SELECT DISTINCT kind AS value FROM entries ORDER BY kind').all(),sources:this.db.prepare('SELECT DISTINCT source AS value FROM entries ORDER BY source').all(),editions:this.db.prepare('SELECT DISTINCT edition AS value FROM entries ORDER BY edition').all()}};
 }
 get(id:string){const row=this.db.prepare('SELECT content FROM entries WHERE id=?').get(id) as {content:string}|undefined;if(!row)throw new Error('Reference not found. Refresh the library.');return JSON.parse(row.content) as RuleEntry}
 close(){this.db.close()}
}
