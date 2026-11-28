// Assembles the Seventh Bell update pack (revision 7.21) from the authored files and checks every edit anchor against the live campaign.
// node tools/build-pack.cjs  →  waypoint/desktop/data/packs/seventh-bell-v7.json and outputs/The-Seventh-Bell-v7.waypoint-pack.json
const fs = require('fs'),
  path = require('path');
const P = require(path.join(__dirname, '../paths.cjs'));
const root = path.join(__dirname, '..'),
  pack = (p) => path.join(root, 'pack', p);
const campaignIn = (file) =>
  JSON.parse(fs.readFileSync(file, 'utf8')).campaigns.find(
    (c) => c.id === 'the-seventh-bell-corvane-v5',
  );
const live = campaignIn(P.snapshot),
  baseline = campaignIn(P.baseline);
const { rename } = require(pack('terms.cjs'));
const flags = JSON.parse(fs.readFileSync(pack('flags.json'), 'utf8'));
const lore = require(pack('lore.cjs')),
  statblocks = require(pack('statblocks.cjs')),
  endings = require(pack('endings.cjs'));
const files = fs
  .readdirSync(path.join(root, 'pack'))
  .filter((f) => /^(act.*|anytime.*)\.json$/.test(f))
  .sort();
const plays = [],
  briefs = [],
  encounters = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(pack(f), 'utf8'));
  plays.push(...(d.plays || []));
  briefs.push(...(d.briefs || []));
  encounters.push(...(d.encounters || []));
}
// Expected party level at the start of each chapter (v5 milestones), in session order.
// The table starts at level 3 with four players (DM, 2026-10-31): early chapters use max(3, the v5 milestone).
const levels = [
  3, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 9, 9, 10, 11, 11, 11,
  11,
];
const problems = [];
const warn = (m) => problems.push(m);
const keep = [
  'id',
  'title',
  'style',
  'likelihood',
  'why',
  'readAloud',
  'response',
  'consequence',
  'fallback',
  'tells',
  'rules',
  'later',
  'keywords',
  'scene',
  'when',
  'effects',
];
const required = [
  'id',
  'title',
  'style',
  'likelihood',
  'why',
  'readAloud',
  'response',
  'consequence',
  'fallback',
];
// Required Branch fields are always present (possibly empty); optional ones are dropped when empty.
const clean = (p) => {
  const o = {};
  for (const k of keep)
    if (required.includes(k)) o[k] = p[k] ?? '';
    else if (p[k] !== undefined && p[k] !== '') o[k] = p[k];
  o.origin = 'playbook';
  return o;
};
const bySession = new Map();
for (const p of plays.filter((p) => p.sessionId)) {
  if (!live.sessions.some((s) => s.id === p.sessionId))
    warn('play ' + p.id + ' has unknown session');
  if (!bySession.has(p.sessionId)) bySession.set(p.sessionId, []);
  bySession.get(p.sessionId).push(clean(p));
}
const anytime = plays.filter((p) => !p.sessionId).map(clean);
const loreSessions = new Map(lore.sessions.map((s) => [s.id, s]));
// Checks edits as Waypoint places them: in order, on the renamed text; an edit whose replacement is already there counts as placed.
// The live campaign already has revision 7, so its earlier edits are found by their replacements and the new ones by their anchors.
const placeable = (text, edits, label) => {
  let t = rename(text);
  for (const e of edits) {
    const f = rename(e.find),
      r = rename(e.replace);
    if ((r && t.includes(r)) || (e.unless && t.includes(e.unless))) continue;
    if (t.includes(f)) t = t.replace(f, r);
    else warn(label + ': anchor not found: ' + e.find.slice(0, 70));
  }
};
const sessions = live.sessions
  .map((s) => {
    const out = { id: s.id };
    const l = loreSessions.get(s.id);
    if (bySession.has(s.id)) {
      out.plays = bySession.get(s.id);
      const base = baseline.sessions.find((x) => x.id === s.id) || s;
      const guide = [
        ...new Set(
          [...base.branches, ...s.branches]
            .filter((br) => br.likelihood === 'Scenario from the guide')
            .map((br) => br.id),
        ),
      ];
      if (guide.length) out.retire = guide;
    }
    if (l) {
      out.edits = l.edits.map(({ find, replace, unless }) => ({
        find,
        replace,
        ...(unless ? { unless } : {}),
      }));
      out.summary = l.summary;
      placeable(s.plan, l.edits, 'session ' + s.title);
    }
    return out;
  })
  .filter((s) => s.plays || s.edits);
