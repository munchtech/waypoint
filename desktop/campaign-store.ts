import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { campaignsProblem } from '../lib/campaign';

// Campaigns are saved as rows: one per campaign, session, event, saved card, wiki page and note, and one per part of a
// campaign's memory and playbook. A save writes only the rows that changed, so an edit to one note rewrites that note
// rather than the whole save. A row holds its value with each child row replaced by a reference, so reading the rows
// back rebuilds the saved document exactly, key order included.

export type RestoreReason = 'opened' | 'autosave' | 'update';
export type RestorePoint = {
  id: number;
  created: number;
  reason: RestoreReason;
  campaigns: { name: string; sessions: number }[];
  bytes: number;
};
export type StoreHit = { campaign: string; kind: string; id: string; title: string; text: string };
export const RESTORE_INTERVAL = 15 * 60 * 1000,
  RESTORE_RECENT = 24,
  RESTORE_DAYS = 14;
const dayKey = (time: number) => {
  const d = new Date(time);
  return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
};
// Rows arrive newest first. Keep the newest RESTORE_RECENT, then the newest point of each earlier day for RESTORE_DAYS days.
export function prunedPoints(rows: { id: number; created: number }[]) {
  const days = new Set<string>(),
    drop: number[] = [];
  rows.forEach((r, i) => {
    if (i < RESTORE_RECENT) return;
    const day = dayKey(r.created);
    if (
      !days.has(day) &&
      days.size < RESTORE_DAYS &&
      !rows.slice(0, RESTORE_RECENT).some((n) => dayKey(n.created) === day)
    )
      days.add(day);
    else drop.push(r.id);
  });
  return drop;
}

// How the saved document divides into rows, by path. A list gets one row per item, keyed by the item's id; the object and
// array fields of a split object get one row each. Anything else stays inside its parent's row.
const layout: Record<string, { list: string } | 'split'> = {
  campaigns: { list: 'campaign' },
  'campaigns.sessions': { list: 'session' },
  'campaigns.events': { list: 'event' },
  'campaigns.cards': { list: 'card' },
  'campaigns.memory': 'split',
  'campaigns.memory.pages': { list: 'page' },
  'campaigns.memory.notes': { list: 'note' },
  'campaigns.memory.maps': { list: 'map' },
  'campaigns.memory.playbook': 'split',
};
const REF = '$row';
type Row = { campaign: string; kind: string; item: string; content: string };
const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const join = (key: string, field: string) => (key ? key + '/' + field : field);

export function rowsOf(document: unknown) {
  const rows = new Map<string, Row>();
  const walk = (value: unknown, shape: string, key: string, campaign: string): unknown => {
    const how = layout[shape];
    if (how && how !== 'split' && Array.isArray(value)) {
      const seen = new Set<string>();
      return value.map((item, i) => {
        const raw = isObject(item) && typeof item.id === 'string' && item.id ? item.id : '';
        let id = raw ? encodeURIComponent(raw) : '#' + i;
        while (seen.has(id)) id += '+';
        seen.add(id);
        const rowKey = key + ':' + id,
          owner = shape === 'campaigns' ? raw : campaign;
        rows.set(rowKey, {
          campaign: owner,
          kind: how.list,
          item: raw,
          content: JSON.stringify(fields(item, shape, rowKey, owner)),
        });
        return { [REF]: rowKey };
      });
    }
    if (how === 'split' && isObject(value))
      return Object.fromEntries(
        Object.entries(value).map(([field, v]) => {
          const sub = shape + '.' + field,
            rowKey = join(key, field);
          if (layout[sub]) return [field, walk(v, sub, rowKey, campaign)];
          if (!v || typeof v !== 'object') return [field, v];
          rows.set(rowKey, {
            campaign,
            kind: sub.slice('campaigns.'.length),
            item: '',
            content: JSON.stringify(v),
          });
          return [field, { [REF]: rowKey }];
        }),
      );
    return value;
  };
  const fields = (value: unknown, shape: string, key: string, campaign: string) =>
    isObject(value)
      ? Object.fromEntries(
          Object.entries(value).map(([field, v]) => {
            const sub = shape ? shape + '.' + field : field;
            return [field, layout[sub] ? walk(v, sub, join(key, field), campaign) : v];
          }),
        )
      : value;
  rows.set('root', {
    campaign: '',
    kind: 'root',
    item: '',
    content: JSON.stringify(fields(document, '', '', '')),
  });
  return rows;
}

