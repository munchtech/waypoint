// Playbook and update-pack checks: run `node .sites-runtime/playbook-tests/test-playbook.mjs [campaign-backup.json]` after build-desktop.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PackFolders } from '../desktop/packs';
import { validateCampaign, demo, type Campaign } from '../lib/campaign';
import { cellCreatures, creatureByName, pageCreatures, statLine } from '../lib/combat';
import { memoryOf, wikiPage } from '../lib/memory';
import { shiftStanding, standingLabel, standingOf, standingText } from '../lib/standing';
import { addBeat, removeBeat, setGoal, threadOf, threadStatus, threadsDue } from '../lib/threads';
import { rosterSchema } from '../lib/playbook-schema';
import { neighborhood, webEdges } from '../lib/relationship-web';
import {
  ASSIST_BODY_LIMIT,
  applyProposal,
  attachmentType,
  canUndo,
  proposalsFor,
  undoProposal,
} from '../lib/assistant';
import { pageName } from '../lib/page-name';
import {
  PIN_LIMIT,
  fitted,
  newMap,
  newPin,
  pinName,
  pinsForPage,
  playerMap,
  titleFromFile,
  withPin,
  withoutPin,
} from '../lib/maps';
import { searchCampaign } from '../lib/campaign-search';
import {
  bestiaryOf,
  homebrewFrom,
  homebrewReference,
  HOMEBREW_BODY,
  HOMEBREW_LIMIT,
  withHomebrew,
  withoutHomebrew,
} from '../lib/homebrew';
import { validRuleReferences, type RuleEntry } from '../lib/rules';
import { applyUpdate, planUpdate, updatePackSchema } from '../lib/update-pack';
import {
  ringsBell,
  tollWeight,
  applyChanges,
  blockers,
  clockAlerts,
  difficulty,
  echoes,
  encounterXP,
  forecast,
  isPossible,
  partyBudget,
  rankPlays,
  resolveEffects,
  ripple,
  scaleOptions,
  searchPlays,
  sessionByRef,
  sessionTag,
  setFlag,
  stateOf,
  undoEntry,
} from '../lib/playbook';
import packJson from '../desktop/data/packs/seventh-bell-v7.json';
import {
  dueAfter,
  entryStatus,
  sendEntry,
  sentEntries,
  siteHtml,
  takeDown,
} from '../lib/player-site';
import {
  breakDue,
  breakNote,
  bringBacks,
  fightPlan,
  leastSpotlit,
  pace,
  planParts,
  rowScene,
  ruleUses,
  tableCard,
  timeline,
  withFightRoster,
} from '../lib/session-notes';
import { carryOver, lastWeLeftOff, recapEmpty, recapText } from '../lib/recap';
import { influenceDc, intelligenceOf } from '../lib/influence';
import { trackerStatus } from '../lib/trackers';
import { atQuery, backlinks, creatureEncounters, linkOptions, sharedIndex } from '../lib/backlinks';
import { splitMentions } from '../lib/wiki-mentions';
import { bookContents, bookFileName, bookParts } from '../lib/campaign-book';
import {
  campaignTables,
  dieInHead,
  dieInLabel,
  lootTemplate,
  rollOn,
  rollTable,
  rollText,
  rollTextPlain,
  rowRange,
  tablesInText,
} from '../lib/roll-tables';
import { diceLabel, diceSpec, parseDice, randomDie, rollAnnouncement, rollDice } from '../lib/dice';
import {
  NONE,
  OBSERVER,
  creatureStats,
  foundryBundle,
  foundryFileName,
  foundryId,
  foundryParts,
  foundrySummary,
} from '../lib/foundry-export';
import { foundryMacro } from '../lib/foundry-macro';

const pack = updatePackSchema.parse(packJson);
let failures = 0;
const test = (name: string, fn: () => void) => {
  try {
    fn();
    console.log('ok  ', name);
  } catch (e) {
    failures++;
    console.log('FAIL', name, '\n    ', e instanceof Error ? e.message : e);
  }
};
// Defaults to the v5 campaign in scripts/fixtures; pass a backup or restore-point export to check a live campaign.
const fallback = new URL('../../scripts/fixtures/seventh-bell-v5.waypoint.json', import.meta.url),
  backup = process.argv[2] || (fs.existsSync(fallback) ? fallback : '');
const base: Campaign = backup
  ? (JSON.parse(fs.readFileSync(backup, 'utf8')).campaigns as Campaign[]).find(
      (c) => c.id === 'the-seventh-bell-corvane-v5',
    )!
  : { ...demo, id: 'the-seventh-bell-corvane-v5', name: 'The Seventh Bell' };
const all = new Set(planUpdate(base, pack).map((p) => p.id));
const installed = applyUpdate(base, pack, all);
const pb = memoryOf(installed).playbook!;
// A live campaign may already have revision 7 installed and wiki entries sent; site checks that start from an empty wiki take those down first.
const fresh = !memoryOf(base).playbook,
  bare = sentEntries(installed).reduce((c, e) => takeDown(c, e.id), installed);
const guideHead = '## Running this session (new DM guide)';