const cardEdits = lore.cardEdits.map((x) => {
  const card = live.cards.find((c) => c.id === x.id);
  if (!card) warn('card edit target missing: ' + x.id);
  else {
    if (x.title && card.title !== x.title.from && card.title !== x.title.to)
      warn('card ' + x.id + ': title is ' + card.title);
    placeable(card.body, x.edits || [], 'card ' + card.title);
  }
  return x;
});
const pageEdits = lore.pageEdits.map((x) => {
  const page = live.memory.pages.find((p) => p.id === x.id);
  if (!page) {
    warn('page edit target missing: ' + x.id);
    return x;
  }
  const edits = x.edits.map((e) =>
    e.find === '__WHOLE__'
      ? { ...e, find: (baseline.memory.pages.find((p) => p.id === x.id) || page).body }
      : e,
  );
  placeable(page.body, edits, 'page ' + page.title);
  if (x.quote && page.quote !== x.quote.from && page.quote !== x.quote.to)
    warn('page ' + page.title + ': source note is ' + page.quote);
  if (x.aliases && page.aliases !== x.aliases.from && page.aliases !== x.aliases.to)
    warn('page ' + page.title + ': other names are ' + page.aliases);
  return { ...x, edits };
});
for (const field of new Set(lore.campaign.edits.map((e) => e.field)))
  placeable(
    live[field],
    lore.campaign.edits.filter((e) => e.field === field),
    'campaign ' + field,
  );
placeable(live.memory.planner.locked, lore.planner.locked, 'planner');
const briefOut = briefs.map((b) => ({
  ...b,
  level: levels[live.sessions.findIndex((s) => s.id === b.sessionId)] || undefined,
}));
const statIds = new Set(statblocks.map((s) => s.id));
for (const e of encounters)
  for (const c of e.creatures)
    if (c.statblock && !statIds.has(c.statblock))
      warn('encounter ' + e.id + ' uses unknown statblock ' + c.statblock);
const encIds = new Set(encounters.map((e) => e.id));
for (const b of briefs)
  for (const id of b.encounters)
    if (!encIds.has(id)) warn('brief ' + b.sessionId + ' lists missing encounter ' + id);
const memoryPage = lore.pages.find((p) => p.id === 'v6-memory-money');
const sessionCount = sessions.filter((s) => s.plays).length,
  playCount = [...bySession.values()].reduce((n, l) => n + l.length, 0);
