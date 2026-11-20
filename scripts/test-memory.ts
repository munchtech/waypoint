import { responseSections } from '../lib/response-sections';
import { plainPreview } from '../lib/plain-text';
import { partySignals } from '../lib/party-signals';
import { importTranscript, timestamp, transcriptText } from '../lib/transcript-import';
import { SaveQueue } from '../lib/save-queue';
import { recordingSchema } from '../lib/recording-metadata';
import { transcriptSchema } from '../lib/transcript';
import { handoutSchema } from '../lib/memory';
import { applyReview, relatedEvidence } from '../lib/session-review';
import { audioRange, reviseTranscript } from '../lib/transcript';
import { searchCampaign, composePlayerHandout, playerFacts } from '../lib/campaign-search';
import { playerDocument } from '../lib/player-display';
import { generationContext } from '../lib/ai-context';
import { progressOf } from '../lib/generation-contract';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { demo, validateCampaign, campaignProblem, campaignsProblem } from '../lib/campaign';
import {
  emptyMemory,
  groundedProposals,
  acceptProposal,
  memoryContext,
  toggleLever,
  plannerLeverInstructions,
  addTableMarker,
  removeTableMarker,
  markersForSession,
} from '../lib/memory';
import {
  CampaignStore,
  prunedPoints,
  RESTORE_RECENT,
  RESTORE_DAYS,
} from '../desktop/campaign-store';
import { DatabaseSync } from 'node:sqlite';
import zlib from 'node:zlib';

const note = '[00:02:10] Voss claimed the king is dead. The party promised to investigate.';
const cards = [
  {
    title: 'Voss',
    kind: 'NPC',
    body: 'Voss claims the king is dead; the truth is unknown.',
    readAloud: 'Voss claimed the king is dead.',
  },
  {
    title: 'Unsupported',
    kind: 'Lore',
    body: 'The queen fled.',
    readAloud: 'The queen fled yesterday.',
  },
];
const candidates = groundedProposals([...cards, cards[0]], note);
assert.equal(candidates.length, 1);
assert.equal(
  candidates[0].body,
  cards[0].readAloud,
  'Initial wiki proposal must preserve exact evidence instead of AI embellishments',
);
let memory = emptyMemory();
memory.notes.push({
  id: 'source',
  title: 'Test notes',
  sessionId: demo.sessions[0].id,
  text: note,
  date: '2026-10-10',
  summary: '',
  proposals: candidates,
});
memory = acceptProposal(memory, 'source', candidates[0].id, 'Rumor', 'DM only');
assert.equal(memory.pages[0].status, 'Rumor');
assert.equal(memory.pages[0].sourceId, 'source');
assert.equal(
  acceptProposal(memory, 'source', candidates[0].id, 'Confirmed', 'Party knows').pages.length,
  1,
  'Repeated acceptance must not duplicate canon',
);
assert.equal(
  memoryContext({ ...demo, memory }, true).wiki.length,
  0,
  'DM secrets must be excluded from party context',
);
assert.equal(memoryContext({ ...demo, memory }).wiki[0].status, 'Rumor');
assert(validateCampaign({ ...demo, memory }));
assert(!validateCampaign({ ...demo, memory: { pages: 'invalid' } }));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waypoint-migration-test-'));
const initial = { version: 1, campaigns: [demo], active: demo.id, sessionId: demo.sessions[0].id };
fs.writeFileSync(path.join(dir, 'campaigns.json'), JSON.stringify(initial));
let store = new CampaignStore(dir);
assert.deepEqual(store.read(), initial);
assert(fs.existsSync(path.join(dir, 'campaigns.pre-v2.json')));
const upgraded = { ...initial, version: 2, campaigns: [{ ...demo, memory }] };
store.save(upgraded);
store.close();
store = new CampaignStore(dir);
assert.deepEqual(store.read(), upgraded);
assert.throws(() => store.save({ campaigns: [{ ...demo, memory: { notes: 'broken' } }] }));
assert.deepEqual(store.read(), upgraded);
store.close();
assert.deepEqual(
  JSON.parse(fs.readFileSync(path.join(dir, 'campaigns.json'), 'utf8')),
  initial,
  'Legacy save must remain untouched',
);
console.log(
  'Passed: verified quotes, deduplication, rumor preservation, secret filtering, invalid-backup rejection, migration, transaction validation, reopen persistence and original-save preservation.',
);