test('the bundled pack parses and targets the Seventh Bell', () => {
  assert.equal(pack.id, 'seventh-bell-v7');
  assert.ok(pack.playbook);
});
test('installing produces a valid campaign', () => assert.ok(validateCampaign(installed)));
test('packs load from files, and a pack in the packs folder replaces the shipped one', () => {
  const user = fs.mkdtempSync(path.join(os.tmpdir(), 'waypoint-packs-'));
  try {
    const folders = new PackFolders(path.resolve('desktop/data/packs'), user);
    assert.deepEqual(
      folders.list().map((p) => [p.id, p.match.campaignIds]),
      [['seventh-bell-v7', ['the-seventh-bell-corvane-v5']]],
    );
    fs.writeFileSync(path.join(user, 'broken.json'), '{"kind":');
    fs.writeFileSync(path.join(user, 'notes.txt'), 'not a pack');
    fs.writeFileSync(
      path.join(user, 'override.json'),
      JSON.stringify({ ...pack, title: 'Revision 8' }),
    );
    fs.writeFileSync(
      path.join(user, 'other.json'),
      JSON.stringify({ ...pack, id: 'other', title: 'Other' }),
    );
    assert.deepEqual(
      folders.list().map((p) => p.title),
      ['Revision 8', 'Other'],
    );
    assert.equal(folders.get('seventh-bell-v7')?.title, 'Revision 8');
    assert.equal(folders.get('missing'), null);
    fs.rmSync(path.join(user, 'override.json'));
    assert.equal(folders.get('seventh-bell-v7')?.title, pack.title);
  } finally {
    fs.rmSync(user, { recursive: true, force: true });
  }
});
if (backup) {
  test('every planned change is ready on the live campaign (no conflicts)', () => {
    const plan = planUpdate(base, pack);
    assert.deepEqual(
      plan.filter((p) => p.status === 'conflict').map((p) => p.label + ': ' + p.detail),
      [],
    );
  });
  test('the IsoForge kits are gone, and the DM’s own text after them stays', () => {
    assert.doesNotMatch(
      JSON.stringify({
        s: installed.sessions.map((s) => s.plan),
        p: memoryOf(installed).pages,
        c: installed.cards,
      }),
      /isoforge/i,
    );
    const c = {
      ...base,
      sessions: base.sessions.map((s, i) =>
        i === 0 ? { ...s, plan: s.plan + '\n\nDM NOTE: Ila likes the fighter.' } : s,
      ),
    };
    const next = applyUpdate(c, pack, new Set(planUpdate(c, pack).map((p) => p.id)));
    assert.ok(next.sessions[0].plan.endsWith('DM NOTE: Ila likes the fighter.'));
    assert.doesNotMatch(next.sessions[0].plan, /IsoForge/);
  });
  test('Session 1 opens at Pellmoor Landing', () =>
    assert.match(installed.sessions[0].plan, /Pellmoor Landing comes into sight/));
  test('replaced wiki text moves to revision history', () => {
    const page = memoryOf(installed).pages.find((p) => p.id === 'sb-462b2b0d93fd03c2')!;
    assert.equal(page.title, 'PELLMOOR LANDING (Port)');
    assert.match(page.history[0].body, /About 300, mostly Ferry-folk/);
  });
  test('existing pages, cards and events are all kept, except what the pack retires', () => {
    const m0 = memoryOf(base),
      m1 = memoryOf(installed),
      gone = new Set([...(pack.remove?.pages || []), ...(pack.remove?.cards || [])]);
    for (const p of m0.pages)
      assert.equal(
        m1.pages.some((x) => x.id === p.id),
        !gone.has(p.id),
        p.title,
      );
    assert.equal(installed.cards.length, base.cards.filter((x) => !gone.has(x.id)).length);
    assert.equal(installed.events.length, base.events.length);
  });
  test('the DM’s own text says Heart, keeps the Tongues spell, and the chronicle keeps its words', () => {
    const words = (c: Campaign) =>
      JSON.stringify({
        p: memoryOf(c).pages.map((pg) => [pg.title, pg.body, pg.aliases]),
        s: c.sessions.map((s) => s.plan),
        k: c.cards,
      });
    if (fresh) assert.match(words(base), /Ossa's Tongue|Tongue/);
    assert.doesNotMatch(
      words(installed).replace(
        /Comprehend Languages or Tongues|Tongues spell|cast Tongues|casts Tongues/g,
        '',
      ),
      /Tongue/,
    );
    const c = {
      ...base,
      events: [
        {
          id: 'e',
          sessionId: base.sessions[0].id,
          text: 'They found the Tongue.',
          style: 'Roleplay' as const,
          enjoyment: 'Neutral' as const,
          date: '',
        },
      ],
    };
    const next = applyUpdate(c, pack, new Set(planUpdate(c, pack).map((p) => p.id)));
    assert.equal(next.events[0].text, 'They found the Tongue.');
  });
  test('unticking the rename leaves the DM’s text alone', () => {
    const ids = new Set(
      planUpdate(base, pack)
        .map((p) => p.id)
        .filter((id) => id !== 'terms'),
    );
    const next = applyUpdate(base, pack, ids);
    assert.match(JSON.stringify(memoryOf(next).pages), /Tongue/);
    assert.ok(validateCampaign(next));
  });
  // A table that installed revision 6 with Waypoint 1.34 and played on: revision 7 must install over it without conflicts and keep what they recorded.
  const v6file = new URL(
    '../../scripts/fixtures/seventh-bell-v6.waypoint-pack.json',
    import.meta.url,
  );
  if (fs.existsSync(v6file))
    test('installs cleanly over revision 6, keeping recorded state, history and the DM’s notes', () => {
      const v6 = updatePackSchema.parse(JSON.parse(fs.readFileSync(v6file, 'utf8')));
      let c = applyUpdate(base, v6, new Set(planUpdate(base, v6).map((p) => p.id)));
      const m = memoryOf(c);
      c = {
        ...c,
        sessions: c.sessions.map((s, i) =>
          i === 0 ? { ...s, plan: s.plan + '\n\nDM NOTE: Ila likes the fighter.' } : s,
        ),
        memory: {
          ...m,
          playbook: applyChanges(m.playbook!, [{ flag: 'quill', from: 'routine', to: 'bribed' }], {
            sessionId: c.sessions[0].id,
            title: 'They bribe Quill',
            playId: 's01-bribe-quill',
          }),
        },
      };
      const plan = planUpdate(c, pack);
      assert.deepEqual(
        plan.filter((p) => p.status === 'conflict').map((p) => p.label + ': ' + p.detail),
        [],
      );
      const next = applyUpdate(c, pack, new Set(plan.map((p) => p.id)));
      const pb7 = memoryOf(next).playbook!;
      assert.equal(pb7.version, '7.23');
      assert.equal(stateOf(pb7).quill, 'bribed');
      assert.equal(pb7.log.length, 1);
      assert.ok(next.sessions[0].plan.endsWith('DM NOTE: Ila likes the fighter.'));
      assert.ok(validateCampaign(next));
      assert.deepEqual(
        planUpdate(next, pack)
          .filter((p) => p.status === 'ready')
          .map((p) => p.id),
        [],
      );
    });
  test('installing twice changes nothing more', () => {
    const again = applyUpdate(
      installed,
      pack,
      new Set(planUpdate(installed, pack).map((p) => p.id)),
    );
    assert.deepEqual(
      planUpdate(installed, pack)
        .filter((p) => p.status === 'ready')
        .map((p) => p.id),
      [],
    );
    assert.equal(JSON.stringify(again), JSON.stringify(installed));
  });
  test('each Act I plan gets its new-DM guide once, after the plan', () => {
    for (const [i, end] of [
      [0, 'Who was singing?"'],
      [1, 'which opens Session 3.'],
      [2, 'Stormborn included.'],
    ] as const) {
      const plan = installed.sessions[i].plan,
        at = plan.indexOf(guideHead);
      assert.ok(at > plan.indexOf(end), installed.sessions[i].title);
      assert.equal(plan.split(guideHead).length, 2);
    }
  });
  // Revisions 7.9 and 7.13 to 7.15: Sessions 4 to 30 get the full guide, in the Act I format with its table card built in.
  test('Sessions 4 to 30 each get one guide with Bring it back lines, a break, a table card and real play links', () => {
    const plays = new Set(
      [...installed.sessions.flatMap((s) => s.branches), ...pb.anytime].map((p) => p.id),
    );
    const guided = [
      'sb-0408eb3a9ef383eb',
      'sb-879a0d8936c67231',
      'sb-173cd869f38cc637',
      'sb-159e9351d101d536',
      'sb-e6aca23e4a267d72',
      'sb-3b8d18ebd647c28a',
      'sb-578cbd5020d97b1f',
      'sb-0c7fc8fe12e71ad5',
      'sb-8a9134f39dcce6b4',
      'sb-f40bf272eb1b252f',
      'sb-7b8acacf7aaa51b8',
      'sb-897e70317077e42d',
      'sb-65a7d51b78a8d14d',
      'sb-4a1554713c1ac7c1',
      'sb-3b3f7af5135fd7d2',
      'sb-93be53f2a6747fe1',
      'sb-42bb15639f8889ad',
      'sb-f0b728a69d395cb2',
      'sb-ad6ec717a7e06917',
      'sb-abff956ca382268b',
      'sb-5a3ec12d1d59e95c',
      'sb-24c29d78b60ca13f',
      'sb-742e25b3e3af8fbf',
      'sb-007cc9c6ed7fecff',
      'sb-dce15a8ce35d16ab',
      'sb-8272ccffe0002037',
      'sb-2fce596a41a06436',
      'sb-b2b43775bb66b9c5',
      'sb-5c4fc37d597122e9',
    ].map((id) => installed.sessions.find((s) => s.id === id)!);
    // Act IV's roads share a number: 16A to 19A is Brassfall, 16B to 19B Vael Tor. Sessions 28 to 30 share one guide.
    const roads = ['16A', '16B', '17A', '17B', '18A', '18B', '19A', '19B'];
    for (const [i, s] of guided.entries()) {
      assert.equal(s.plan.split(guideHead).length, 2, s.title);
      assert.match(
        s.plan,
        new RegExp(
          '### Opening recap \\(Session ' + (roads[i - 12] ?? (i < 12 ? i + 4 : i)) + '\\)',
        ),
      );
      assert.ok(bringBacks(s.plan).length >= 3, s.title);
      assert.ok(breakNote(s.plan).length > 20, s.title);
      assert.ok(timeline(s.plan).length >= 5, s.title);
      const card = tableCard(s.plan);
      assert.match(card, /^## Table card/);
      assert.ok(card.length < 4000, s.title + ' card is ' + card.length);
      assert.doesNotMatch(card, /\(play:/);
      const links = [...s.plan.matchAll(/\]\(play:([^)\s]+)\)/g)].map((m) => m[1]);
      assert.ok(links.length >= 9, s.title);
      for (const id of links)
        assert.ok(plays.has(id) || plays.has(id.replace(/heart/g, 'tongue')), id);
    }
  });
  // The DM's table: revision 7 installed, wiki entries sent, choices recorded. 7.1 must offer only its new changes and keep all of that.
  // Revision 7.1 is this pack without the play links; 7.0 is it without the guides as well.
  const older = (version: string, keep: (e: { replace: string }) => boolean) => ({
    ...pack,
    sessions: pack.sessions!.map((s) => ({ ...s, edits: s.edits?.filter(keep) })),
    playbook: { ...pack.playbook!, version },
  });
  const v71 = older('7.1', (e) => !e.replace.includes('(play:')),
    v70 = older('7.0', (e) => !e.replace.includes('(play:') && !e.replace.includes(guideHead));
  test('every play link in the guides names a real play, and every If they… option has one; the links install over an installed 7.1', () => {
    const plays = new Set(
      [...installed.sessions.flatMap((s) => s.branches), ...pb.anytime].map((p) => p.id),
    );
    for (const s of installed.sessions.slice(0, 3))
      for (const [, id] of s.plan.matchAll(/\]\(play:([^)\s]+)\)/g))
        assert.ok(plays.has(id) || plays.has(id.replace(/heart/g, 'tongue')), id);
    assert.ok((installed.sessions[0].plan.match(/\(play:/g) || []).length > 20);
    for (const s of installed.sessions.slice(0, 3))
      assert.doesNotMatch(
        s.plan.slice(s.plan.indexOf(guideHead)),
        /^- \*\*…/m,
        s.title + ' has an If they… option with no play',
      );
    const c71 = applyUpdate(base, v71, new Set(planUpdate(base, v71).map((p) => p.id)));
    const plan = planUpdate(c71, pack);
    assert.deepEqual(
      plan.filter((p) => p.status === 'conflict').map((p) => p.label + ': ' + p.detail),
      [],
    );
    const next = applyUpdate(
      c71,
      pack,
      new Set(plan.filter((p) => p.status === 'ready').map((p) => p.id)),
    );
    for (const [i, s] of next.sessions.slice(0, 3).entries()) {
      assert.equal(s.plan.split(guideHead).length, 2);
      assert.equal(s.plan, installed.sessions[i].plan);
    }
  });
  test('the current revision installs over revision 7: the guides and the refresh are ready, sent wiki entries and recorded state stay', () => {
    let c = fresh ? applyUpdate(base, v70, new Set(planUpdate(base, v70).map((p) => p.id))) : base;
    const m = memoryOf(c);
    c = sendEntry(
      {
        ...c,
        memory: {
          ...m,
          playbook: applyChanges(
            m.playbook!,
            [{ flag: 'quill', from: String(stateOf(m.playbook!).quill), to: 'bribed' }],
            { sessionId: c.sessions[0].id, title: 'They bribe Quill', playId: 's01-bribe-quill' },
          ),
        },
      },
      { id: 'pw-test-sent', title: 'Ila Harrow', kind: 'Person', body: 'b' },
      c.sessions[0].id,
    );
    const sent = sentEntries(c).length,
      log = memoryOf(c).playbook!.log.length;
    const plan = planUpdate(c, pack);
    assert.deepEqual(
      plan.filter((p) => p.status === 'conflict').map((p) => p.label + ': ' + p.detail),
      [],
    );
    const ready = plan.filter((p) => p.status === 'ready').map((p) => p.id);
    assert.ok(ready.includes('playbook'));
    for (const s of c.sessions.slice(0, 3))
      assert.ok(
        ready.some((id) => id.startsWith('edit:' + s.id + ':')),
        s.title,
      );
    const next = applyUpdate(c, pack, new Set(ready));
    const pb71 = memoryOf(next).playbook!;
    assert.equal(pb71.version, '7.23');
    assert.equal(stateOf(pb71).quill, 'bribed');
    assert.equal(pb71.log.length, log);
    assert.equal(sentEntries(next).length, sent);
    for (const s of next.sessions.slice(0, 3)) assert.ok(s.plan.includes(guideHead), s.title);
    assert.ok(validateCampaign(next));
    assert.deepEqual(
      planUpdate(next, pack)
        .filter((p) => p.status === 'ready')
        .map((p) => p.id),
      [],
    );
  });
}
if (backup) {
  test('each Act I guide ends with one table card, and the notes bar finds it and the timeline', () => {
    for (const s of installed.sessions.slice(0, 3)) {
      assert.equal(s.plan.split('## Table card').length, 2, s.title);
      assert.ok(s.plan.indexOf('## Table card') > s.plan.indexOf(guideHead));
      const card = tableCard(s.plan);
      assert.match(card, /^## Table card/);
      assert.ok(card.length < 4000, s.title + ' card is ' + card.length);
      assert.doesNotMatch(card, /\(play:/);
    }
    const rows = timeline(installed.sessions[0].plan);
    assert.equal(rows.length, 6);
    assert.match(pace(rows, 30)!.now, /Scene 1/);
    assert.match(pace(rows, 30)!.next, /at 0:50$/);
    assert.ok(pace(rows, 215)!.over);
  });
  // Revision 7.8 and Waypoint 1.44 (docs/actual-play-study.md).
  test('each Act I guide has Bring it back lines and a break, and the notes bar reads them', () => {
    const [s1, s2, s3] = installed.sessions;
    assert.deepEqual(
      [s1, s2, s3].map((s) => bringBacks(s.plan).length),
      [5, 6, 7],
    );
    for (const s of [s1, s2, s3]) {
      for (const b of bringBacks(s.plan)) {
        assert.ok(b.scene && b.line, s.title);
        assert.doesNotMatch(b.line, /\*\*/);
      }
      assert.ok(breakNote(s.plan).length > 20, s.title);
      assert.equal(s.plan.split('**Bring it back.**').length - 1, bringBacks(s.plan).length);
    }
    assert.ok(bringBacks(s1.plan).every((b) => /^Scene \d+:/.test(b.scene)));
    const rows = timeline(s1.plan);
    assert.ok(!breakDue(rows, 30) && breakDue(rows, 100) && !breakDue(rows, 150));
    assert.equal(rowScene('Scenes 4 and 5: the crossing'), 4);
    assert.equal(rowScene('The closing question'), null);
    assert.match(s2.plan, /### Opening recap \(Session 2\)/);
    assert.match(s3.plan, /### Opening recap \(Session 3\)/);
    assert.equal(installed.sessions.filter((s) => /### Epilogue round/.test(s.plan)).length, 1);
    const zero = memoryOf(installed).pages.find((x) => x.id === 'sb-b61bdde01a01cdcf')!;
    assert.match(zero.body, /Silly and serious \(for you, not the players\)/);
  });
  test('session zero is a full guide in the wiki, within the page limit', () => {
    const p = memoryOf(installed).pages.find((x) => x.id === 'sb-b61bdde01a01cdcf')!;
    assert.match(p.body, /### Step 2: Safety and boundaries/);
    assert.match(p.body, /Off-limits/);
    assert.ok(p.body.length <= 12000);
    assert.equal(p.title, '1.4 Session Zero Script');
  });
}
test('Last we left off draws only from the session before, and names what was lost', () => {
  const at = '2026-11-20T21:05:00.000Z',
    c = {
      ...demo,
      events: [
        { id: 'e1', sessionId: 's1', text: 'The ferry burned', date: at },
        { id: 'e2', sessionId: 's0', text: 'Older news', date: at },
      ],
      memory: {
        ...memoryOf(demo),
        markers: [
          { id: 'm1', sessionId: 's1', kind: 'Heavy moment', text: '', created: at },
          {
            id: 'm2',
            sessionId: 's1',
            kind: 'Promise',
            text: 'Ila will find the boy',
            created: at,
          },
          {
            id: 'm3',
            sessionId: 's1',
            kind: 'Important moment',
            text: 'The ferry burned',
            created: at,
          },
        ],
        ledger: [
          {
            id: 'l1',
            character: 'Ila',
            kind: 'Toll',
            weight: 'Heavy',
            what: 'her mother’s name',
            bell: 'Ossa',
            sessionId: 's1',
            date: at,
          },
        ],
        bargains: [
          {
            id: 'b1',
            with: 'The Tidewarden',
            terms: 'one oar-stroke owed',
            status: 'Open',
            sessionId: 's1',
            date: at,
          },
          { id: 'b2', with: 'Mere', terms: 'settled', status: 'Kept', sessionId: 's1', date: at },
        ],
      },
    } as unknown as Campaign;
  const r = lastWeLeftOff(c, 's1');
  assert.deepEqual(r.happened, ['The ferry burned']);
  assert.equal(r.lost[0], 'Ila: her mother’s name (Ossa’s Toll)');
  assert.match(r.lost[1], /^A heavy moment you marked at .+, with no note$/);
  assert.deepEqual(r.owed, ['Ila will find the boy', 'The Tidewarden: one oar-stroke owed']);
  assert.match(recapText(r), /^Last we left off\n- The ferry burned\n\nWhat it cost\n/);
  assert.ok(recapEmpty(lastWeLeftOff(c, 'nothing')));
  const roster = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(leastSpotlit(roster, { a: 2, b: 1 }), [{ id: 'c' }]);
  assert.deepEqual(leastSpotlit(roster, {}), roster);
});
// 1.46: the wrap-up's notes and the Follow up markers carry into the next prep brief, never into the read-aloud recap.
if (backup)
  test('the tracker cards follow the ledger, the bargain log and the Tithe Clock', () => {
    const card = (c: Campaign, id: string) => c.cards.find((k) => k.id === id)!;
    const toll = card(installed, 'sb-628326040ad473fd'),
      deal = card(installed, 'sb-0e8a67a6dabcf49c'),
      tithe = card(installed, 'sb-2d085aa1b2576d17');
    assert.equal(toll.title, 'Toll Tracker');
    assert.ok(!toll.body.includes('No character has paid a Toll'));
    assert.equal(trackerStatus(installed, toll), 'no losses recorded');
    assert.equal(trackerStatus(installed, deal), 'no bargains recorded');
    assert.equal(trackerStatus(installed, tithe), '0 / 12');
    const m = memoryOf(installed),
      played = {
        ...installed,
        memory: {
          ...m,
          ledger: [
            {
              id: 'l1',
              character: 'Wren',
              kind: 'Toll',
              weight: 'Heavy',
              what: 'Her name',
              bell: 'Ossa',
              sessionId: 's',
              date: '',
            },
            {
              id: 'l2',
              character: 'Bram',
              kind: 'Mere',
              weight: '',
              what: 'A song',
              bell: '',
              sessionId: 's',
              date: '',
            },
          ],
          bargains: [
            {
              id: 'b1',
              with: 'Mother Sallow',
              terms: 'A favour',
              status: 'Open',
              sessionId: 's',
              date: '',
            },
          ],
          playbook: { ...m.playbook!, state: { ...m.playbook!.state, tithe_clock: 4 } },
        },
      } as unknown as Campaign;
    assert.equal(trackerStatus(played, toll), '2 losses recorded · 1 Toll');
    assert.equal(trackerStatus(played, deal), '1 bargain · 1 open');
    assert.equal(trackerStatus(played, tithe), '4 / 12');
    // The paper copies stop showing as open threads, and their links open Waypoint's own trackers.
    for (const id of ['sb-1a80bcc5dfb81835', 'sb-7fb85235497d244d', 'sb-bc7e324cd9b20ac1']) {
      const page = memoryOf(installed).pages.find((p) => p.id === id)!;
      assert.equal(page.status, 'Confirmed', page.title);
      assert.ok(/\(go:(memory-ledger|bargains|world-state)\)/.test(page.body), page.title);
      assert.ok(!page.body.includes('Players →'), page.title);
    }
    // A card the DM renamed keeps its name; the rename shows as a conflict instead.
    const renamed = {
      ...base,
      cards: base.cards.map((k) => (k.id === toll.id ? { ...k, title: 'My Tolls' } : k)),
    };
    const plan = planUpdate(renamed, pack);
    assert.equal(plan.find((p) => p.id === 'ktitle:' + toll.id)?.status, 'conflict');
    assert.equal(
      card(applyUpdate(renamed, pack, new Set(plan.map((p) => p.id))), toll.id).title,
      'My Tolls',
    );
    // Installing again changes nothing.
    assert.ok(
      planUpdate(installed, pack)
        .filter((p) => /^(ktitle|kedit|ktrack|pstatus|pquote|paliases):/.test(p.id))
        .every((p) => p.status === 'applied'),
    );
  });
if (backup)
  test('every In Waypoint pointer names a menu that exists, and nothing says the campaign is unplayed', () => {
    const m = memoryOf(installed),
      texts = [
        ...m.pages.map((p) => [p.title, p.body, p.quote || '']),
        ...installed.sessions.map((s) => [s.title, s.plan]),
        ...installed.cards.map((k) => [k.title, k.body]),
        [JSON.stringify(m.playbook)],
      ].flat();
    for (const stale of [
      'Party & ledger',
      'Player handouts → Player site',
      'Foresight → World state',
      "party's compass",
      'unplayed campaign',
      'not yet entered.',
      'recorded yet',
    ])
      assert.ok(!texts.some((t) => t.includes(stale)), stale);
    const s1 = installed.sessions.find((s) => s.plan.includes('accept the three days'))!;
    assert.ok(s1.plan.includes('Record the bargain in the [Bargain log](go:bargains)'));
    const zero = m.pages.find((p) => p.id === 'sb-b61bdde01a01cdcf')!;
    assert.ok(
      zero.body.includes('**Campaign → Party & preferences → Roster:** press **Add character**'),
    );
    assert.ok(zero.body.includes('**Party & preferences → What your table enjoys**'));
    assert.ok(zero.body.includes('**Players → Player site → Send all**'));
  });
test('the carry-over keeps the DM notes and follow-ups out of the recap', () => {
  const at = '2026-11-20T21:05:00.000Z',
    c = {
      ...demo,
      events: [],
      sessions: [
        {
          ...demo.sessions[0],
          id: 's1',
          debrief: {
            remember: 'The duel landed',
            openQuestions: '',
            nextFocus: 'Give Ila a scene',
          },
        },
      ],
      memory: {
        ...memoryOf(demo),
        markers: [
          {
            id: 'f1',
            sessionId: 's1',
            kind: 'Follow up',
            text: 'Who paid the ferryman?',
            created: at,
          },
          { id: 'f2', sessionId: 's1', kind: 'Follow up', text: '', created: at },
          { id: 'f3', sessionId: 's2', kind: 'Follow up', text: 'Later', created: at },
        ],
      },
    } as unknown as Campaign;
  const k = carryOver(c, 's1');
  assert.deepEqual(k.notes, [
    ['What worked', 'The duel landed'],
    ['Next time', 'Give Ila a scene'],
  ]);
  assert.equal(k.followUps[0], 'Who paid the ferryman?');
  assert.match(k.followUps[1], /^A follow-up you marked at .+, with no note$/);
  assert.equal(k.followUps.length, 2);
  assert.ok(recapEmpty(lastWeLeftOff(c, 's1')));
});
// Revision 7.5: Tolls are warned (kind and weight), never stated exactly, and they escalate with every bell rung.
test('the Toll weight rises with the bells rung', () => {
  assert.deepEqual(tollWeight(pb), { rung: 0, weight: 'Heavy' });
  const two = ['ossa', 'vaer'].reduce((p, b) => setFlag(p, 'bell_' + b, 'rung', 'x'), pb);
  assert.equal(tollWeight(two).weight, 'Grievous');
  const four = ['calla', 'hieme'].reduce((p, b) => setFlag(p, 'bell_' + b, 'rung', 'x'), two);
  assert.equal(tollWeight(four).weight, 'Ruinous');
  assert.ok(ringsBell(installed.sessions[2].branches.find((b) => b.id === 's03-ring-ossa')!));
});
test('no play, brief or ending prices a Toll exactly or for a day', () => {
  const text = JSON.stringify({
    p: [
      ...installed.sessions.flatMap((s) => s.branches.filter((b) => b.origin === 'playbook')),
      ...pb.anytime,
    ],
    b: pb.briefs,
    e: pb.endings,
    w: pb.playerWiki,
  });
  for (const bad of [
    /state the Toll/i,
    /Toll[^"]{0,40}for (one|a) day/i,
    /Sense for one day/,
    /Fear for one day/,
    /tells you the price/i,
    /hear the price first/i,
  ])
    assert.doesNotMatch(text, bad);
});
if (backup)
  test('the Toll rules page, the Ring Table and the Act I guides warn rather than price', () => {
    const pages = memoryOf(installed).pages,
      page = (id: string) => pages.find((p) => p.id === id)!.body;
    assert.match(page('sb-579437dc048229b6'), /### The weight rises with every bell/);
    assert.match(page('sb-a23a83e518a41ee8'), /every morning for a year/);
    assert.doesNotMatch(page('sb-a23a83e518a41ee8'), /for one day/);
    for (const s of installed.sessions.slice(1, 3))
      assert.match(s.plan, /Ossa will take a memory of the dead from you, and it will be heavy/);
    assert.doesNotMatch(
      installed.sessions[2].plan,
      /The player chooses which memory; you never do/,
    );
  });
if (backup)
  test('every Act I play names a scene of its guide, so Possibilities can group them', () => {
    for (const s of installed.sessions.slice(0, 3))
      for (const b of s.branches.filter((b) => b.origin === 'playbook')) {
        assert.ok(b.scene, b.id + ' has no scene');
        assert.ok(s.plan.includes('### ' + b.scene), b.id + ': no heading ' + b.scene);
      }
  });
test('a refreshed playbook keeps recorded world state', () => {
  const played = applyChanges(pb, [{ flag: 't_ossa', from: 'ila', to: 'court' }], {
    sessionId: 'x',
    title: 'test',
  });
  const c = { ...installed, memory: { ...memoryOf(installed), playbook: played } };
  const refreshed = { ...pack, playbook: { ...pack.playbook!, version: '6.1' } };
  const next = applyUpdate(c, refreshed, new Set(['playbook']));
  assert.equal(stateOf(memoryOf(next).playbook!).t_ossa, 'court');
  assert.equal(memoryOf(next).playbook!.log.length, 1);
});
test('state starts at the campaign opening', () => {
  const s = stateOf(pb);
  assert.equal(s.t_ossa, 'ila');
  assert.equal(s.bell_ossa, 'unrung');
  assert.equal(s.tithe_clock, 0);
});
test('conditions hide plays that are no longer possible', () => {
  const play = installed.sessions[0].branches.find((b) => b.id === 's01-hand-to-quill')!;
  assert.ok(isPossible(pb, play));
  const moved = applyChanges(pb, [{ flag: 't_ossa', from: 'ila', to: 'court' }], {
    sessionId: 'x',
    title: 't',
  });
  assert.ok(!isPossible(moved, play));
  assert.match(blockers(moved, play.when).join(), /Ossa.s Heart is Maudrin/);
});
test('effects resolve against the current state and clocks clamp', () => {
  const play = installed.sessions[0].branches.find((b) => b.id === 's01-attack-quill')!;
  const ch = resolveEffects(pb, play.effects);
  assert.ok(ch.some((c) => c.flag === 'clock_court' && c.to === 1));
  const full = setFlag(pb, 'clock_court', 18, 'x');
  assert.ok(!resolveEffects(full, play.effects).some((c) => c.flag === 'clock_court'));
});
test('undo restores a flag unless it changed again', () => {
  const a = applyChanges(pb, [{ flag: 'quill', from: 'routine', to: 'bribed' }], {
    sessionId: 'x',
    title: 'bribe',
  });
  const b = setFlag(a, 'quill', 'ally', 'x');
  const u = undoEntry(b, a.log[0].id);
  assert.equal(stateOf(u.pb).quill, 'ally');
  assert.deepEqual(u.kept, ['Hushman Tobias Quill']);
  const u2 = undoEntry(a, a.log[0].id);
  assert.equal(stateOf(u2.pb).quill, 'routine');
});
test('a ripple reports plays that close later', () => {
  const r = ripple(installed, pb, [{ flag: 't_ossa', to: 'venn' }], 1);
  assert.ok(r.closed.some((d) => d.play.id === 's03-return-tongue'));
  assert.ok(r.opened.some((d) => d.play.id === 's03-recover-from-venn'));
});
test('the forecast tracks the Concord', () => {
  const f = forecast(pb).find((x) => x.ending.id === 'concord')!;
  assert.equal(f.open, false);
  assert.ok(f.reqs[0].routes.length > 0);
  const rung = ['vaer', 'ossa', 'calla', 'hieme', 'thrane', 'mirel'].reduce(
    (p, b) => setFlag(p, 'bell_' + b, 'rung', 'x'),
    setFlag(pb, 'key', 'party', 'x'),
  );
  assert.equal(forecast(rung).find((x) => x.ending.id === 'concord')!.open, false);
  const there = setFlag(rung, 'shrine', 'reached', 'x');
  assert.equal(forecast(there).find((x) => x.ending.id === 'concord')!.open, true);
  assert.equal(
    forecast(setFlag(there, 'ysh', 'concord', 'x')).find((x) => x.ending.id === 'concord')!.reached,
    true,
  );
});
test('no ending is open at the campaign opening, and the Empty Choir waits for the table’s choice', () => {
  assert.deepEqual(
    forecast(pb)
      .filter((f) => f.open || f.reached)
      .map((f) => f.ending.id),
    [],
  );
  const late = setFlag(setFlag(pb, 'shrine', 'reached', 'x'), 'key', 'maudrin', 'x');
  assert.ok(!forecast(late).find((f) => f.ending.id === 'empty-choir')!.open);
  assert.ok(
    forecast(setFlag(late, 'resistance', 'ended', 'x')).find((f) => f.ending.id === 'empty-choir')!
      .open,
  );
});
test('every ending can be reached by some play', () => {
  const plays = [...installed.sessions.flatMap((s) => s.branches), ...pb.anytime];
  for (const e of pb.endings)
    for (const c of e.reached || [])
      assert.ok(
        plays.some((p) =>
          p.effects?.some((x) => x.flag === c.flag && (!c.in || c.in.includes(String(x.set)))),
        ),
        e.id + ' needs a play that sets ' + c.flag,
      );
});
test('every Tongue, Key and bell state a play can set can be left again by a play', () => {
  const plays = [...installed.sessions.flatMap((s) => s.branches), ...pb.anytime];
  const ids = ['t_ossa', 't_vaer', 't_calla', 't_hieme', 't_thrane', 't_mirel', 'key'];
  const terminal = ['bell', 'sealed', 'spent'];
  for (const id of ids) {
    const set = new Set(
      plays.flatMap((p) =>
        (p.effects || []).filter((e) => e.flag === id).map((e) => String(e.set)),
      ),
    );
    for (const v of set)
      if (!terminal.includes(v) && v !== 'party')
        assert.ok(
          plays.some(
            (p) =>
              p.when?.some((c) => c.flag === id && c.in?.includes(v)) &&
              p.effects?.some((e) => (e.flag === id && e.set !== v) || e.flag.startsWith('bell_')),
          ),
          id + '=' + v + ' is a dead end',
        );
  }
});
test('clock alerts fire one tick before a threshold', () => {
  const near = setFlag(pb, 'tithe_clock', 5, 'x');
  assert.ok(clockAlerts(near).some((a) => a.flag.id === 'tithe_clock' && a.state === 'next'));
});
test('likely plays rank ahead of wildcards', () => {
  const ranked = rankPlays(installed, pb, installed.sessions[0].branches);
  assert.ok(ranked[0].play.likelihood === 'Likely');
});
test('Influence DCs follow the 2024 rule and read both stat block formats', () => {
  assert.equal(intelligenceOf('Ability scores\nSTR 15 (+2) · DEX 12 (+1) · INT 18 (+4)'), 18);
  assert.equal(
    intelligenceOf(
      '| STR | DEX | CON | INT | WIS | CHA |\n|---|---|---|---|---|---|\n| 10 (+0) | 14 (+2) | 12 (+1) | 7 (-2) | 11 (+0) | 9 (-1) |',
    ),
    7,
  );
  assert.equal(intelligenceOf('A plain note with no scores.'), undefined);
  assert.equal(influenceDc(7), 15);
  assert.equal(influenceDc(18), 18);
  const tabled = pb.statblocks.filter((b) => /\|\s*INT\s*\|/.test(b.body));
  assert.ok(tabled.length > 0);
  for (const b of tabled) assert.ok(intelligenceOf(b.body) !== undefined, b.name);
});
test('search finds a play from the words a player uses', () => {
  assert.equal(
    searchPlays('bribe the hushman', installed.sessions[0].branches)[0]?.id,
    's01-bribe-quill',
  );
  assert.ok(
    searchPlays('detect magic', installed.sessions[0].branches).some(
      (p) => p.id === 's01-detect-magic-tongue',
    ),
  );
});
test('2024 encounter budgets and difficulty', () => {
  assert.deepEqual(partyBudget([1, 1, 1, 1]), [200, 300, 400]);
  assert.deepEqual(partyBudget([5, 5, 5, 5]), [2000, 3000, 4400]);
  const enc = pb.encounters.find((e) => e.id === 'enc-s01-quill-patrol')!;
  assert.equal(encounterXP(enc), 500);
  assert.equal(difficulty(500, [3, 3, 3, 3]).band, 'Low');
  assert.equal(difficulty(200, [1, 1, 1, 1]).band, 'Low');
  assert.equal(difficulty(900, [1, 1, 1, 1]).band, 'Beyond High');
});
test('every brief, encounter and stat block reference resolves', () => {
  const enc = new Set(pb.encounters.map((e) => e.id)),
    blocks = new Set(pb.statblocks.map((s) => s.id));
  for (const b of pb.briefs) for (const id of b.encounters) assert.ok(enc.has(id), id);
  for (const e of pb.encounters)
    for (const c of e.creatures) if (c.statblock) assert.ok(blocks.has(c.statblock), c.statblock);
});
test('every condition and effect names a real flag and option', () => {
  const flags = new Map(pb.flags.map((f) => [f.id, f]));
  const plays = [...installed.sessions.flatMap((s) => s.branches), ...pb.anytime];
  for (const p of plays) {
    for (const c of p.when || []) {
      const f = flags.get(c.flag);
      assert.ok(f, p.id + ' ' + c.flag);
      for (const o of [...(c.in || []), ...(c.not || [])])
        assert.ok(
          f!.options?.some((x) => x.id === o),
          p.id + ' ' + c.flag + '=' + o,
        );
    }
    for (const e of p.effects || []) {
      const f = flags.get(e.flag);
      assert.ok(f, p.id + ' ' + e.flag);
      if (e.set)
        assert.ok(
          f!.options?.some((x) => x.id === e.set),
          p.id + ' ' + e.flag + '=' + e.set,
        );
    }
  }
});
test('AI-prepared paths never replace playbook plays', () => {
  const s = installed.sessions[0];
  const kept = s.branches.filter((b) => b.origin === 'playbook');
  assert.ok(kept.length > 5);
});
if (backup) {
  test('sessions go by their book numbers, and references find them', () => {
    assert.equal(sessionTag(installed, installed.sessions[16].id), 'S16B');
    assert.equal(sessionTag(installed, installed.sessions[26].id), 'S23');
    assert.equal(sessionByRef(installed, 'S23'), 26);
    assert.equal(sessionByRef(installed, 'S16'), 15);
    assert.equal(sessionByRef(installed, 'S29'), 31);
    assert.equal(sessionByRef(installed, 'S99'), -1);
  });
  test('a recorded choice comes back in the sessions its notes name', () => {
    const s1 = installed.sessions[0],
      play = s1.branches.find((b) => /S3:/.test(b.later || ''))!;
    const c = {
      ...installed,
      events: [
        {
          id: 'e1',
          sessionId: s1.id,
          text: 'x',
          style: play.style,
          enjoyment: 'Neutral' as const,
          date: '',
          branchId: play.id,
        },
      ],
    };
    const e = echoes(c, pb);
    assert.ok(
      e.some(
        (x) =>
          x.sessionId === installed.sessions[2].id && x.play.id === play.id && !/^S3:/.test(x.text),
      ),
    );
    assert.ok(e.every((x) => c.sessions.findIndex((s) => s.id === x.sessionId) > 0));
  });
  test('world changes applied from a play also count, until undone', () => {
    const s1 = installed.sessions[0],
      play = s1.branches.find((b) => b.effects?.length && /S\d/.test(b.later || ''))!;
    const changes = resolveEffects(pb, play.effects);
    const applied = applyChanges(pb, changes, {
      sessionId: s1.id,
      title: play.title,
      playId: play.id,
    });
    assert.equal(applied.log[0].playId, play.id);
    assert.ok(echoes(installed, applied).some((x) => x.play.id === play.id));
    assert.ok(
      !echoes(installed, undoEntry(applied, applied.log[0].id).pb).some(
        (x) => x.play.id === play.id,
      ),
    );
  });
  test('a play opened by earlier choices rises and says why', () => {
    const s3 = installed.sessions[2];
    const gated = s3.branches.find((b) =>
      b.when?.some((c) => c.flag === 't_ossa' && c.in?.includes('venn')),
    )!;
    const moved = setFlag(pb, 't_ossa', 'venn', 'x');
    const r = rankPlays(installed, moved, s3.branches).find((x) => x.play.id === gated.id)!;
    assert.ok(r.possible);
    assert.match(r.reasons.join(), /^Because Ossa.s Heart is/);
  });
}
test('a pack gives a page other names, and leaves names the DM changed alone', () => {
  const page = memoryOf(installed).pages[0],
    p2 = updatePackSchema.parse({
      ...packJson,
      pages: [],
      cardEdits: [],
      sessions: [],
      cards: [],
      pageEdits: [{ id: page.id, edits: [], aliases: { from: page.aliases, to: 'Another Name' } }],
    }),
    named = (c: Campaign) => memoryOf(c).pages.find((p) => p.id === page.id)!.aliases,
    ids = (c: Campaign) => new Set(planUpdate(c, p2).map((p) => p.id));
  assert.equal(
    planUpdate(installed, p2).find((p) => p.id === 'paliases:' + page.id)?.status,
    'ready',
  );
  const done = applyUpdate(installed, p2, ids(installed));
  assert.equal(named(done), 'Another Name');
  assert.equal(planUpdate(done, p2).find((p) => p.id === 'paliases:' + page.id)?.status, 'applied');
  const mine = {
    ...installed,
    memory: {
      ...memoryOf(installed),
      pages: memoryOf(installed).pages.map((p) =>
        p.id === page.id ? { ...p, aliases: 'Mine' } : p,
      ),
    },
  } as Campaign;
  assert.equal(
    planUpdate(mine, p2).find((p) => p.id === 'paliases:' + page.id)?.status,
    'conflict',
  );
  assert.equal(named(applyUpdate(mine, p2, ids(mine))), 'Mine');
});
test('a pack edit can build on its own earlier edit, and reinstalling changes nothing', () => {
  const s = installed.sessions[0],
    tail = s.plan.slice(-40);
  const p2 = {
    ...pack,
    terms: undefined,
    playbook: undefined,
    pages: [],
    pageEdits: [],
    cardEdits: [],
    cards: [],
    campaign: undefined,
    planner: undefined,
    sessions: [
      {
        id: s.id,
        edits: [
          { find: tail, replace: tail + '\n\nFIRST EDIT' },
          { find: 'FIRST EDIT', replace: 'FIRST EDIT, THEN SECOND' },
        ],
      },
    ],
  };
  const plan = planUpdate(installed, p2);
  assert.deepEqual(
    plan.map((x) => x.status),
    ['ready', 'ready'],
  );
  const once = applyUpdate(installed, p2, new Set(plan.map((x) => x.id)));
  assert.ok(once.sessions[0].plan.endsWith('FIRST EDIT, THEN SECOND'));
  assert.deepEqual(
    planUpdate(once, p2).map((x) => x.status),
    ['applied', 'applied'],
  );
});
test('a refreshed playbook drops recorded values its flags no longer offer', () => {
  const c = {
    ...installed,
    memory: {
      ...memoryOf(installed),
      playbook: { ...pb, state: { ...pb.state, t_ossa: 'nowhere', tithe_clock: 99 } },
    },
  };
  const next = applyUpdate(
    c,
    { ...pack, playbook: { ...pack.playbook!, version: 'x' } },
    new Set(['playbook']),
  );
  const s = stateOf(memoryOf(next).playbook!);
  assert.equal(s.t_ossa, 'ila');
  assert.equal(s.tithe_clock, 12);
});
test('the player site starts with the handouts and map, and the wiki unlocks as you discover', () => {
  const html = siteHtml(bare, new Date('2026-11-01'));
  for (const id of ['start-here', 'the-seventh-bell', 'the-ringing-land', 'map', 'wiki'])
    assert.match(html, new RegExp('<section id="' + id + '"'));
  assert.match(html, /Unlocks as you discover/);
  assert.match(html, /src="data:image\/webp;base64,/);
  assert.doesNotMatch(html.replace(/Tongues spell|Comprehend Languages or Tongues/g, ''), /Tongue/);
  assert.doesNotMatch(html, /IMG:corvane-map|MAPSRC|<!--SET-->/);
});
test('Send to wiki publishes exactly the text sent, escaped, and Take down removes it', () => {
  const c = sendEntry(
    bare,
    {
      id: 'pw-test',
      title: 'Ila <Harrow>',
      kind: 'Person',
      body: 'A **fourteen**-year-old.\n\n- hears the hum\n- <script>x</script>',
    },
    installed.sessions[0].id,
  );
  const html = siteHtml(c);
  assert.match(html, /<article class="wiki-entry" id="pw-test"><h3>Ila &lt;Harrow&gt;<\/h3>/);
  assert.match(html, /<strong>fourteen<\/strong>/);
  assert.match(html, /<li>&lt;script&gt;x&lt;\/script&gt;<\/li>/);
  assert.doesNotMatch(html, /Unlocks as you discover\.<\/strong>/);
  assert.equal(sentEntries(takeDown(c, 'pw-test')).length, 0);
  assert.ok(validateCampaign(c));
});
test('wiki terms get a hover definition once, never in their own entry, linking only to public entries', () => {
  const c = sendEntry(
    sendEntry(
      bare,
      {
        id: 'pw-test',
        title: 'Test',
        kind: 'Lore',
        body: 'Ask a Reckoner. The Reckoner knows the Tithe.',
      },
      's',
    ),
    { id: 'pw-memory-money', title: 'Memory Money', kind: 'Lore', body: 'A Reckoner draws it.' },
    's',
  );
  const html = siteHtml(c);
  const art = (id: string) =>
    html.slice(
      html.indexOf('id="' + id + '"'),
      html.indexOf('</article>', html.indexOf('id="' + id + '"')),
    );
  assert.equal((art('pw-test').match(/class="term"/g) || []).length, 2);
  assert.match(
    art('pw-test'),
    /Reckoner<span class="tip" role="tooltip">[^<]*<a href="#pw-memory-money">More about Reckoner<\/a>/,
  );
  assert.doesNotMatch(art('pw-test'), /More about Tithe/);
  assert.doesNotMatch(art('pw-memory-money'), /class="term"[^>]*>Reckoner/);
});
test('prepared entries wait for their session and their world state', () => {
  const e = {
    id: 'pw-x',
    title: 'X',
    kind: 'Event' as const,
    body: 'b',
    revealAt: installed.sessions[2].id,
    when: [{ flag: 'bell_ossa', in: ['rung'] }],
  };
  const c = {
    ...installed,
    memory: { ...memoryOf(installed), playbook: { ...pb, playerWiki: [e] } },
  };
  assert.equal(entryStatus(c, e, 0), 'later');
  assert.equal(
    entryStatus(c, e, 2),
    'later',
    'an entry for a session is not due while that session is still being played',
  );
  assert.equal(entryStatus(c, e, 3), 'waiting');
  const rung = {
    ...c,
    memory: { ...memoryOf(c), playbook: setFlag(memoryOf(c).playbook!, 'bell_ossa', 'rung', 'x') },
  };
  assert.equal(entryStatus(rung, e, 3), 'due');
  const done = {
    ...rung,
    sessions: rung.sessions.map((s, i) => (i === 2 ? { ...s, done: true } : s)),
  };
  assert.equal(entryStatus(done, e, 2), 'due');
  assert.deepEqual(
    dueAfter(rung, installed.sessions[2].id).map((x) => x.id),
    ['pw-x'],
  );
  assert.equal(entryStatus(sendEntry(rung, e, 's'), e, 2), 'sent');
});
test('encounters suggest how to retune for the party', () => {
  const enc = pb.encounters.find((e) => e.id === 'enc-s01-quill-patrol')!;
  const o = scaleOptions(enc, [3, 3, 3, 3]);
  assert.deepEqual(
    o.map((x) => x.band + x.delta + x.name),
    ['Moderate4Hushman', 'High11Hushman'],
  );
  assert.deepEqual(scaleOptions(enc, []), []);
});
test('the notes fold the short plan, name the scenes a rule is for, and list the fight stat blocks', () => {
  for (const s of installed.sessions.filter((x) => /^## Running this session/m.test(x.plan))) {
    const { guide, book } = planParts(s.plan);
    assert.equal((book + guide).replace(/\s+/g, ''), s.plan.replace(/\s+/g, ''), s.title);
    // The links added to the rules list point at headings the guide has.
    const used = ruleUses(guide);
    const slugs = new Set(
      [...guide.matchAll(/^#{2,3} (.+)$/gm)].map((m) =>
        m[1]
          .toLowerCase()
          .trim()
          .replace(/[^\p{L}\p{N}\s_-]/gu, '')
          .replace(/\s+/g, '-'),
      ),
    );
    for (const line of used.split('\n').filter((l) => l.includes('*Tonight:*')))
      for (const m of line.split('*Tonight:*')[1].matchAll(/\]\(#([^)]+)\)/g))
        assert(slugs.has(m[1]), s.title + ': no heading ' + m[1]);
    assert.equal(used.replace(/ \*Tonight:\* .+$/gm, ''), guide, s.title + ': only links added');
  }
  const one = installed.sessions.find((x) => /^Session 1:/.test(x.title))!.plan;
  assert(planParts(one).book.length > 100);
  assert.match(ruleUses(planParts(one).guide), /\*Tonight:\* \[Scene \d\]\(#scene-/);
  assert.deepEqual(planParts('# Just a plan'), { guide: '# Just a plan', book: '' });
  assert.match(fightPlan(one), /Round 1/);
  assert.equal(fightPlan('# Just a plan'), '');
  const roster = withFightRoster(planParts(one).guide, ['Hushman', 'Hushman Sergeant']);
  assert.match(
    roster,
    /^### Running the fights[^\n]*\n\n?\*\*Stat blocks for tonight's fights:\*\* Hushman · Hushman Sergeant\./m,
  );
  assert.equal(withFightRoster('text', []), 'text');
});
test("a stat line in an NPC's entry opens that creature", () => {
  const first = (body: string) => statLine(body, pb)[0];
  assert.equal(first('**2024 stat block:** Druid (CR 2), with reed-healing.')?.name, 'Druid');
  assert.equal(first('**2024 stat block:** Druid (CR 2), with reed-healing.')?.cr, '2');
  assert.equal(first('**Stat-lite:** Use Scholar (CR 1) for talk.')?.name, 'Scholar');
  assert.equal(statLine('No numbers here.', pb).length, 0);
  const hushman = creatureByName('hushman', pb);
  assert(hushman.statblock, 'a campaign stat block is found whatever its capitals');
  assert.equal(creatureByName('Commoner (for talk)', pb).name, 'Commoner');
});
test('a stat block cell opens the campaign block it means, by a short name or an epithet', () => {
  const named = (name: string) => creatureByName(name, pb).name;
  assert.equal(named('Court Agent'), 'Court Agent (Isolde Drave, Tristan Vesk)');
  assert.equal(named('Keeper of the Seventh'), 'Maudrin Vesk, Keeper of the Seventh');
  assert.equal(named('Ondra Sallow'), 'Ondra Sallow, the Cantor');
  assert.equal(named('Captain Rook'), 'Captain Dessa Rook');
  // Two blocks fit "Maudrin Vesk" (the Chancellor and the Keeper), so it opens neither; one word never matches loosely.
  assert.equal(creatureByName('Maudrin Vesk', pb).statblock, undefined);
  assert.equal(creatureByName('Mage', pb).statblock, undefined);
  const names = (cell: string) => cellCreatures(cell).flatMap((c) => (c.name ? [c.name] : []));
  assert.deepEqual(names('Hush Cultist (Wat); no stats (Pip)'), ['Hush Cultist']);
  assert.deepEqual(names('Noble, two Toughs'), ['Noble', 'Tough']);
  assert.deepEqual(names('None'), []);
  assert.deepEqual(names('No stats tonight'), []);
});
if (backup)
  test('every stat block cell in the session plans opens a stat block', () => {
    const srd = JSON.parse(fs.readFileSync(path.resolve('desktop/data/srd-5etools.json'), 'utf8')),
      plain = (t: string) =>
        t
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, ' ')
          .trim(),
      library = new Set((srd.monster as { name: string }[]).map((m) => plain(m.name))),
      cells = (row: string) =>
        row
          .replace(/^\s*\||\|\s*$/g, '')
          .split('|')
          .map((c) => c.trim()),
      missing: string[] = [];
    for (const s of installed.sessions) {
      const lines = s.plan.split('\n');
      lines.forEach((line, i) => {
        if (!/^\|/.test(line) || !/^\|[\s:|-]+$/.test(lines[i + 1] || '')) return;
        const at = cells(line).findIndex((h) => /^stat block/i.test(h.replace(/\*/g, '')));
        if (at < 0) return;
        for (let j = i + 2; /^\|/.test(lines[j] || ''); j++) {
          const cell = (cells(lines[j])[at] || '')
            .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
            .replace(/[*_]/g, '');
          for (const { name } of cellCreatures(cell))
            if (name && !creatureByName(name, pb).statblock && !library.has(plain(name)))
              missing.push(s.title.slice(0, 12) + ': ' + name);
        }
      });
    }
    assert.deepEqual(missing, []);
  });
test('book headings read as names on screen, and section numbers stay', () => {
  const name = (title: string, kind = 'NPC') => pageName({ title, kind } as never);
  assert.equal(name('19. HUSHMAN TOBIAS QUILL'), 'Hushman Tobias Quill');
  assert.equal(name('THE QUIET COURT', 'Faction'), 'The Quiet Court');
  assert.equal(name('PELLMOOR (Village)', 'Location'), 'Pellmoor (Village)');
  assert.equal(name('1.4 Session Zero Script', 'Lore'), '1.4 Session Zero Script');
  assert.equal(name('Mother Sallow'), 'Mother Sallow');
});
test('search finds a page by another name without putting that name in its title', () => {
  const page = memoryOf(installed).pages[0],
    known = {
      ...installed,
      memory: {
        ...memoryOf(installed),
        pages: [{ ...page, title: 'Tobias Quill', aliases: 'the Zorvane clerk', body: '' }],
      },
    },
    hit = searchCampaign(known, 'Zorvane', 'Wiki')[0];
  assert.equal(hit?.title, 'Tobias Quill');
});
test('every numbered NPC has a look to read out and lines to say', () => {
  const npcs = memoryOf(installed).pages.filter((x) => x.kind === 'NPC' && /^\d+\. /.test(x.title));
  assert(npcs.length >= 25, 'found ' + npcs.length);
  for (const x of npcs) {
    assert.match(x.body, /First look \(read aloud\)/, x.title);
    assert.match(x.body, /Things to say/, x.title);
  }
});
test('a page lists every other page that names it, with the words around the mention', () => {
  const mem = memoryOf(installed),
    index = sharedIndex(
      mem.pages,
      pb.statblocks.map((b) => b.name),
    );
  const sallow = mem.pages.find((x) => /^\d+\. MOTHER SALLOW/.test(x.title))!;
  assert.ok(sallow, 'no Mother Sallow page');
  const links = backlinks(sallow.id, mem.pages, mem.notes, index);
  assert(links.length >= 3, 'found ' + links.length);
  assert(!links.some((l) => l.id === sallow.id), 'a page lists itself');
  for (const l of links) {
    assert.ok(l.match && l.count >= 1, l.title);
    const text =
      l.kind === 'Wiki'
        ? mem.pages.find((x) => x.id === l.id)?.body
        : mem.notes.find((x) => x.id === l.id)?.text;
    assert.ok(text?.includes(l.match), l.title + ' does not contain ' + l.match);
  }
  const note = {
    id: 'n1',
    title: 'Night four',
    text: 'Ila argued with Mother Sallow.',
    date: '2026-01-01',
  };
  const fromNote = backlinks(sallow.id, mem.pages, [note], index).find((l) => l.kind === 'Journal');
  assert.equal(fromNote?.match, 'Mother Sallow');
  assert.equal(fromNote?.before, 'Ila argued with ');
  assert.equal(fromNote?.after, '.');
  assert.deepEqual(sharedIndex(mem.pages, undefined), sharedIndex(mem.pages, undefined));
});
test('the @ picker offers names that link back to the page picked', () => {
  const mem = memoryOf(installed),
    creatures = pb.statblocks.map((b) => b.name),
    index = sharedIndex(mem.pages, creatures);
  const options = linkOptions('sall', mem.pages, index, creatures);
  assert.ok(options.length, 'nothing offered');
  for (const o of linkOptions('', mem.pages, index, creatures, 40).concat(options)) {
    const parts = splitMentions('We met ' + o.name + ' at dawn.', index, new Set());
    assert.equal(parts.find((p) => p.pageId)?.pageId, o.id, o.name + ' does not link back');
  }
  const block = creatures.find((name) =>
    linkOptions(name, mem.pages, index, creatures).some((o) => o.id === 'creature:' + name),
  );
  assert.ok(block, 'no stat block offered');
  assert.deepEqual(atQuery('Ask @Mot', 8), { start: 4, query: 'Mot' });
  assert.deepEqual(atQuery('@', 1), { start: 0, query: '' });
  assert.deepEqual(atQuery('(@Ila', 5), { start: 1, query: 'Ila' });
  assert.equal(atQuery('mail a@b', 8), null);
  assert.equal(atQuery('a @ b', 4), null);
  assert.equal(atQuery('@one\ntwo', 8), null);
});
test('a stat block lists the prepared fights it is in', () => {
  const fight = pb.encounters.find((e) => e.creatures.some((c) => c.statblock))!;
  const block = pb.statblocks.find((b) => fight.creatures.some((c) => c.statblock === b.id))!;
  assert.ok(creatureEncounters(block.name, pb).some((e) => e.id === fight.id));
  assert.equal(creatureEncounters('No Such Creature', pb).length, 0);
});
test('the campaign book holds everything for the DM and only known pages for players', () => {
  const dm = bookContents(installed, 'DM', [...bookParts]),
    mem = memoryOf(installed);
  assert.equal(dm.sessions.length, installed.sessions.length);
  assert.equal(
    dm.wiki.reduce((n, g) => n + g.pages.length, 0),
    mem.pages.length,
  );
  assert.equal(dm.statblocks.length, pb.statblocks.length);
  // Every encounter is printed once: with its session, or in the appendix.
  const printed = dm.sessions.flatMap((s) => s.encounters).concat(dm.encounters);
  assert.equal(printed.length, pb.encounters.length);
  assert.equal(new Set(printed.map((e) => e.id)).size, pb.encounters.length);
  assert.ok(dm.overview?.premise && dm.chapters.some((c) => c.id === 'sessions'));
  // Players: one page they know, one still planned, the rest DM only.
  const [known, planned] = mem.pages;
  const shared: Campaign = {
    ...installed,
    memory: {
      ...mem,
      pages: mem.pages.map((p) =>
        p === known
          ? { ...p, visibility: 'Party knows', status: 'Confirmed' }
          : p === planned
            ? { ...p, visibility: 'Party knows', status: 'Planned' }
            : { ...p, visibility: 'DM only' },
      ),
    },
  };
  const players = bookContents(shared, 'Players', [...bookParts]);
  assert.deepEqual(
    players.wiki.flatMap((g) => g.pages.map((p) => p.id)),
    [known.id],
  );
  assert.equal(players.sessions.length + players.encounters.length + players.statblocks.length, 0);
  assert.equal(players.cards.length, 0);
  assert.equal(players.overview?.premise, '');
  assert.equal(players.overview?.twist, '');
  assert.ok(!players.chapters.some((c) => ['sessions', 'appendix', 'cards'].includes(c.id)));
  assert.equal(bookContents(installed, 'DM', []).chapters.length, 0);
  assert.equal(bookFileName('The Seventh Bell!', 'DM'), 'the-seventh-bell-dm-book.pdf');
  assert.equal(bookFileName('***', 'Players'), 'campaign-players-guide.pdf');
});
test('die tables and die lists roll, with the dice in a row rolled too', () => {
  assert.equal(dieInHead('d6'), 6);
  assert.equal(dieInHead('1d20'), 20);
  assert.equal(dieInHead('d%'), 100);
  assert.equal(dieInHead('Roll (d8)'), 8);
  assert.equal(dieInHead('Name'), null);
  assert.equal(dieInLabel("**Rumours (d6), round Yara's fire:**"), 6);
  assert.equal(dieInLabel('The Hushmen hit for 1d6 + 2.'), null);
  assert.deepEqual(rowRange('2–3', 6), [2, 3]);
  assert.deepEqual(rowRange('96-00', 100), [96, 100]);
  assert.deepEqual(rowRange('0', 10), [10, 10]);
  assert.deepEqual(rowRange('19+', 20), [19, 20]);
  assert.equal(rowRange('7', 6), null);
  // Unnumbered rows count one per face, so they need one row per face.
  assert.equal(rollTable(4, ['a', 'b'], ['x', 'y']), null);
  assert.deepEqual(rollTable(2, ['a', 'b'], ['x', 'y'])?.ranges, [
    [1, 1],
    [2, 2],
  ]);
  const at = (v: number) => () => v;
  const loot = rollTable(20, ['1–5', '6–19', '20'], ['coins', 'gems', 'a crown'])!;
  assert.deepEqual(rollOn(loot, at(0)), { roll: 1, index: 0 });
  assert.deepEqual(rollOn(loot, at(0.5)), { roll: 11, index: 1 });
  assert.deepEqual(rollOn(loot, at(0.99)), { roll: 20, index: 2 });
  // Every die at its top face: 3d6 × 10 is 180, 1d4 + 1 is 5.
  assert.equal(
    rollTextPlain(rollText('3d6 × 10 gp and 1d4 + 1 potions', at(0.99))),
    '3d6 × 10 (180) gp and 1d4 + 1 (5) potions',
  );
  assert.equal(rollTextPlain(rollText('a d8 of rope', at(0))), 'a d8 (1) of rope');
  assert.equal(rollTextPlain(rollText('no dice here', at(0))), 'no dice here');
  const text = [
    '## The Glass Garden',
    '',
    "**Rumours (d6), round Yara's fire:**",
    '1. One.',
    '2. Two.',
    '3. Three.',
    '4. Four.',
    '5. Five.',
    '6. Six.',
    '',
    '| d4 | Find |',
    '| --- | --- |',
    '| 1–2 | 2d6 sp |',
    '| 3–4 | a map |',
    '',
    'Steps:',
    '1. Not a die list.',
  ].join('\n');
  const found = tablesInText(text);
  assert.deepEqual(
    found.map((f) => [f.title, f.table.sides, f.table.entries.length]),
    [
      ["Rumours (d6), round Yara's fire", 6, 6],
      ['The Glass Garden', 4, 2],
    ],
  );
  assert.equal(found[1].table.entries[0], '2d6 sp');
  assert.deepEqual(found[0].table.entries.slice(0, 2), ['One.', 'Two.']);
  // A die list has no numbers of its own, so each item is one face, and rolling it lands on an item.
  assert.deepEqual(
    found[0].table.ranges,
    [1, 2, 3, 4, 5, 6].map((n) => [n, n]),
  );
  assert.equal(rollOn(found[0].table, at(0.99)).index, 5);
  const withLoot = structuredClone(installed);
  memoryOf(withLoot).pages.push({
    ...memoryOf(withLoot).pages[0],
    id: 'loot',
    title: 'Loot',
    kind: 'Item',
    body: lootTemplate,
  });
  const tables = campaignTables(withLoot);
  const lootTable = tables.find((t) => t.id === 'page:loot:0');
  assert.equal(lootTable?.table.sides, 20);
  // Its opening line does not end in a colon and there is no heading, so it takes the page's name.
  assert.equal(lootTable?.title, 'Loot');
  assert.equal(lootTable?.table.entries.length, 6);
});
test('the dice tray rolls fair dice, typed rolls and advantage on a single d20', () => {
  // Typed rolls, with spaces, the unicode minus and d% for d100.
  assert.deepEqual(parseDice('2d6+3'), {
    spec: { count: 2, sides: 6, modifier: 3, mode: 'Normal' },
  });
  assert.deepEqual(parseDice(' D20 − 1  adv '), {
    spec: { count: 1, sides: 20, modifier: -1, mode: 'Advantage' },
  });
  assert.deepEqual(parseDice('d%'), {
    spec: { count: 1, sides: 100, modifier: 0, mode: 'Normal' },
  });
  assert.deepEqual(parseDice('1d20 disadvantage'), {
    spec: { count: 1, sides: 20, modifier: 0, mode: 'Disadvantage' },
  });
  for (const [text, why] of [
    ['', /Type a roll/],
    ['fireball', /Type a roll/],
    ['21d6', /1 to 20 dice/],
    ['0d6', /1 to 20 dice/],
    ['d1', /2 to 1000 sides/],
    ['d20+101', /between −100 and \+100/],
    ['2d20 adv', /single d20/],
    ['d6 dis', /single d20/],
  ] as const) {
    const parsed = parseDice(text);
    assert.ok('error' in parsed && why.test(parsed.error), text + ' is refused');
  }
  // The controls' spec: limits held, advantage only on a d20, and then on one die.
  assert.deepEqual(diceSpec(40, 6, -400, 'Advantage'), {
    count: 20,
    sides: 6,
    modifier: -100,
    mode: 'Normal',
  });
  assert.deepEqual(diceSpec(3, 20, 2, 'Advantage'), {
    count: 1,
    sides: 20,
    modifier: 2,
    mode: 'Advantage',
  });
  assert.equal(diceLabel(diceSpec(3, 8, -2, 'Normal')), '3d8−2');
  // Rolls: dice added, or the higher or lower of two d20s kept, then the modifier.
  const faces =
    (...v: number[]) =>
    () =>
      v.shift()!;
  const sum = rollDice(diceSpec(3, 6, 2, 'Normal'), faces(1, 5, 6), 'a');
  assert.deepEqual([sum.values, sum.kept, sum.total, sum.label], [[1, 5, 6], null, 14, '3d6+2']);
  const adv = rollDice(diceSpec(1, 20, 5, 'Advantage'), faces(14, 9), 'b');
  assert.deepEqual([adv.values, adv.kept, adv.total], [[14, 9], 14, 19]);
  assert.equal(rollAnnouncement(adv), 'Rolled 1d20+5 · Advantage: 19, dice 14 and 9');
  const dis = rollDice(diceSpec(1, 20, -1, 'Disadvantage'), faces(14, 9), 'c');
  assert.deepEqual([dis.kept, dis.total], [9, 8]);
  assert.equal(
    rollAnnouncement(rollDice(diceSpec(1, 20, 0, 'Normal'), faces(7))),
    'Rolled 1d20: 7',
  );
  // The real die stays on its faces and reaches every one of them.
  for (const sides of [2, 6, 20, 100]) {
    const seen = new Set<number>();
    for (let i = 0; i < sides * 60; i++) {
      const v = randomDie(sides);
      assert.ok(Number.isInteger(v) && v >= 1 && v <= sides, `d${sides} rolled ${v}`);
      seen.add(v);
    }
    assert.equal(seen.size, sides, `every face of a d${sides} comes up`);
  }
});

test('faction standing moves along its scale and logs why', () => {
  assert.equal(standingLabel(0), 'Neutral');
  assert.equal(standingLabel(-3), 'Enemies');
  assert.equal(standingLabel(9), 'Allied');
  assert.equal(standingText(1), 'Friendly (+1)');
  assert.equal(standingText(-2), 'Hostile (−2)');
  const date = '2026-11-25T10:00:00.000Z';
  let s = shiftStanding(
    undefined,
    { delta: 1, reason: '  They returned the bell ', sessionId: 's1' },
    date,
  );
  assert.deepEqual(s, {
    value: 1,
    log: [{ delta: 1, value: 1, reason: 'They returned the bell', date, sessionId: 's1' }],
  });
  s = shiftStanding(s, { to: 3 }, date);
  assert.equal(s.value, 3);
  assert.equal(s.log[0].delta, 2);
  // Already at the top: nothing moves, nothing is logged.
  assert.equal(shiftStanding(s, { delta: 1 }, date), s);
  s = shiftStanding(s, { delta: -9 }, date);
  assert.equal(s.value, -3);
  assert.equal(s.log[0].delta, -6);
  for (let i = 0; i < 60; i++) s = shiftStanding(s, { delta: i % 2 ? -1 : 1 }, date);
  assert.equal(s.log.length, 40);
  // It saves with the page.
  const c = structuredClone(installed);
  const page = memoryOf(c).pages.find((p) => p.kind === 'Faction') || memoryOf(c).pages[0];
  page.standing = shiftStanding(undefined, { delta: -1, reason: 'Spurned' }, date);
  assert.ok(wikiPage.safeParse(page).success);
  assert.equal(standingOf({}).value, 0);
});
test('personal threads keep a goal and beats, and name characters who have gone five played sessions without one', () => {
  const date = '2026-11-28T10:00:00.000Z';
  const sessions = Array.from({ length: 9 }, (_, i) => ({ id: 's' + i, done: i < 7 }));
  const base = { id: 'r1', name: 'Wren', player: 'Sam', level: 5, notes: '' };
  assert.deepEqual(threadOf(base), { goal: '', beats: [] });
  let w = setGoal(base, 'Her brother back from the Choir');
  w = addBeat(w, { text: '  Heard his voice under the bell ', sessionId: 's1' }, date, 'b1');
  assert.deepEqual(w.thread, {
    goal: 'Her brother back from the Choir',
    beats: [{ id: 'b1', text: 'Heard his voice under the bell', date, sessionId: 's1' }],
  });
  assert.equal(addBeat(w, { text: '   ' }, date), w);
  const quiet = { ...base, id: 'r2', name: 'Osk' },
    unnamed = { ...base, id: 'r3', name: ' ' },
    roster = [w, quiet, unnamed],
    campaign = { sessions } as unknown as Parameters<typeof threadStatus>[0];
  // At s7: Wren's last beat was s1, then s2–s6 were played (5); Osk has had none since s0 (7).
  let st = threadStatus(campaign, roster, 's7');
  assert.equal(st.length, 2);
  assert.deepEqual(
    st.map((x) => [x.member.name, x.without, x.due]),
    [
      ['Wren', 5, true],
      ['Osk', 7, true],
    ],
  );
  // A beat tonight clears it; one from an unplayed later session doesn't count yet.
  w = addBeat(w, { text: 'Found his name on the bell', sessionId: 's7' }, date, 'b2');
  w = addBeat(w, { text: 'Not yet', sessionId: 's8' }, date, 'b3');
  st = threadStatus(campaign, [w, quiet], 's7');
  assert.equal(st[0].without, 0);
  assert.equal(st[0].last?.id, 'b2');
  assert.deepEqual(threadsDue(campaign, [w, quiet], 's7').map((x) => x.member.name), ['Osk']);
  // Unplayed sessions (the road not taken) don't count toward the gap.
  const skipped = sessions.map((x, i) => ({ ...x, done: i < 7 && i !== 3 && i !== 4 }));
  assert.equal(threadStatus({ sessions: skipped } as typeof campaign, [setGoal(base, 'x')], 's7')[0].without, 5);
  w = removeBeat(w, 'b3');
  assert.equal(threadOf(w).beats.length, 2);
  for (let i = 0; i < 20; i++) w = addBeat(w, { text: 'beat ' + i }, date, 'x' + i);
  assert.equal(threadOf(w).beats.length, 12);
  assert.equal(threadOf(w).beats[11].text, 'beat 19');
  // It saves with the roster, and old rosters without threads still load.
  assert.ok(rosterSchema.safeParse([w, quiet]).success);
  assert.ok(rosterSchema.safeParse([base]).success);
});
test('the relationship web joins related pages and pages named in the text', () => {
  const base = memoryOf(installed).pages[0];
  const page = (id: string, title: string, body: string, extra = {}) => ({
    ...base,
    id,
    title,
    aliases: '',
    kind: 'NPC' as const,
    body,
    ...extra,
  });
  const pages = [
    page('yara', 'Yara Vell', 'Yara keeps the ferry and owes Oskar Brine.', {
      related: ['court'],
      relations: { court: 'informs on' },
    }),
    page('oskar', 'Oskar Brine', 'A smuggler.'),
    page('court', 'The Quiet Court', 'It watches the mere.', { kind: 'Faction' as const }),
    page('mere', 'The Mute Mere', 'Cold water. The Quiet Court patrols it.', {
      kind: 'Location' as const,
    }),
    page('lone', 'Lone Page', 'Nothing here.'),
  ];
  const edges = webEdges(pages, sharedIndex(pages));
  const find = (x: string, y: string) =>
    edges.find((e) => (e.a === x && e.b === y) || (e.a === y && e.b === x));
  assert.deepEqual(
    { set: find('yara', 'court')?.set, label: find('yara', 'court')?.label },
    { set: true, label: 'informs on' },
  );
  assert.equal(find('yara', 'oskar')?.mentions, 1);
  assert.equal(find('mere', 'court')?.set, false);
  assert.equal(find('lone', 'yara'), undefined);
  const web = neighborhood(edges, 'court');
  // The related page set in the editor comes first; Oskar is one step further out, through Yara.
  assert.deepEqual(web.ring1, ['yara', 'mere']);
  assert.deepEqual(web.ring2, [{ id: 'oskar', parent: 'yara' }]);
  assert.equal(web.links.length, 3);
  assert.deepEqual(neighborhood(edges, 'court', { mentions: false }).ring1, ['yara']);
  assert.equal(neighborhood(edges, 'lone').ring1.length, 0);
  // How two pages connect saves with the page.
  assert.ok(wikiPage.safeParse(pages[0]).success);
});

test('make changes proposes, applies and undoes wiki changes one at a time', () => {
  const base = memoryOf(installed).pages[0];
  const page = (id: string, title: string, body: string, extra = {}) => ({
    ...base,
    id,
    title,
    aliases: '',
    kind: 'NPC' as const,
    body,
    history: [],
    related: [],
    ...extra,
  });
  const yara = page('yara', 'Yara Vell', 'Yara keeps the ferry.', { aliases: 'The Ferrywoman' });
  const long = page('long', 'The Long Road', 'x'.repeat(ASSIST_BODY_LIMIT + 1), { kind: 'Lore' });
  const unsent = page('unsent', 'Oskar Brine', 'A smuggler.');
  const court = page('court', 'Court of Gulls', 'A thieves guild.', { kind: 'Faction' });
  const c = {
    ...installed,
    memory: { ...memoryOf(installed), pages: [yara, long, unsent, court], pins: [] },
  } as Campaign;
  const change = (title: string, body: string, action: 'create' | 'update' = 'update') => ({
    action,
    title,
    kind: 'Location' as const,
    body,
    reason: 'r',
    quote: '',
  });
  let n = 0;
  const { proposals, left } = proposalsFor(
    [
      change('the ferrywoman', 'Yara keeps the ferry. She betrayed the party.'),
      change('Yara Vell', 'A second change to the same page.'),
      change('Gull Harbour', 'A harbour.', 'create'),
      change('Court of Gulls', 'A thieves guild that owns the docks.', 'create'),
      change('The Long Road', 'Rewritten.'),
      change('Oskar Brine', 'Rewritten.'),
      change('Empty', '  '),
    ],
    memoryOf(c).pages,
    () => 'p' + ++n,
    new Set(['yara', 'long', 'court']),
  );
  // An alias finds the page; a second change to it is dropped; a taken name becomes an update; long and unsent pages are left out.
  assert.deepEqual(
    proposals.map((p) => [p.action, p.title, p.kind, p.pageId]),
    [
      ['update', 'Yara Vell', 'NPC', 'yara'],
      ['create', 'Gull Harbour', 'Location', undefined],
      ['update', 'Court of Gulls', 'Faction', 'court'],
    ],
  );
  assert.equal(left, 2);
  assert.equal(proposals[0].before, 'Yara keeps the ferry.');
  // Approving an update keeps the old text in history; Undo brings it back while the page is untouched.
  const first = applyProposal(c, proposals[0], '2026-11-26T10:00:00.000Z', 'new1');
  const changed = memoryOf(first.campaign).pages.find((p) => p.id === 'yara')!;
  assert.equal(changed.body, 'Yara keeps the ferry. She betrayed the party.');
  assert.equal(changed.history[0].body, 'Yara keeps the ferry.');
  assert.ok(wikiPage.safeParse(changed).success);
  assert.ok(canUndo(first.campaign, first.undo));
  assert.deepEqual(
    memoryOf(undoProposal(first.campaign, first.undo)).pages.find((p) => p.id === 'yara'),
    yara,
  );
  // A new page starts DM only and Unresolved; Undo removes it and its links and pins.
  const second = applyProposal(first.campaign, proposals[1], '2026-11-26T10:01:00.000Z', 'new2');
  const created = memoryOf(second.campaign).pages.find((p) => p.id === 'new2')!;
  assert.deepEqual(
    [created.title, created.status, created.visibility],
    ['Gull Harbour', 'Unresolved', 'DM only'],
  );
  assert.ok(wikiPage.safeParse(created).success);
  const linked = {
    ...second.campaign,
    memory: {
      ...memoryOf(second.campaign),
      pins: ['new2'],
      pages: memoryOf(second.campaign).pages.map((p) =>
        p.id === 'court' ? { ...p, related: ['new2'] } : p,
      ),
    },
  };
  const removed = memoryOf(undoProposal(linked, second.undo));
  assert.equal(
    removed.pages.some((p) => p.id === 'new2'),
    false,
  );
  assert.deepEqual(removed.pins, []);
  assert.deepEqual(removed.pages.find((p) => p.id === 'court')!.related, []);
  // Once the DM edits the page, Undo is no longer offered and changes nothing.
  const edited = {
    ...first.campaign,
    memory: {
      ...memoryOf(first.campaign),
      pages: memoryOf(first.campaign).pages.map((p) =>
        p.id === 'yara' ? { ...p, body: 'Edited.', updated: '2026-11-26T11:00:00.000Z' } : p,
      ),
    },
  };
  assert.equal(canUndo(edited, first.undo), false);
  assert.equal(undoProposal(edited, first.undo), edited);
  // Only text, PDFs and the image types Claude reads can be attached; Markdown goes as text.
  assert.equal(attachmentType('notes.md', ''), 'text/plain');
  assert.equal(attachmentType('scan.pdf', 'application/pdf'), 'application/pdf');
  assert.equal(attachmentType('photo.heic', 'image/heic'), null);
  assert.equal(attachmentType('sheet.docx', 'application/msword'), null);
});

test('map pins stay on the image, name their pages, and only shared pins reach players', () => {
  const image = 'data:image/png;base64,iVBORw0KGgo=';
  const map = newMap(
    { title: '  Harbour chart ', image, width: 1200.4, height: 799.6 },
    'm1',
    '2026-11-26',
  );
  assert.equal(map.title, 'Harbour chart');
  assert.deepEqual([map.width, map.height], [1200, 800]);
  assert.equal(titleFromFile('old_harbour-map.final.png'), 'old harbour map.final');
  assert.equal(titleFromFile('.png'), 'Map');
  assert.deepEqual(fitted(4800, 2400), { width: 2400, height: 1200 });
  assert.deepEqual(fitted(800, 600), { width: 800, height: 600 }, 'Small images are not enlarged');
  const pages = [{ id: 'quay', title: 'The Quay' }];
  const quay = newPin({ x: 1.4, y: -0.2 }, 'p1', pages[0]);
  assert.deepEqual(
    [quay.x, quay.y, quay.label, quay.pageId, quay.shared],
    [1, 0, 'The Quay', 'quay', false],
  );
  const loose = newPin({ x: 0.25, y: 0.75 }, 'p2');
  assert.equal(loose.pageId, undefined);
  let m = withPin(withPin(map, quay, 't1'), loose, 't2');
  assert.equal(m.pins.length, 2);
  assert.equal(m.updated, 't2');
  m = withPin(m, { ...quay, x: 0.5, y: 2 }, 't3');
  assert.deepEqual(
    [m.pins[0].x, m.pins[0].y, m.pins.length],
    [0.5, 1, 2],
    'Moving a pin keeps it on the image',
  );
  assert.equal(pinName({ ...quay, label: '' }, pages), 'The Quay');
  assert.equal(pinName(loose, pages, 1), 'Pin 2');
  assert.deepEqual(
    pinsForPage([m], 'quay').map((x) => x.pin.id),
    ['p1'],
  );
  assert.deepEqual(pinsForPage(undefined, 'quay'), []);
  m = withPin(m, { ...loose, shared: true, note: 'The smugglers wait here.' }, 't4');
  const shown = playerMap(m, pages);
  assert.deepEqual(
    shown.pins,
    [{ x: 0.25, y: 0.75, label: 'Pin 2' }],
    'Only shared pins, without notes',
  );
  assert(!JSON.stringify(shown).includes('smugglers'));
  const full = {
    ...m,
    pins: Array.from({ length: PIN_LIMIT }, (_, i) => newPin({ x: 0, y: 0 }, 'f' + i)),
  };
  assert.equal(withPin(full, newPin({ x: 0, y: 0 }, 'extra'), 't5'), full, 'No pin past the limit');
  assert.equal(withoutPin(m, 'p1', 't6').pins.length, 1);
  const withMaps = (maps: unknown[]) =>
    validateCampaign({
      ...installed,
      memory: { ...memoryOf(installed), maps },
    } as unknown as Campaign);
  assert.equal(withMaps([m]), true);
  assert.equal(withMaps([{ ...m, image: 'data:image/svg+xml;base64,PHN2Zz4=' }]), false);
  assert.equal(withMaps([{ ...m, image: image + '"' }]), false);
});

test('a homebrew copy of a library creature is renamed, found by its own name only, and outlives update packs', () => {
  const entry: RuleEntry = {
    id: 'xmm-goblin-warrior',
    name: 'Goblin Warrior',
    kind: 'Creature',
    source: 'XMM',
    edition: '2024',
    page: '172',
    summary: 'Small fey (goblinoid) · CR 1/4',
    body: 'Armor class\n15\n\nHit points\n10 (3d6)\n\nActions\nScimitar. Melee attack: +4 to hit.',
    warnings: [],
  };
  const copy = homebrewFrom(entry, [], 'a1', '2026-11-26');
  assert.deepEqual(
    [copy.id, copy.name, copy.cr, copy.base, copy.from, copy.edition, copy.source],
    ['hb-a1', 'Goblin Warrior (homebrew)', '1/4', 'Goblin Warrior', entry.id, '2024', 'XMM'],
  );
  assert.ok(copy.body.startsWith('Small fey (goblinoid) · CR 1/4\n\nArmor class\n15'));
  assert.equal(homebrewFrom(entry, [copy], 'a2').name, 'Goblin Warrior (homebrew 2)');
  const long = homebrewFrom(
    { ...entry, body: ('Traits\n' + 'x'.repeat(900) + '\n\n').repeat(20) },
    [],
  );
  assert.ok(long.body.length <= HOMEBREW_BODY);
  assert.ok(/Open the original for the rest\.\]$/.test(long.body));

  // Renamed, it is the campaign's stat block for that exact name, and never for a shorter or plainer one.
  const reed = {
    ...copy,
    name: 'Reed Goblin Sneak',
    body: 'Armor class\n16\n\nTraits\nReed-step.',
  };
  const mine = (list: unknown[], from: Campaign = installed) =>
    ({ ...from, memory: { ...memoryOf(from), homebrew: list } }) as Campaign;
  const bare = {
    ...installed,
    memory: { ...memoryOf(installed), playbook: undefined },
  } as Campaign;
  assert.equal(bestiaryOf(memoryOf(installed)), pb, 'No homebrew: the playbook itself');
  const beasts = bestiaryOf(memoryOf(mine([reed])))!;
  assert.equal(beasts.statblocks.length, pb.statblocks.length + 1);
  assert.equal(creatureByName('Reed Goblin Sneak', beasts).statblock, 'hb-a1');
  assert.equal(creatureByName('Reed Sneak', beasts).statblock, undefined);
  assert.equal(creatureByName('Goblin Warrior', beasts).statblock, undefined);
  const alone = bestiaryOf(memoryOf(mine([reed], bare)))!;
  assert.deepEqual([alone.statblocks.length, alone.encounters.length], [1, 0]);
  const page = wikiPage.parse({
    id: 'p-reed',
    title: 'Reed Goblin Sneak',
    kind: 'NPC',
    body: 'Lurks in the reeds.',
    aliases: '',
    status: 'Confirmed',
    visibility: 'DM only',
    sourceId: '',
    quote: '',
    updated: '2026-11-26',
    history: [],
  });
  assert.equal(pageCreatures(page, alone)[0]?.statblock, 'hb-a1');

  // Saved, searched, printed and pinned.
  assert.equal(validateCampaign(mine([reed])), true);
  assert.equal(validateCampaign(mine([{ ...reed, body: 'x'.repeat(HOMEBREW_BODY + 1) }])), false);
  assert.equal(
    validateCampaign(
      mine(Array.from({ length: HOMEBREW_LIMIT + 1 }, (_, i) => ({ ...reed, id: 'hb-' + i }))),
    ),
    false,
  );
  const hit = searchCampaign(mine([reed]), 'reed goblin', 'Creature')[0];
  assert.deepEqual(
    [hit?.id, hit?.status],
    ['hb-a1', 'Homebrew · built on Goblin Warrior · CR 1/4'],
  );
  assert.ok(
    bookContents(mine([reed]), 'DM', [...bookParts]).statblocks.some((b) => b.id === 'hb-a1'),
  );
  const reference = homebrewReference(reed);
  assert.deepEqual([reference.kind, reference.source], ['Creature', 'Homebrew']);
  assert.ok(reference.body.startsWith('CR 1/4 · homebrew built on Goblin Warrior'));
  assert.equal(validRuleReferences([reference]), true);

  // Edits replace the copy in place; removing leaves the others.
  assert.deepEqual(
    withHomebrew([reed], copy).map((b) => b.name),
    ['Goblin Warrior (homebrew)'],
  );
  const two = withHomebrew([reed], { ...copy, id: 'hb-a2' });
  assert.deepEqual(
    withoutHomebrew(two, 'hb-a1').map((b) => b.id),
    ['hb-a2'],
  );

  // Applying the update pack again replaces the playbook and keeps the homebrew.
  assert.deepEqual(memoryOf(applyUpdate(mine([reed]), pack, all)).homebrew, [reed]);
});

test('the Foundry export makes journal entries, roll tables and creatures with ids that stay the same', () => {
  const mem = memoryOf(installed),
    bundle = foundryBundle(installed, [...foundryParts], 'T');
  assert.equal(bundle.format, 'waypoint-foundry');
  // One entry per wiki page and handout, one for the session plans and one for the stat blocks.
  assert.equal(bundle.journal.length, mem.pages.length + (mem.handouts || []).length + 2);
  assert.equal(bundle.tables.length, campaignTables(installed).length);
  assert.equal(bundle.actors.length, pb.statblocks.length);
  assert.deepEqual(foundrySummary(installed, [...foundryParts]), [
    bundle.journal.length + ' journal entries',
    bundle.tables.length + ' roll tables',
    bundle.actors.length + ' creatures',
  ]);
  // Foundry ids: 16 letters and digits, all different, and the same every time for the same campaign.
  const ids = [
    ...bundle.folders.map((f) => f._id),
    ...bundle.journal.flatMap((j) => [j._id, ...j.pages.map((p) => p._id)]),
    ...bundle.tables.flatMap((t) => [t._id, ...t.results.map((r) => r._id)]),
    ...bundle.actors.map((a) => a._id),
  ];
  assert.ok(ids.every((id) => /^[A-Za-z0-9]{16}$/.test(id)));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(foundryBundle(installed, [...foundryParts], 'T'), bundle);
  assert.notEqual(
    foundryBundle({ ...installed, id: 'other' }, ['wiki'], 'T').journal[0]._id,
    bundle.journal[0]._id,
  );
  // Every folder sits in a folder of its own type, or at the top.
  for (const f of bundle.folders)
    assert.ok(!f.folder || bundle.folders.some((p) => p._id === f.folder && p.type === f.type));
  const sessions = bundle.journal.find((j) => j.name === 'Session plans')!;
  assert.equal(sessions.pages.length, installed.sessions.length);
  assert.equal(sessions.ownership.default, NONE);
  assert.equal(
    bundle.journal.find((j) => j.name === 'Stat blocks')!.pages.length,
    pb.statblocks.length,
  );
  // Names become Foundry links to entries and creature pages that are in the file, first mention only, never to itself.
  const pageIds = new Set(
      bundle.journal.flatMap((j) => j.pages.map((p) => j._id + '.JournalEntryPage.' + p._id)),
    ),
    entryIds = new Set(bundle.journal.map((j) => j._id));
  let toEntries = 0,
    toCreatures = 0;
  for (const j of bundle.journal)
    for (const p of j.pages) {
      const links = [...p.text.content.matchAll(/@UUID\[JournalEntry\.([^\]]+)\]\{([^}]*)\}/g)].map(
        (m) => m[1],
      );
      for (const to of links) {
        if (to.includes('.JournalEntryPage.')) {
          assert.ok(pageIds.has(to), 'creature link ' + to);
          toCreatures++;
        } else {
          assert.ok(entryIds.has(to) && to !== j._id, 'page link ' + to);
          toEntries++;
        }
      }
      if (j.name !== 'Session plans' && j.name !== 'Stat blocks')
        assert.equal(new Set(links).size, links.length, j.name + ' links each page once');
    }
  assert.ok(
    toEntries > 50 && toCreatures > 0,
    toEntries + ' page links, ' + toCreatures + ' creature links',
  );
  // Tables roll their own die and keep their rows' ranges.
  const found = campaignTables(installed);
  bundle.tables.forEach((t, i) => {
    assert.equal(t.formula, '1d' + found[i].table.sides);
    assert.deepEqual(
      t.results.map((r) => r.range),
      found[i].table.ranges,
    );
  });
  // A creature's numbers come out of its stat block, in the pack's shape and the rules library's.
  const hushman = pb.statblocks.find((b) =>
    /\*\*AC\*\* 12 \(leather coat\) · \*\*HP\*\* 32 \(5d8 \+ 10\)/.test(b.body),
  )!;
  assert.deepEqual(creatureStats(hushman), {
    cr: 0.5,
    ac: 12,
    hp: 32,
    hpFormula: '5d8 + 10',
    speed: 30,
    abilities: { str: 15, dex: 12, con: 14, int: 10, wis: 11, cha: 10 },
  });
  for (const a of bundle.actors)
    assert.ok(
      a.ac && a.hp && Object.keys(a.abilities).length === 6 && a.cr !== null,
      a.name + ' has its numbers',
    );
  assert.deepEqual(
    creatureStats({
      cr: '1/4',
      body: [
        'Small humanoid · CR 1/4',
        'Armor class\n15 (leather armor, shield)',
        'Hit points\n7 (2d6)',
        'Speed\nwalk 30',
        'Ability scores\nSTR 8 (-1) · DEX 14 (+2) · CON 10 (+0) · INT 10 (+0) · WIS 8 (-1) · CHA 8 (-1)',
      ].join('\n\n'),
    }),
    {
      cr: 0.25,
      ac: 15,
      hp: 7,
      hpFormula: '2d6',
      speed: 30,
      abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    },
  );
  assert.deepEqual(creatureStats({ cr: '?', body: 'Nothing here.' }), {
    cr: null,
    ac: null,
    hp: null,
    hpFormula: '',
    speed: null,
    abilities: {},
  });
  // Players can open a page the party knows; planned and DM-only pages stay hidden. Handouts are for players.
  const [known, planned, secret] = mem.pages;
  const shared: Campaign = {
    ...installed,
    memory: {
      ...mem,
      pages: mem.pages.map((p) =>
        p === known
          ? {
              ...p,
              visibility: 'Party knows',
              status: 'Confirmed',
              body: 'A <script>x</script> **bold** note. See [World state](go:world-state), [below](#notes) and [the map](https://example.com/map).',
            }
          : p === planned
            ? { ...p, visibility: 'Party knows', status: 'Planned' }
            : { ...p, visibility: 'DM only' },
      ),
      handouts: [
        { id: 'h1', title: 'A letter', body: 'Come alone.', sourcePageIds: [], updated: 'T' },
      ],
    },
  };
  const players = foundryBundle(shared, ['wiki', 'handouts'], 'T'),
    entry = (id: string) => players.journal.find((j) => j.flags.world.waypoint === id)!;
  assert.equal(entry('page:' + known.id).ownership.default, OBSERVER);
  assert.equal(entry('page:' + planned.id).ownership.default, NONE);
  assert.equal(entry('page:' + secret.id).ownership.default, NONE);
  assert.equal(entry('handout:h1').ownership.default, OBSERVER);
  assert.equal(entry('handout:h1').pages[0].text.content, '<p>Come alone.</p>');
  assert.equal(
    entry('page:' + known.id).pages[0].text.content,
    '<p>A &lt;script&gt;x&lt;/script&gt; <strong>bold</strong> note. See World state, below and <a href="https://example.com/map">the map</a>.</p>',
  );
  // Only what was chosen goes in, and links only go to what is in the file.
  const tablesOnly = foundryBundle(installed, ['tables'], 'T');
  assert.deepEqual(
    [tablesOnly.journal.length, tablesOnly.actors.length, tablesOnly.folders.map((f) => f.type)],
    [0, 0, ['RollTable']],
  );
  const noWiki = foundryBundle(installed, ['sessions'], 'T');
  assert.ok(!noWiki.journal[0].pages.some((p) => p.text.content.includes('@UUID')));
  assert.deepEqual(foundrySummary(installed, []), []);
  assert.equal(foundryFileName('The Seventh Bell!'), 'the-seventh-bell.foundry.json');
  assert.equal(foundryId('a'), foundryId('a'));
  assert.notEqual(foundryId('a'), foundryId('b'));
});

// A stand-in for the parts of Foundry the import macro uses. It checks the calls the way Foundry would: ids kept, no
// embedded arrays in an update, and text results in the shape of the Foundry version it pretends to be.
type Doc = Record<string, unknown> & { _id: string; id: string; name: string };
class Docs<T> extends Map<string, T> {
  get contents() {
    return [...this.values()];
  }
}
function mockFoundry(
  gen: number,
  system: string,
  file: string | null,
  opts: { gm?: boolean; broken?: string } = {},
) {
  const store: Record<string, Docs<Doc>> = {
    Folder: new Docs(),
    JournalEntry: new Docs(),
    RollTable: new Docs(),
    Actor: new Docs(),
  };
  const notes: [string, string][] = [],
    warnings: string[] = [];
  const nested = { JournalEntry: 'pages', RollTable: 'results' } as Record<string, string>;
  const checkResult = (r: Record<string, unknown>) => {
    if (gen >= 13)
      assert.ok(r.type === 'text' && typeof r.name === 'string' && !('text' in r), 'v13 result');
    else
      assert.ok(
        r.type === (gen >= 11 ? 'text' : 0) && typeof r.text === 'string' && !('name' in r),
        'old result',
      );
  };
  const make = (type: string, data: Doc) => {
    const doc: Doc = { ...structuredClone(data), id: data._id };
    const key = nested[type];
    if (key) {
      const list = new Docs<Doc>();
      for (const e of (data[key] as Doc[]) || []) {
        if (type === 'RollTable') checkResult(e);
        list.set(e._id, { ...structuredClone(e), id: e._id });
      }
      doc[key] = list;
      doc.createEmbeddedDocuments = async (_: string, add: Doc[], o: { keepId?: boolean }) => {
        assert.ok(o?.keepId, 'embedded ids kept');
        for (const e of add) {
          if (list.has(e._id)) throw Error('Duplicate ' + e._id);
          if (type === 'RollTable') checkResult(e);
          list.set(e._id, { ...structuredClone(e), id: e._id });
        }
      };
      doc.updateEmbeddedDocuments = async (_: string, change: Doc[]) => {
        for (const e of change) {
          const old = list.get(e._id);
          if (!old) throw Error('No ' + e._id);
          Object.assign(old, structuredClone(e));
        }
      };
      doc.deleteEmbeddedDocuments = async (_: string, ids: string[]) => {
        for (const id of ids) list.delete(id);
      };
    }
    return doc;
  };
  const documentClass = (type: string) => ({
    createDocuments: async (list: Doc[], o: { keepId?: boolean }) => {
      assert.ok(o?.keepId, 'ids kept');
      if (list.some((d) => d.name === opts.broken)) throw Error('Broken document');
      for (const d of list) {
        if (store[type].has(d._id)) throw Error('Duplicate ' + d._id);
        if (d.folder && !store.Folder.has(d.folder as string)) throw Error('No folder ' + d.folder);
        store[type].set(d._id, make(type, d));
      }
      return list;
    },
    updateDocuments: async (list: Doc[]) => {
      for (const d of list) {
        const doc = store[type].get(d._id);
        if (!doc) throw Error('No ' + d._id);
        if (nested[type] && nested[type] in d) throw Error('Embedded documents in an update');
        Object.assign(doc, structuredClone(d));
      }
      return list;
    },
  });
  const input: {
    files?: { text: () => Promise<string> }[];
    onchange?: () => void;
    click: () => void;
  } = {
    click: () =>
      queueMicrotask(() => {
        input.files = file === null ? [] : [{ text: async () => file }];
        input.onchange?.();
      }),
  };
  const globals = {
    game: {
      user: { isGM: opts.gm ?? true },
      release: { generation: gen },
      version: gen + '.300',
      system: { id: system },
      collections: { get: (type: string) => store[type] },
      journal: store.JournalEntry,
      tables: store.RollTable,
      actors: store.Actor,
    },
    CONFIG: Object.fromEntries(
      Object.keys(store).map((t) => [t, { documentClass: documentClass(t) }]),
    ),
    ui: {
      notifications: Object.fromEntries(
        ['info', 'warn', 'error'].map((level) => [
          level,
          (text: string) => notes.push([level, text]),
        ]),
      ),
    },
    document: { createElement: () => input },
    console: { warn: (text: string) => warnings.push(text) },
  };
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
    ...args: string[]
  ) => (...values: unknown[]) => Promise<void>;
  const run = () =>
    new AsyncFunction(...Object.keys(globals), foundryMacro)(...Object.values(globals));
  return { store, notes, warnings, run, last: () => notes[notes.length - 1] };
}
async function asyncTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log('ok  ', name);
  } catch (e) {
    failures++;
    console.log('FAIL', name, '\n    ', e instanceof Error ? e.message : e);
  }
}
await asyncTest(
  'the Foundry import macro creates everything once, then updates the same documents',
  async () => {
    const bundle = foundryBundle(installed, [...foundryParts], 'T'),
      total =
        bundle.folders.length + bundle.journal.length + bundle.tables.length + bundle.actors.length;
    const world = mockFoundry(13, 'dnd5e', JSON.stringify(bundle));
    await world.run();
    assert.deepEqual(world.last(), ['info', 'Waypoint import: ' + total + ' created, 0 updated.']);
    assert.deepEqual(
      ['Folder', 'JournalEntry', 'RollTable', 'Actor'].map((t) => world.store[t].size),
      [bundle.folders.length, bundle.journal.length, bundle.tables.length, bundle.actors.length],
    );
    const actor = world.store.Actor.get(bundle.actors[0]._id)!,
      stats = bundle.actors[0];
    assert.equal(actor.type, 'npc');
    assert.deepEqual((actor.system as { attributes: unknown }).attributes, {
      ac: { flat: stats.ac, calc: 'flat' },
      hp: { value: stats.hp, max: stats.hp, formula: stats.hpFormula },
      movement: { walk: stats.speed },
    });
    // The DM adds a page in Foundry and changes a page in Waypoint, then imports again: the same documents are updated.
    const firstEntry = world.store.JournalEntry.get(bundle.journal[0]._id)!;
    (firstEntry.pages as Docs<Doc>).set('dmsOwnPage00000', {
      _id: 'dmsOwnPage00000',
      id: 'dmsOwnPage00000',
      name: 'Mine',
    });
    const changed = structuredClone(installed);
    memoryOf(changed).pages[0].body = 'Changed in Waypoint.';
    const again = foundryBundle(changed, [...foundryParts], 'T2');
    const second = mockFoundry(13, 'dnd5e', JSON.stringify(again));
    for (const t of Object.keys(world.store))
      for (const [k, v] of world.store[t]) second.store[t].set(k, v);
    await second.run();
    assert.deepEqual(second.last(), ['info', 'Waypoint import: 0 created, ' + total + ' updated.']);
    const pages = (second.store.JournalEntry.get(again.journal[0]._id)!.pages as Docs<Doc>)
      .contents;
    assert.deepEqual(
      pages.map((p) => p.name),
      [again.journal[0].pages[0].name, 'Mine'],
    );
    assert.equal((pages[0].text as { content: string }).content, '<p>Changed in Waypoint.</p>');
    const table = second.store.RollTable.get(again.tables[0]._id)!;
    assert.equal((table.results as Docs<Doc>).size, again.tables[0].results.length);
    // Foundry 11 in another system: text results, and no creatures, only their journal pages.
    const pf = mockFoundry(11, 'pf2e', JSON.stringify(bundle));
    await pf.run();
    assert.equal(pf.store.Actor.size, 0);
    assert.ok(!pf.store.Folder.contents.some((f) => f.type === 'Actor'));
    assert.match(pf.last()[1], /Creatures are made only in a dnd5e world/);
    // One document Foundry refuses doesn't stop the rest; it is named in the console.
    const broken = mockFoundry(12, 'dnd5e', JSON.stringify(bundle), {
      broken: bundle.journal[1].name,
    });
    await broken.run();
    assert.equal(broken.store.JournalEntry.size, bundle.journal.length - 1);
    assert.equal(broken.last()[0], 'warn');
    assert.match(broken.last()[1], /, 1 failed \(details in the console/);
    assert.ok(
      broken.warnings[0].includes('JournalEntry "' + bundle.journal[1].name + '": Broken document'),
      broken.warnings[0],
    );
    // Players can't import, other files are refused, and choosing nothing does nothing.
    const player = mockFoundry(13, 'dnd5e', JSON.stringify(bundle), { gm: false });
    await player.run();
    assert.deepEqual(
      [player.last(), player.store.JournalEntry.size],
      [['warn', 'Only a GM can import from Waypoint.'], 0],
    );
    const wrong = mockFoundry(13, 'dnd5e', '{"format":"something-else"}');
    await wrong.run();
    assert.deepEqual(wrong.last(), ['error', 'That file is not a Waypoint export for Foundry.']);
    const none = mockFoundry(13, 'dnd5e', null);
    await none.run();
    assert.deepEqual(none.notes, []);
    const old = mockFoundry(9, 'dnd5e', JSON.stringify(bundle));
    await old.run();
    assert.deepEqual(old.last(), ['error', 'Waypoint imports need Foundry VTT 10 or newer.']);
  },
);

// WAYPOINT_SITE_OUT=<file> also writes the player site from the installed campaign, as it should stand now.
// Entries sent before their session was played are left out, so the file shows what the party should know right now.
if (process.env.WAYPOINT_SITE_OUT) {
  const now = installed.sessions.findIndex((x) => !x.done);
  const early = sentEntries(installed)
    .filter((e) => {
      const p = pb.playerWiki?.find((x) => x.id === e.id);
      return p && entryStatus(takeDown(installed, e.id), p, Math.max(0, now)) === 'later';
    })
    .map((e) => e.id);
  fs.writeFileSync(process.env.WAYPOINT_SITE_OUT, siteHtml(early.reduce(takeDown, installed)));
  console.log('site written without', early.length ? early.join(', ') : 'nothing');
}
console.log(failures ? failures + ' failed' : 'All playbook checks passed.');
process.exit(failures ? 1 : 0);