const result = {
  kind: 'waypoint-update-pack',
  version: 1,
  id: 'seventh-bell-v7',
  title: 'The Seventh Bell · revision 7.21',
  summary: `Revision 7.21 of The Seventh Bell, for Waypoint 1.48. It installs over revisions 7.20 to 7, revision 6 or the original campaign, and keeps your world state, notes and the wiki entries you have sent.

- **Side dungeons (7.21).** Seven optional cellars and hideouts in Sessions 1 to 10, and the Frost Spire as Session 14's dungeon: keyed rooms, traps, hidden treasure and a fight each.
- **Pacing, treasure and growth (7.20).** A Glassreach clock and Act II choices that pay off in Glassreach; Sessions 12 and 13 in one evening; march on the Tor short-handed; a fight in each talking session; two Rare items each by level 9 and a bell-charm; a personal beat per character per act, lost things won back, Toll-marks, standing perks, bell boons.
- **Reshape and quick wins (7.18, 7.19).** Work for or reform the Court, back a claimant, open the Seam or swear to the Hush; faction clocks act at 6; Act I debts return in Sessions 22 and 23.
- **Plain speech (7.17).** Guides, plays, the player wiki and handouts reworded to say each thing once, plainly; no rules change.
- **Pop-outs (7.16).** Wiki pages for the seven bells, the endings, the campaign's own words (Ringer, Tithe…), the Mere and seventeen people; names in plans open their pages; Encounter Lists match the Combat tab.
- **Run Acts II to V from the page (7.9 to 7.15).** Sessions 4 to 30 gain the full new-DM guide and table card; their plans match the play cards, and calming a Stilled is DC 15.
- **Words ready for every NPC (7.12).** Each NPC page gains a first look to read aloud and lines to say.
- **Silly and serious (7.8).** **Bring it back** lines for jokes that run on, **Where to break**, recaps that name what was lost, session zero's **Silly and serious**, and an **Epilogue round**.
- **Know who is in the room (7.7).** Sessions 1 to 3 gain **Key people tonight**, **Places at a glance** and a d6 rumour table; session zero gains optional **Table jobs**.
- **Tolls that cost (7.5).** Before a ringing the DM warns of the kind and the weight, never exactly what. Tolls last and escalate: Heavy, then Grievous, then Ruinous. Vaer's dawn lasts a year, Calla's harvest a season. World wiki → 2.7 The Toll.
- **Run Act I from the page (7.1 to 7.6).** Sessions 1 to 3 each gain **Running this session (new DM guide)** and a table card; every "If they…" option is a button that opens its play; session zero becomes a full guide (World wiki → 1.4).
- **Tongues are now Hearts** (Ossa's Heart, the Heart-Hound). One review item renames the word in your wiki pages, notes and saved cards; the chronicle keeps its words.
- **Built for your table: four characters starting at level 3.** Every encounter is rebudgeted with the 2024 XP rules for the level each chapter expects.
- **The finale.** Acts IV and V have full sets of prepared plays, and every ending can be reached and recorded. Maudrin as Keeper of the Seventh (CR 12, legendary actions).
- **Nothing gets stranded.** Every place a Tongue, the Key or a person can end up has a play that moves it on, and "Down the line" notes point at the sessions that deliver them, so Waypoint can bring them back in your prep brief.
- **Fixes from a full audit:** timeline slips, unearned state, 2024 rulings for the party's spells, and stat block arithmetic.
- **A player site.** The handouts, the painted map and a player wiki in one site.html you upload. Prepared wiki entries wait in Waypoint until you press **Send to wiki**.
- **Corvane in the Realms,** as in revision 6: the Stormwall and the Seam, Pellmoor Landing as a port, memory as money.
- **Foresight playbook.** ${playCount} prepared plays across ${sessionCount} chapters and ${anytime.length} anytime plays; ${flags.length} tracked world-state facts; ${briefOut.length} session prep briefs; ${encounters.length} encounters; ${statblocks.length} Corvane stat blocks built on the 2024 Monster Manual; and an ending forecast.

Your notes, chronicle and any world state you have recorded are kept. Replaced wiki text moves to each page's revision history.`,
  match: { campaignIds: ['the-seventh-bell-corvane-v5'], names: ['The Seventh Bell'] },
  campaign: { edits: lore.campaign.edits },
  planner: lore.planner,
  sessions,
  remove: lore.remove,
  pages: lore.pages.map((page) => ({ mode: 'replace', page })),
  pageEdits,
  cardEdits,
  playbook: {
    id: 'seventh-bell',
    title: 'The Seventh Bell playbook',
    version: '7.21',
    flags,
    anytime,
    encounters,
    statblocks,
    briefs: briefOut,
    endings,
    references: [{ title: 'Memory money: rates and table rules', body: memoryPage.body }],
  },
};
// "Tongue" becomes "Heart" in everything the pack carries; the pack also asks Waypoint to rename the DM's own text the same way.
const { terms, deep } = require(pack('terms.cjs'));
Object.assign(result, deep(result, ''));
result.terms = terms;
// The player site: prepared player-safe wiki entries and the site's fixed pages (handouts and map, built by tools/build-handouts.cjs).
// The pages are added after the rename (they were renamed when built), so the map image's data is never touched.
const wikiFile = pack('player-wiki.json');
result.playbook.playerWiki = deep(
  fs.existsSync(wikiFile) ? JSON.parse(fs.readFileSync(wikiFile, 'utf8')).entries : [],
  '',
);
result.playbook.site = JSON.parse(fs.readFileSync(path.join(root, 'handouts/site.json'), 'utf8'));
if (result.summary.length > 4000)
  warn('summary is ' + result.summary.length + ' characters; Waypoint accepts 4000');
const json = JSON.stringify(result);
fs.writeFileSync(path.join(P.packs, 'seventh-bell-v7.json'), json);
fs.writeFileSync(
  path.join(P.outputs, 'The-Seventh-Bell-v7.waypoint-pack.json'),
  JSON.stringify(result, null, 1),
);
console.log(
  `plays ${playCount} in ${sessionCount} sessions, anytime ${anytime.length}, briefs ${briefOut.length}, encounters ${encounters.length}, statblocks ${statblocks.length}, pages +${lore.pages.length}, page edits ${pageEdits.reduce((n, x) => n + x.edits.length, 0)}, size ${(json.length / 1024).toFixed(0)} KB`,
);
const missingBriefs = live.sessions
  .filter((s) => !briefs.some((b) => b.sessionId === s.id))
  .map((s) => s.title);
if (missingBriefs.length) console.log('sessions without a brief yet: ' + missingBriefs.length);
for (const p of problems) console.log('PROBLEM', p);
process.exit(problems.length ? 1 : 0);