// Rebuild the document from its rows. Only the root and campaign rows hold references.
export function documentOf(rows: Map<string, { kind: string; content: string }>) {
  const root = rows.get('root');
  if (!root) return null;
  const resolve = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(resolve);
    if (!isObject(value)) return value;
    const ref = value[REF];
    if (typeof ref === 'string' && Object.keys(value).length === 1) {
      const row = rows.get(ref);
      if (!row) throw new Error('The saved campaign is missing part of its data (' + ref + ').');
      const parsed = JSON.parse(row.content);
      return row.kind === 'campaign' ? resolve(parsed) : parsed;
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v)]));
  };
  return resolve(JSON.parse(root.content));
}

// What the search index holds for a row: its title, and every other piece of text except ids, dates and fixed labels
// (an event's style and rating, a page's kind, status and visibility), which would only clutter the match snippets.
const searchable = new Set(['session', 'event', 'card', 'page', 'note']);
const skipped =
  /^(id|date|created|updated|style|enjoyment|kind|status|visibility|source|state)$|Ids?$/;
function textOf(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => textOf(v, out));
  else if (isObject(value))
    for (const [k, v] of Object.entries(value)) if (!skipped.test(k)) textOf(v, out);
  return out;
}
function indexOf(content: string) {
  const value = JSON.parse(content) as Record<string, unknown>;
  const title = typeof value.title === 'string' ? value.title : '';
  return { title, body: textOf({ ...value, title: undefined }).join('\n') };
}

// Each step takes the database from one schema version to the next, inside one transaction.
const SCHEMA = 2;
const migrations: ((db: DatabaseSync) => void)[] = [
  // 1: the whole save as one snapshot, with the one before it, and restore points.
  (db) =>
    db.exec(
      'CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY CHECK(id IN (1,2)), content TEXT NOT NULL);' +
        'CREATE TABLE IF NOT EXISTS restore_points (id INTEGER PRIMARY KEY AUTOINCREMENT, created INTEGER NOT NULL, reason TEXT NOT NULL, summary TEXT NOT NULL, content BLOB NOT NULL);',
    ),
  // 2: one row per entity, the rows the last save replaced, and a full-text index. The snapshots move into rows.
  (db) => {
    db.exec(
      'CREATE TABLE IF NOT EXISTS restore_points (id INTEGER PRIMARY KEY AUTOINCREMENT, created INTEGER NOT NULL, reason TEXT NOT NULL, summary TEXT NOT NULL, content BLOB NOT NULL);' +
        'CREATE TABLE rows (key TEXT PRIMARY KEY, campaign TEXT NOT NULL, kind TEXT NOT NULL, item TEXT NOT NULL, content TEXT NOT NULL);' +
        'CREATE INDEX rows_by_campaign ON rows(campaign, kind);' +
        'CREATE TABLE previous_rows (key TEXT PRIMARY KEY, campaign TEXT NOT NULL, kind TEXT NOT NULL, item TEXT NOT NULL, content TEXT);' +
        "CREATE VIRTUAL TABLE search USING fts5(title, body, tokenize = 'unicode61 remove_diacritics 2');",
    );
    const snapshot = (id: number) =>
      (
        db.prepare('SELECT content FROM snapshots WHERE id=?').get(id) as
          | { content: string }
          | undefined
      )?.content;
    const current = snapshot(1),
      before = snapshot(2);
    if (current) {
      const rows = rowsOf(JSON.parse(current));
      writeRows(db, rows, new Map());
      if (JSON.stringify(documentOf(rows)) !== current)
        throw new Error(
          'The campaign upgrade could not be verified. Your data has not been changed.',
        );
      keepPrevious(db, before ? rowsOf(JSON.parse(before)) : new Map(), rows);
    }
    db.exec('DROP TABLE snapshots');
  },
];