const publicPage = {
  ...memory.pages[0],
  id: 'public',
  title: 'Captain Voss',
  body: 'The party promised to return the courier.',
  visibility: 'Party knows' as const,
  status: 'Confirmed' as const,
  quote: 'PRIVATE QUOTE',
  sourceId: 'private-note',
  history: [
    {
      body: 'OLD SECRET',
      date: 'yesterday',
      status: 'Confirmed' as const,
      visibility: 'DM only' as const,
    },
  ],
};
const publicRumor = {
  ...publicPage,
  id: 'rumor',
  status: 'Rumor' as const,
  body: 'The king may be dead.',
};
const future = { ...publicPage, id: 'future', status: 'Planned' as const, body: 'FUTURE REVEAL' };
const searchCampaignFixture = {
  ...demo,
  memory: {
    ...memory,
    pages: [...memory.pages, publicPage, publicRumor, future],
    pins: ['public'],
    handouts: [],
  },
};
assert(
  searchCampaign(searchCampaignFixture, 'what did we promise Voss?').some(
    (hit) => hit.id === 'public',
  ),
);
assert(
  searchCampaign(searchCampaignFixture, 'Voss', 'Journal').every((hit) => hit.kind === 'Journal'),
);
const publicText = composePlayerHandout(searchCampaignFixture, [
  memory.pages[0].id,
  'public',
  'rumor',
  'future',
]);
assert(publicText.includes('Rumor'));
assert(!publicText.includes('FUTURE REVEAL'));
assert(!publicText.includes('PRIVATE QUOTE'));
assert(!publicText.includes('OLD SECRET'));
assert.equal(playerFacts(searchCampaignFixture, [memory.pages[0].id]).length, 0);
const markup = playerDocument({
  title: '<script>alert(1)</script>',
  body: '<img src=x onerror=alert(1)>',
});
assert(!markup.includes('<script>'));
assert(!markup.includes('<img'));
assert(markup.includes('&lt;script&gt;'));
assert.throws(
  () => playerDocument({ title: 'Bad', body: 'Text', campaign: demo }),
  'Player payload must reject campaign objects',
);
const many = Array.from({ length: 70 }, (_, i) => ({
  ...publicPage,
  id: 'other-' + i,
  title: 'Unrelated ' + i,
  body: 'A quiet village.',
  updated: '2026-10-11',
}));
const selectedContext = memoryContext(
  { ...demo, memory: { ...memory, pages: [...many, publicPage] } },
  false,
  'Captain Voss courier',
);
assert(
  selectedContext.wiki.some((p) => p.id === 'public'),
  'Relevant older pages must survive bounded context selection',
);
console.log(
  'Passed: cross-campaign-source search, category filters, public-only recap assembly, rumor labels, secret/source-history exclusion, HTML escaping, strict player payload and bounded relevant retrieval.',
);

assert.deepEqual(audioRange('bytes=2-5', 10), { start: 2, end: 5, status: 206 });
assert.deepEqual(audioRange('bytes=-4', 10), { start: 6, end: 9, status: 206 });
assert.deepEqual(audioRange('bytes=8-99', 10), { start: 8, end: 9, status: 206 });
for (const range of ['bytes=10-', 'bytes=5-2', 'bytes=-0', 'bytes=0-1,3-4', 'garbage'])
  assert.throws(() => audioRange(range, 10));
const transcript = { segments: [{ start: 0, end: 3, text: 'Captain Boss' }] };
const corrected = reviseTranscript(transcript, {
  revision: 0,
  segments: [{ start: 0, end: 3, text: 'Captain Voss', speaker: 'Mara' }],
});
assert.equal(corrected.revision, 1);
assert.equal(corrected.segments[0].speaker, 'Mara');
assert.equal(transcript.segments[0].text, 'Captain Boss');
assert.throws(() => reviseTranscript(corrected, transcript));
assert.throws(() =>
  reviseTranscript(transcript, { segments: [{ start: 1, end: 3, text: 'changed' }] }),
);
console.log('Transcript revision and streaming range checks passed.');