// Write the rows that differ from `old`, delete the ones that are gone, and keep the search index in step.
function writeRows(db: DatabaseSync, rows: Map<string, Row>, old: Map<string, Row>) {
  const upsert = db.prepare(
      'INSERT INTO rows(key,campaign,kind,item,content) VALUES(?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET campaign=excluded.campaign, kind=excluded.kind, item=excluded.item, content=excluded.content RETURNING rowid',
    ),
    remove = db.prepare('DELETE FROM rows WHERE key=? RETURNING rowid'),
    unindex = db.prepare('DELETE FROM search WHERE rowid=?'),
    index = db.prepare('INSERT INTO search(rowid,title,body) VALUES(?,?,?)');
  let written = 0;
  for (const [key, row] of rows) {
    if (old.get(key)?.content === row.content) continue;
    const { rowid } = upsert.get(key, row.campaign, row.kind, row.item, row.content) as {
      rowid: number;
    };
    unindex.run(rowid);
    if (searchable.has(row.kind)) {
      const { title, body } = indexOf(row.content);
      index.run(rowid, title, body);
    }
    written++;
  }
  for (const key of old.keys()) {
    if (rows.has(key)) continue;
    const gone = remove.get(key) as { rowid: number } | undefined;
    if (gone) unindex.run(gone.rowid);
    written++;
  }
  return written;
}
// Remember what the last save replaced, so the save before it can be rebuilt and exported.
function keepPrevious(db: DatabaseSync, before: Map<string, Row>, after: Map<string, Row>) {
  db.exec('DELETE FROM previous_rows');
  const keep = db.prepare(
    'INSERT INTO previous_rows(key,campaign,kind,item,content) VALUES(?,?,?,?,?)',
  );
  for (const [key, row] of before)
    if (after.get(key)?.content !== row.content)
      keep.run(key, row.campaign, row.kind, row.item, row.content);
  for (const [key, row] of after)
    if (!before.has(key)) keep.run(key, row.campaign, row.kind, row.item, null);
}

export class CampaignStore {
  private db: DatabaseSync;
  private rows = new Map<string, Row>();
  /** How many rows the last save wrote or deleted. */
  lastWrite = 0;
  constructor(
    directory: string,
    private now: () => number = Date.now,
  ) {
    fs.mkdirSync(directory, { recursive: true });
    const file = path.join(directory, 'waypoint.sqlite');
    this.db = new DatabaseSync(file);
    const version = (this.db.prepare('PRAGMA user_version').get() as { user_version: number })
      .user_version;
    if (version > SCHEMA) {
      this.db.close();
      throw new Error('This database was created by a newer Waypoint version. Use the newer app.');
    }
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
    if (version < SCHEMA) this.migrate(version, directory);
    for (const row of this.db
      .prepare('SELECT key,campaign,kind,item,content FROM rows')
      .all() as (Row & {
      key: string;
    })[])
      this.rows.set(row.key, {
        campaign: row.campaign,
        kind: row.kind,
        item: row.item,
        content: row.content,
      });
    if (!this.rows.has('root')) {
      const legacy = path.join(directory, 'campaigns.json');
      if (fs.existsSync(legacy)) {
        const content = fs.readFileSync(legacy, 'utf8');
        const data = JSON.parse(content);
        this.validate(data);
        const backup = path.join(directory, 'campaigns.pre-v2.json');
        if (!fs.existsSync(backup)) fs.writeFileSync(backup, content, { flag: 'wx' });
        this.save(data);
        if (JSON.stringify(this.read()) !== JSON.stringify(data))
          throw new Error('Campaign migration verification failed. Original JSON is preserved.');
      }
    }
    const current = this.currentContent();
    if (current) this.addPoint(current, 'opened');
  }
  // An older database is copied beside itself first, so an older Waypoint can still be pointed at it.
  private migrate(from: number, directory: string) {
    if (from > 0) {
      const copy = path.join(directory, 'waypoint-before-v' + SCHEMA + '.sqlite');
      if (!fs.existsSync(copy)) this.db.exec("VACUUM INTO '" + copy.replace(/'/g, "''") + "'");
    }
    for (let version = from; version < SCHEMA; version++) {
      this.db.exec('BEGIN IMMEDIATE');
      try {
        migrations[version](this.db);
        this.db.exec('PRAGMA user_version=' + (version + 1));
        this.db.exec('COMMIT');
      } catch (e) {
        this.db.exec('ROLLBACK');
        this.db.close();
        throw e;
      }
    }
    // Give back the space the old snapshots used.
    if (from > 0) this.db.exec('VACUUM');
  }
  private currentContent() {
    const document = documentOf(this.rows);
    return document === null ? undefined : JSON.stringify(document);
  }
  // Keep the state as it was before a burst of edits: on open, and on the first save after a quiet interval.
  private addPoint(content: string, reason: RestoreReason) {
    const newest = this.db
      .prepare('SELECT content FROM restore_points ORDER BY created DESC, id DESC LIMIT 1')
      .get() as { content: Uint8Array } | undefined;
    if (newest && zlib.gunzipSync(newest.content).toString('utf8') === content) return;
    const campaigns =
      (JSON.parse(content) as { campaigns?: { name?: unknown; sessions?: unknown[] }[] })
        .campaigns || [];
    const summary = JSON.stringify(
      campaigns.map((c) => ({
        name: String(c.name || 'Untitled campaign'),
        sessions: Array.isArray(c.sessions) ? c.sessions.length : 0,
      })),
    );
    this.db
      .prepare('INSERT INTO restore_points(created,reason,summary,content) VALUES(?,?,?,?)')
      .run(this.now(), reason, summary, zlib.gzipSync(content));
    this.prune();
  }
  private prune() {
    const rows = this.db
      .prepare('SELECT id,created FROM restore_points ORDER BY created DESC, id DESC')
      .all() as { id: number; created: number }[];
    const drop = prunedPoints(rows);
    if (!drop.length) return;
    const remove = this.db.prepare('DELETE FROM restore_points WHERE id=?');
    for (const id of drop) remove.run(id);
  }
  // Kept on request, for example just before a campaign update pack changes saved content.
  keepPoint(reason: RestoreReason) {
    const current = this.currentContent();
    if (!current) return false;
    this.addPoint(current, reason);
    return true;
  }
  restorePoints(): RestorePoint[] {
    return (
      this.db
        .prepare(
          'SELECT id,created,reason,summary,length(content) AS bytes FROM restore_points ORDER BY created DESC, id DESC',
        )
        .all() as {
        id: number;
        created: number;
        reason: RestoreReason;
        summary: string;
        bytes: number;
      }[]
    ).map((r) => ({
      id: r.id,
      created: r.created,
      reason: r.reason,
      campaigns: JSON.parse(r.summary),
      bytes: r.bytes,
    }));
  }
  restorePoint(id: number) {
    const row = this.db.prepare('SELECT content FROM restore_points WHERE id=?').get(id) as
      | { content: Uint8Array }
      | undefined;
    if (!row) throw new Error('That restore point is no longer available.');
    return JSON.parse(zlib.gunzipSync(row.content).toString('utf8'));
  }
  private validate(value: unknown) {
    const problem = campaignsProblem((value as { campaigns?: unknown } | null)?.campaigns);
    if (problem)
      throw new Error(
        `Campaign data is invalid (${problem}). Original data has not been overwritten.`,
      );
  }
  read() {
    return documentOf(this.rows);
  }
  save(value: unknown) {
    this.validate(value);
    const rows = rowsOf(value),
      old = this.rows;
    const changed =
      rows.size !== old.size ||
      [...rows].some(([key, row]) => old.get(key)?.content !== row.content);
    this.lastWrite = 0;
    if (!changed) return;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const newest = this.db
        .prepare('SELECT created FROM restore_points ORDER BY created DESC LIMIT 1')
        .get() as { created: number } | undefined;
      if (old.has('root') && (!newest || this.now() - newest.created >= RESTORE_INTERVAL))
        this.addPoint(this.currentContent()!, 'autosave');
      keepPrevious(this.db, old, rows);
      this.lastWrite = writeRows(this.db, rows, old);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    this.rows = rows;
  }
  // The save before the latest one: the current rows with the ones that save replaced put back.
  previous() {
    if (!this.rows.has('root')) return null;
    const rows = new Map(this.rows);
    for (const row of this.db.prepare('SELECT key,kind,content FROM previous_rows').all() as {
      key: string;
      kind: string;
      content: string | null;
    }[]) {
      if (row.content === null) rows.delete(row.key);
      else rows.set(row.key, { campaign: '', kind: row.kind, item: '', content: row.content });
    }
    return documentOf(rows);
  }
  // Full-text search over sessions, events, saved cards, wiki pages and notes in every campaign. Each word matches as a
  // prefix, and all of them must appear.
  search(query: string, options: { exclude?: string; limit?: number } = {}): StoreHit[] {
    const words = (query.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).slice(0, 12);
    if (!words.length) return [];
    const match = words.map((w) => '"' + w + '"*').join(' ');
    return (
      this.db
        .prepare(
          "SELECT r.campaign, r.kind, r.item, search.title AS title, snippet(search, 1, '', '', '…', 24) AS text FROM search JOIN rows r ON r.rowid = search.rowid WHERE search MATCH ? AND r.campaign <> ? ORDER BY bm25(search, 4, 1) LIMIT ?",
        )
        .all(match, options.exclude || '', Math.min(Math.max(options.limit || 20, 1), 100)) as {
        campaign: string;
        kind: string;
        item: string;
        title: string;
        text: string;
      }[]
    ).map((r) => ({
      campaign: r.campaign,
      kind: r.kind,
      id: r.item,
      title: r.title,
      text: r.text,
    }));
  }
  close() {
    this.db.close();
  }
}