const reviewMemory = emptyMemory();
reviewMemory.pages = [
  {
    id: 'voss',
    title: 'Captain Voss',
    aliases: 'Voss; Commander',
    kind: 'NPC',
    body: 'Voss guards the tower.',
    status: 'Confirmed',
    visibility: 'Party knows',
    sourceId: 'old-source',
    quote: 'guards the tower',
    updated: '2026-01-01',
    history: [],
  },
];
reviewMemory.notes = [
  {
    id: 'new-source',
    sessionId: 's',
    title: 'After the session',
    text: 'Voss fled the village.',
    date: '2026-01-02',
    summary: '',
    proposals: [
      {
        id: 'change',
        title: 'Voss',
        kind: 'NPC',
        body: 'Voss fled the village.',
        quote: 'Voss fled the village.',
        state: 'pending',
      },
    ],
  },
];
assert.equal(relatedEvidence(reviewMemory.notes[0].proposals[0], reviewMemory.pages)[0].id, 'voss');
assert.equal(
  relatedEvidence({ ...reviewMemory.notes[0].proposals[0], title: 'Vosson' }, reviewMemory.pages)
    .length,
  0,
);
const merged = applyReview(reviewMemory, 'new-source', 'change', 'voss', 'Rumor', 'DM only');
assert.equal(merged.pages.length, 1);
assert.equal(merged.pages[0].history[0].sourceId, 'old-source');
assert.equal(merged.pages[0].history[0].quote, 'guards the tower');
assert.equal(merged.pages[0].visibility, 'DM only');
assert.equal(merged.pages[0].status, 'Rumor');
assert.equal(merged.pages[0].sourceId, 'new-source');
assert.equal(merged.notes[0].proposals[0].appliedToExisting, true);
assert.equal(reviewMemory.pages[0].body, 'Voss guards the tower.');
assert.deepEqual(
  applyReview(merged, 'new-source', 'change', 'voss', 'Confirmed', 'Party knows'),
  merged,
);
assert.throws(() =>
  applyReview(reviewMemory, 'new-source', 'change', 'missing', 'Rumor', 'DM only'),
);
assert.equal(validateCampaign({ ...demo, memory: merged }), true);
const prioritized = {
  ...demo,
  memory: {
    ...emptyMemory(),
    pages: Array.from({ length: 45 }, (_, i) => ({
      ...reviewMemory.pages[0],
      id: 'thread' + i,
      updated: '2026-01-01',
    })),
    planner: { ...emptyMemory().planner, threadIds: ['thread44'] },
  },
};
assert.equal(memoryContext(prioritized).wiki[0].id, 'thread44');
console.log(
  'Session review matching, append history, privacy, repeat protection and prioritized threads passed.',
);

const queue = new SaveQueue(),
  writes: number[] = [];
let unblock!: () => void;
const first = queue.enqueue(async () => {
  await new Promise<void>((resolve) => {
    unblock = resolve;
  });
  writes.push(1);
});
const second = queue.enqueue(async () => {
  writes.push(2);
});
await Promise.resolve();
assert.deepEqual([...writes], []);
unblock();
await Promise.all([first, second]);
assert.deepEqual([...writes], [1, 2]);
await assert.rejects(
  queue.enqueue(async () => {
    throw new Error('disk full');
  }),
);
await queue.enqueue(async () => {
  writes.push(3);
});
assert.deepEqual([...writes], [1, 2, 3]);
const rid = '11111111-1111-4111-8111-111111111111';
const recording = {
  id: rid,
  campaignId: 'test',
  sessionId: 'test',
  title: 'Fixture',
  created: '2026-10-12',
  file: rid + '.wav',
  bytes: 12,
  chunks: 1,
  state: 'complete',
  markers: [],
};
assert(recordingSchema.safeParse(recording).success);
assert(!recordingSchema.safeParse({ ...recording, file: '../private.txt' }).success);
assert(!recordingSchema.safeParse({ ...recording, created: null }).success);
assert(!transcriptSchema.safeParse({ segments: [{ start: 2, end: 1, text: 'Invalid' }] }).success);
assert(
  !handoutSchema.safeParse({
    id: 'h',
    title: 'Too long',
    body: 'x'.repeat(30001),
    sourcePageIds: [],
    updated: '',
  }).success,
);
const recoveryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'waypoint-save-audit-'));
const recoveryStore = new CampaignStore(recoveryDir);
const stateA = { campaigns: [demo], active: demo.id, sessionId: demo.sessions[0].id };
const stateB = { ...stateA, campaigns: [{ ...demo, name: 'Updated name' }] };
recoveryStore.save(stateA);
recoveryStore.save(stateB);
recoveryStore.save(stateB);
assert.deepEqual(recoveryStore.previous(), stateA);
recoveryStore.close();
{
  // Restore points: kept on open and before the first save after a 15-minute gap, deduplicated, compressed, and pruned.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waypoint-restore-'));
  let now = Date.UTC(2026, 9, 22, 12);
  const state = (name: string) => ({
    version: 2,
    campaigns: [{ ...demo, name }],
    active: demo.id,
    sessionId: demo.sessions[0].id,
  });
  let rp = new CampaignStore(dir, () => now);
  assert.deepEqual(rp.restorePoints(), []);
  rp.save(state('A'));
  assert.equal(rp.restorePoints().length, 0, 'Nothing to keep before the first save');
  now += 1000;
  rp.save(state('B'));
  let points = rp.restorePoints();
  assert.equal(points.length, 1);
  assert.equal(points[0].reason, 'autosave');
  assert.deepEqual(
    rp.restorePoint(points[0].id),
    state('A'),
    'The point holds the state before the edit',
  );
  assert.deepEqual(points[0].campaigns, [{ name: 'A', sessions: demo.sessions.length }]);
  now += 5 * 60 * 1000;
  rp.save(state('C'));
  assert.equal(rp.restorePoints().length, 1, 'No point within 15 minutes');
  now += 15 * 60 * 1000;
  rp.save(state('D'));
  points = rp.restorePoints();
  assert.equal(points.length, 2);
  assert.deepEqual(rp.restorePoint(points[0].id), state('C'));
  assert(points[0].created > points[1].created, 'Newest first');
  assert.deepEqual(rp.previous(), state('C'), 'The previous snapshot is unchanged');
  assert(points[0].bytes < JSON.stringify(state('C')).length / 2, 'Points are compressed');
  assert.throws(() => rp.restorePoint(9999), /no longer available/);
  rp.close();
  rp = new CampaignStore(dir, () => now);
  points = rp.restorePoints();
  assert.equal(points.length, 3);
  assert.equal(points[0].reason, 'opened');
  assert.deepEqual(rp.restorePoint(points[0].id), state('D'));
  rp.close();
  rp = new CampaignStore(dir, () => now);
  assert.equal(rp.restorePoints().length, 3, 'Reopening without changes adds nothing');
  for (let i = 0; i < 40; i++) {
    now += 16 * 60 * 1000;
    rp.save(state('Edit ' + i));
  }
  points = rp.restorePoints();
  assert(
    points.length >= RESTORE_RECENT && points.length <= RESTORE_RECENT + RESTORE_DAYS,
    'Pruned to ' + points.length,
  );
  assert.deepEqual(rp.restorePoint(points[0].id), state('Edit 38'));
  rp.close();
  const db = new DatabaseSync(path.join(dir, 'waypoint.sqlite'));
  assert.equal(
    (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
    2,
  );
  db.close();
  const day = 24 * 3600 * 1000,
    base = Date.UTC(2026, 9, 22, 12),
    rows = [
      ...Array.from({ length: RESTORE_RECENT }, (_, i) => ({
        id: 1000 + i,
        created: base - i * 60000,
      })),
      ...Array.from({ length: 40 }, (_, i) => ({
        id: i,
        created: base - (Math.floor(i / 2) + 1) * day - (i % 2) * 60000,
      })),
    ];
  const drop = prunedPoints(rows);
  assert.equal(
    drop.length,
    40 - RESTORE_DAYS,
    'One point per earlier day for ' + RESTORE_DAYS + ' days',
  );
  assert(
    Array.from({ length: RESTORE_DAYS }, (_, d) => 2 * d).every((id) => !drop.includes(id)),
    'The newest point of each day is kept',
  );
  assert(!drop.some((id) => id >= 1000), 'The recent points are kept');
  console.log(
    'Restore points passed: kept on open and after a quiet interval, hold the pre-edit state, deduplicated, compressed, pruned to recent plus daily.',
  );
}
{
  // Rows: a version 1 database (one JSON snapshot and the one before it) upgrades to rows, keeping both saves and the
  // restore points, after a copy of the old file is kept beside it.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'waypoint-rows-'));
  const file = path.join(dir, 'waypoint.sqlite');
  const ferry = {
    ...demo,
    id: 'ferry',
    name: 'The Ferryman',
    events: [
      {
        id: 'e1',
        sessionId: demo.sessions[0].id,
        text: 'The party paid the Ferryman in tarnished coin.',
        style: 'Roleplay' as const,
        enjoyment: 'Loved it' as const,
        date: '2026-10-01',
      },
      {
        id: 'e2',
        sessionId: demo.sessions[0].id,
        text: 'Voss swore an oath at the café.',
        style: 'Roleplay' as const,
        enjoyment: 'Neutral' as const,
        date: '2026-10-02',
      },
    ],
    memory: { ...memory, pages: [...memory.pages] },
  };
  const before = { version: 2, campaigns: [demo], active: demo.id, sessionId: '' },
    current = { ...before, campaigns: [demo, ferry], active: 'ferry' };
  const old = new DatabaseSync(file);
  old.exec(
    'CREATE TABLE snapshots (id INTEGER PRIMARY KEY CHECK(id IN (1,2)), content TEXT NOT NULL); CREATE TABLE restore_points (id INTEGER PRIMARY KEY AUTOINCREMENT, created INTEGER NOT NULL, reason TEXT NOT NULL, summary TEXT NOT NULL, content BLOB NOT NULL); PRAGMA user_version=1;',
  );
  old
    .prepare('INSERT INTO snapshots VALUES(1,?),(2,?)')
    .run(JSON.stringify(current), JSON.stringify(before));
  old
    .prepare('INSERT INTO restore_points(created,reason,summary,content) VALUES(?,?,?,?)')
    .run(1, 'update', '[]', zlib.gzipSync(JSON.stringify(before)));
  old.close();
  let store = new CampaignStore(dir);
  assert.equal(
    JSON.stringify(store.read()),
    JSON.stringify(current),
    'Rebuilt exactly, key order included',
  );
  assert.deepEqual(store.previous(), before, 'The previous save survives the upgrade');
  const points = store.restorePoints();
  assert.equal(points.length, 2, 'The old point is kept and the opened state added');
  assert.deepEqual(store.restorePoint(points[1].id), before);
  assert(
    fs.existsSync(path.join(dir, 'waypoint-before-v2.sqlite')),
    'A copy of the old file is kept',
  );
  const copy = new DatabaseSync(path.join(dir, 'waypoint-before-v2.sqlite'));
  assert.equal(
    (copy.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
    1,
  );
  copy.close();
  // Incremental saves: one changed event writes one row, an added page writes the page and its campaign's list.
  const edited = structuredClone(current);
  edited.campaigns[1].events[0].text = 'The party paid the Ferryman in bone.';
  store.save(edited);
  assert.equal(store.lastWrite, 1);
  edited.campaigns[1].memory!.pages.push({
    ...memory.pages[0],
    id: 'new-page',
    title: 'Bone coin',
  });
  store.save(edited);
  assert.equal(store.lastWrite, 2);
  store.save(edited);
  assert.equal(store.lastWrite, 0, 'An identical save writes nothing');
  edited.active = demo.id;
  store.save(edited);
  assert.equal(store.lastWrite, 1, 'Only the root row holds which campaign is open');
  assert.deepEqual(store.previous(), { ...edited, active: 'ferry' });
  // Full-text search: prefixes, every word, accents ignored, and other campaigns only when asked.
  const titles = (q: string, exclude?: string) =>
    store.search(q, { exclude }).map((h) => h.kind + ':' + h.id);
  assert.deepEqual(titles('ferry bone'), ['event:e1']);
  assert.deepEqual(titles('cafe'), ['event:e2']);
  assert.deepEqual(titles('bone'), ['page:new-page', 'event:e1'], 'Title matches rank first');
  assert.deepEqual(titles('ferryman', 'ferry'), []);
  assert.deepEqual(store.search('tarnished'), [], 'Replaced text leaves the index');
  assert.deepEqual(store.search('***'), []);
  edited.campaigns.pop();
  store.save(edited);
  assert.deepEqual(store.search('bone'), [], 'A removed campaign leaves the index');
  store.close();
  store = new CampaignStore(dir);
  assert.deepEqual(store.read(), edited);
  store.close();
  // A database from a newer Waypoint is left alone.
  const newer = new DatabaseSync(file);
  newer.exec('PRAGMA user_version=3');
  newer.close();
  assert.throws(() => new CampaignStore(dir), /newer Waypoint/);
  console.log(
    'Campaign rows passed: version 1 upgrade with both saves and restore points kept, a copy of the old file, single-row saves, previous save, full-text search, newer databases refused.',
  );
}
console.log(
  'Audit regressions passed: ordered writes, recovery after failure, preserved previous snapshot, invalid recording metadata, timestamps and handout limits.',
);

const importRecording = {
  id: 'recording-fixture',
  sessionId: 'session-demo',
  title: 'Test session',
};
const importData = {
  revision: 0,
  segments: [{ start: 0, end: 1, text: 'A promise was made.', speaker: 'Mara' }],
};
const importedNotes = importTranscript(importRecording, importData, []);
assert.equal(importedNotes.length, 1);
assert(importedNotes[0].text.includes('Mara: A promise was made.'));
assert.equal(importTranscript(importRecording, importData, importedNotes).length, 0);
assert.equal(
  importTranscript(importRecording, importData, [
    { ...importedNotes[0], id: 'recording-recording-fixture-0' },
  ]).length,
  0,
);
assert.equal(
  importTranscript(importRecording, { ...importData, revision: 1 }, importedNotes).length,
  1,
);
assert.throws(() =>
  importTranscript(importRecording, { segments: [{ start: 0, end: 1, text: '   ' }] }, []),
);
const longImport = importTranscript(
  importRecording,
  {
    segments: Array.from({ length: 10 }, (_, i) => ({
      start: i,
      end: i + 1,
      text: 'a'.repeat(10000),
    })),
  },
  [],
);
assert(longImport.length > 1);
assert(longImport.every((n) => n.text.length <= 28000));
assert.equal(
  longImport.map((n) => n.text).join(''),
  transcriptText({
    revision: 0,
    segments: Array.from({ length: 10 }, (_, i) => ({
      start: i,
      end: i + 1,
      text: 'a'.repeat(10000),
    })),
  }),
);
assert.equal(timestamp(25 * 3600 + 61), '25:01:01');
console.log(
  'Transcript import regressions passed: legacy deduplication, corrected revisions, speaker labels, empty speech, lossless splitting and long-duration timestamps.',
);

{
  const fixture = structuredClone(demo);
  fixture.events = Array.from({ length: 25 }, (_, i) => ({
    id: 'signal-' + i,
    sessionId: fixture.sessions[0].id,
    text: 'Observed action ' + i,
    style: 'Roleplay' as const,
    enjoyment: (i === 24 ? 'Loved it' : i === 23 ? 'Less of this' : 'Neutral') as
      | 'Loved it'
      | 'Less of this'
      | 'Neutral',
    date: new Date().toISOString(),
  }));
  const result = partySignals(fixture),
    roleplay = result.styles.find((s) => s.style === 'Roleplay')!;
  assert.equal(result.sampleSize, 20);
  assert.equal(roleplay.observed, 20);
  assert.equal(roleplay.loved, 1);
  assert.equal(roleplay.lessOfThis, 1);
  assert.equal(roleplay.neutral, 18);
  assert.equal(roleplay.evidence[1].eventId, 'signal-24');
  fixture.events = [];
  assert.match(partySignals(fixture).caveat, /Limited history/);
  console.log(
    'Party evidence passed: bounded recent history, separate observed/enjoyment signals, source IDs and sparse-history caveat.',
  );
}

{
  assert.deepEqual(responseSections('An unstructured response.'), [
    { label: '', text: 'An unstructured response.' },
  ]);
  const parts = responseSections(
    'Intro\nSAY NOW: Hello. ASK: What do you offer? IF THEY FAIL: Pay a cost. NEXT OPENING: Visit the well.',
  );
  assert.equal(parts.length, 5);
  assert.equal(parts[0].text, 'Intro');
  assert.equal(parts[2].text, 'What do you offer?');
  assert.equal(parts[4].text, 'Visit the well.');
  const pinned = structuredClone(demo);
  pinned.sessions[0].pinnedCardId = 'fixture';
  assert(validateCampaign(pinned));
  assert(!validateCampaign({ ...pinned, sessions: [{ ...pinned.sessions[0], pinnedCardId: 42 }] }));
  console.log(
    'Reference cards passed: labeled/plain text preservation and backward-compatible pin validation.',
  );
}

{
  const c = structuredClone(demo);
  c.sessions[0].debrief = {
    remember: 'They enjoyed bargaining',
    openQuestions: 'Who hired the courier?',
    nextFocus: 'Explore the well',
  };
  assert(validateCampaign(c));
  assert(validateCampaign(JSON.parse(JSON.stringify(c))));
  assert(
    !validateCampaign({
      ...c,
      sessions: [{ ...c.sessions[0], debrief: { remember: 42, openQuestions: '', nextFocus: '' } }],
    }),
  );
  assert(
    !validateCampaign({
      ...c,
      sessions: [
        {
          ...c.sessions[0],
          debrief: { remember: 'x'.repeat(3001), openQuestions: '', nextFocus: '' },
        },
      ],
    }),
  );
  console.log(
    'Session debrief validation passed: roundtrip, invalid type and oversized note rejection.',
  );
}
{
  // Problems name the field that is wrong, and the campaign it is in.
  assert.equal(campaignProblem(demo), null);
  assert.equal(campaignsProblem([demo]), null);
  const badStyle = structuredClone(demo);
  (badStyle.sessions[0].branches[2] as { style: string }).style = 'Fighting';
  assert.match(
    campaignProblem(badStyle)!,
    /^sessions\[0\]\.branches\[2\]\.style: Invalid enum value/,
  );
  const noTitle = { ...demo, sessions: [{ ...demo.sessions[0], title: undefined }] };
  assert.equal(campaignProblem(noTitle), 'sessions[0].title: Required');
  assert.equal(campaignsProblem([demo, noTitle]), '“The Hollow Crown” sessions[0].title: Required');
  assert.equal(
    campaignsProblem([{ ...noTitle, name: '' }]),
    'campaign 1 sessions[0].title: Required',
  );
  assert.equal(campaignsProblem([]), 'there are no campaigns in it');
  assert.match(
    campaignProblem({ ...demo, sessions: [] })!,
    /^sessions: Array must contain at least 1/,
  );
  assert.match(
    campaignProblem({ ...demo, preferences: { ...demo.preferences, Combat: Infinity } })!,
    /^preferences\.Combat:/,
  );
  assert.match(campaignProblem({ ...demo, memory: { pages: 'invalid' } })!, /^memory\./);
  assert.match(campaignProblem(null)!, /^Expected object, received null/);
  // Null entries are rejected instead of throwing, and fields Waypoint does not list are kept.
  assert(!validateCampaign({ ...demo, sessions: [null] }));
  assert(!validateCampaign({ ...demo, events: [null] }));
  assert(validateCampaign({ ...demo, laterField: { kept: true } }));
  assert(
    validateCampaign({
      ...demo,
      events: [
        {
          id: 'e',
          sessionId: 'session-demo',
          text: 'Bargained',
          style: 'Roleplay',
          enjoyment: 'Loved it',
          date: '2026-11-20',
          branchId: 'b1',
        },
      ],
    }),
  );
  console.log(
    'Campaign problems passed: field paths, campaign names, empty lists, limits, null entries and kept extra fields.',
  );
}
{
  // Generation context: the latest history plus older entries that match the request, in their original order.
  const base = structuredClone(demo);
  const sid = base.sessions[0].id;
  const events = Array.from({ length: 300 }, (_, i) => ({
    id: 'e' + i,
    sessionId: sid,
    text:
      i === 5 ? 'The party promised the ferryman a silver bell.' : 'Market day number ' + i + '.',
    style: 'Roleplay' as const,
    enjoyment: 'Neutral' as const,
    date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
  }));
  const cards = Array.from({ length: 40 }, (_, i) => ({
    id: 'c' + i,
    kind: 'NPC',
    title: i === 30 ? 'The Ferryman' : 'Stall keeper ' + i,
    body: 'Sells apples.',
    readAloud: '',
    consequence: '',
    source: 'AI generated',
  }));
  const big = { ...base, events, cards };
  const session = big.sessions[0];
  const asked = generationContext(big, session, 'ask', 'What did we promise the ferryman?');
  const ids = asked.confirmedEvents.map((e) => Number(e.id.slice(1)));
  // The latest 15, plus the one older event that matches; unrelated older events stay home.
  assert.equal(ids.length, 16);
  assert.ok(ids.includes(5), 'an old matching event is sent');
  assert.equal(ids.at(-1), 299, 'the latest event is always sent');
  assert.deepEqual(
    ids,
    [...ids].sort((a, b) => a - b),
    'events keep their order',
  );
  assert.equal(asked.savedDraftMaterial[0].title, 'The Ferryman');
  assert.equal(asked.savedDraftMaterial.length, 6);
  assert.deepEqual(asked.contextSelection.confirmedEvents, { included: 16, total: 300 });
  assert.ok(asked.wiki.length <= 30);
  assert.equal('ruleReferences' in asked.currentSession, false);

  const quick = generationContext(big, session, 'improvise', 'A ferryman stops the boat');
  assert.equal(quick.confirmedEvents.length, 13);
  assert.ok(quick.confirmedEvents.some((e) => e.id === 'e5'));
  for (const b of (quick.currentSession as { branches: object[] }).branches)
    assert.deepEqual(Object.keys(b), ['title', 'style']);

  const path = generationContext(big, session, 'path', session.plan);
  assert.equal('branches' in path.currentSession, false);
  assert.deepEqual(
    path.existingPaths,
    session.branches.map((b) => b.title),
  );

  // A small campaign is sent whole; extra fields from the caller are kept.
  const small = generationContext(base, session, 'prepare', session.plan, {
    twistIntensity: 'Subtle',
  });
  assert.equal(small.confirmedEvents.length, base.events.length);
  assert.equal((small as Record<string, unknown>).twistIntensity, 'Subtle');

  // Progress labels read from a streamed reply; a title counts once its closing quote has arrived.
  assert.equal(progressOf('', 'prepare'), 'Writing…');
  assert.equal(
    progressOf('{"title":"","summary":"x","plan":"Scene one', 'prepare'),
    'Writing the session notes…',
  );
  assert.equal(progressOf('{"branches":[{"title":"Barg', 'path'), 'Writing the paths…');
  assert.equal(
    progressOf('{"plan":"","branches":[{"title":"Bargain with \\"Voss\\"","style":"Ro', 'prepare'),
    'Writing path 1: Bargain with "Voss"',
  );
  assert.equal(
    progressOf('{"branches":[{"title":"A","why":""},{"title":"Refuse the hook","st', 'prepare'),
    'Writing path 2: Refuse the hook',
  );
  assert.equal(progressOf('{"branches":[{"title":"A"}],"cards":[', 'prepare'), 'Finishing up…');
  assert.equal(
    progressOf('{"cards":[{"kind":"NPC","title":"Mara","body":"', 'improvise'),
    'Writing card 1: Mara',
  );
  assert.equal(
    progressOf('{"summary":"","cards":[{"kind":"NPC","title":"Mara"', 'memory'),
    'Writing proposal 1: Mara',
  );
  assert.equal(progressOf('{"answer":"The', 'ask'), 'Writing the answer…');
  console.log(
    'Generation context passed: recent and matching events, matching material, per-task limits, path titles, progress labels.',
  );
}
{
  const base = emptyMemory();
  const session = demo.sessions[0];
  // Planner levers: tone choices replace each other, shape choices combine, unknown ids are ignored.
  let levers = toggleLever([], 'more-combat');
  levers = toggleLever(levers, 'more-mystery');
  assert.deepEqual(levers, ['more-mystery']);
  levers = toggleLever(levers, 'add-twist');
  levers = toggleLever(levers, 'two-hours');
  assert.deepEqual(levers, ['more-mystery', 'add-twist', 'two-hours']);
  assert.deepEqual(toggleLever(levers, 'more-mystery'), ['add-twist', 'two-hours']);
  assert.deepEqual(toggleLever(levers, 'unknown'), levers);
  const instructions = plannerLeverInstructions(['two-hours', 'unknown', 'more-combat']);
  assert.equal(instructions.length, 2);
  assert.match(instructions[0], /^Give combat more weight/);
  assert.match(instructions[1], /^Fit the plan into about two hours/);
  // Live markers: session-scoped, newest first, trimmed, removable.
  let memory = base;
  memory = addTableMarker(memory, {
    id: 'm1',
    sessionId: session.id,
    kind: 'Promise',
    text: '  Voss will send the letter  ',
    created: '2026-10-21T20:00:00.000Z',
  });
  memory = addTableMarker(memory, {
    id: 'm2',
    sessionId: 'other-session',
    kind: 'Ruling',
    text: '',
    created: '2026-10-21T20:01:00.000Z',
  });
  memory = addTableMarker(memory, {
    id: 'm3',
    sessionId: session.id,
    kind: 'Loved this',
    text: '',
    created: '2026-10-21T20:02:00.000Z',
  });
  assert.deepEqual(
    markersForSession(memory, session.id).map((k) => k.id),
    ['m3', 'm1'],
  );
  assert.equal(memory.markers?.[0].text, 'Voss will send the letter');
  memory = removeTableMarker(memory, 'm3');
  assert.deepEqual(
    markersForSession(memory, session.id).map((k) => k.id),
    ['m1'],
  );
  // Markers and levers pass the campaign schema; saves written before them still validate.
  const campaign = {
    ...demo,
    memory: { ...memory, planner: { ...memory.planner, levers: ['more-mystery'] } },
  };
  assert(validateCampaign(JSON.parse(JSON.stringify(campaign))));
  assert(validateCampaign({ ...demo, memory: { ...base } }));
  // Live markers are DM context for generation, and never reach player-safe context.
  const dmContext = memoryContext(campaign);
  assert.deepEqual(
    dmContext.tableMarkers.map((k) => k.kind),
    ['Promise', 'Ruling'],
  );
  assert.equal(dmContext.tableMarkers[0].session, session.title);
  assert.equal(dmContext.planningPreferences.leverInstructions.length, 1);
  assert.deepEqual(memoryContext(campaign, true).tableMarkers, []);
  assert.equal(
    JSON.stringify(memoryContext(campaign, true)).includes('Voss will send the letter'),
    false,
  );
  console.log(
    'Live marker and planner lever checks passed: session scoping, trimming, DM-only player context, schema compatibility.',
  );
}
{
  assert.equal(
    plainPreview('**Overall arc:** The party begins.'),
    'Overall arc: The party begins.',
  );
  assert.equal(
    plainPreview('*Revision 2. Rebuilt after an audit.*'),
    'Revision 2. Rebuilt after an audit.',
  );
  assert.equal(plainPreview('*Revision 2. Rebuilt after a cut'), 'Revision 2. Rebuilt after a cut');
  assert.equal(
    plainPreview('| Bargain | With | Terms |\n|---|---|---|\n| a | b | c |'),
    'Bargain · With · Terms a · b · c',
  );
  assert.equal(
    plainPreview('| Bargain | With | Terms |\n|---|---|---|\n| | | |\n| | | |'),
    'Bargain · With · Terms',
  );
  assert.equal(
    plainPreview('- [ ] Re-read the **Act** you are in\n- [x] Done'),
    'Re-read the Act you are in Done',
  );
  assert.equal(
    plainPreview('# Heading\n\n> quoted [link](http://x.y) text ~~old~~ `code`'),
    'Heading quoted link text old code',
  );
  assert.equal(plainPreview('snake_case_word and 2*3*4 stay'), 'snake_case_word and 2*3*4 stay');
  assert(
    plainPreview('word '.repeat(100), 40).endsWith('…') &&
      plainPreview('word '.repeat(100), 40).length <= 41,
  );
  assert.equal(plainPreview('Short text', 160), 'Short text');
  console.log(
    'Plain previews passed: emphasis, tables, task lists, links, open marks and truncation.',
  );
}
