// The Foundry VTT script macro that imports a Waypoint export (lib/foundry-export.ts). The DM pastes it into a new Script
// macro and runs it as a GM. It works on Foundry 10 and newer: folders, journal entries with their pages, roll tables, and,
// in a dnd5e world, NPC actors. Ids come from the file, so running it again updates the same documents; journal pages and
// actor items the DM added in Foundry stay. The text below runs inside Foundry, not Waypoint.
export const foundryMacro = String.raw`// Waypoint import for Foundry VTT. Run as a GM, then choose the .foundry.json file Waypoint saved.
// Running it again with a newer file updates what Waypoint made and keeps what you added in Foundry.
if (!game.user || !game.user.isGM) return ui.notifications.warn('Only a GM can import from Waypoint.');
const gen = Number(
  (game.release && game.release.generation) || String(game.version || '0').split('.')[0],
);
if (gen < 10) return ui.notifications.error('Waypoint imports need Foundry VTT 10 or newer.');
const file = await new Promise((resolve) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
  input.oncancel = () => resolve(null);
  input.click();
});
if (!file) return;
let data = null;
try {
  data = JSON.parse(await file.text());
} catch (e) {
  data = null;
}
if (!data || data.format !== 'waypoint-foundry' || data.version !== 1)
  return ui.notifications.error('That file is not a Waypoint export for Foundry.');
ui.notifications.info('Importing ' + data.campaign + ' from Waypoint…');
const tally = { created: 0, updated: 0 };
const failed = [];
const why = (e) => (e && e.message ? e.message : String(e));
// A batch goes in one request; if it fails, its documents go one at a time so one bad document doesn't stop the rest.
async function each(type, list, run) {
  if (!list.length) return 0;
  try {
    await run(list);
    return list.length;
  } catch (batchError) {
    let ok = 0;
    for (const d of list)
      try {
        await run([d]);
        ok++;
      } catch (e) {
        failed.push(type + ' "' + d.name + '": ' + why(e));
      }
    return ok;
  }
}
// Creates the documents Foundry doesn't have yet and updates the ones it does. Returns the ones that were already there.
async function save(type, docs, forUpdate) {
  const cls = CONFIG[type].documentClass;
  const have = game.collections.get(type);
  const fresh = docs.filter((d) => !have.has(d._id));
  const known = docs.filter((d) => have.has(d._id));
  tally.created += await each(type, fresh, (list) =>
    cls.createDocuments(list, { keepId: true, keepEmbeddedIds: true }),
  );
  tally.updated += await each(type, known.map(forUpdate || ((d) => d)), (list) =>
    cls.updateDocuments(list),
  );
  return known;
}
const without = (key) => (d) => {
  const copy = Object.assign({}, d);
  delete copy[key];
  return copy;
};
const key = (doc) => (doc.flags && doc.flags.world ? doc.flags.world.waypoint : undefined);
const dnd5e = game.system && game.system.id === 'dnd5e';

// Folders, parents before the folders inside them. Creature folders only where creatures are made.
const folders = data.folders.filter((f) => f.type !== 'Actor' || dnd5e);
await save('Folder', folders.filter((f) => !f.folder));
await save('Folder', folders.filter((f) => f.folder));

// Journal entries. An entry that is already there gets its Waypoint pages updated or added; other pages stay.
const knownEntries = await save('JournalEntry', data.journal, without('pages'));
for (const j of knownEntries) {
  const entry = game.journal.get(j._id);
  if (!entry) continue;
  const byKey = new Map(entry.pages.contents.map((p) => [key(p), p.id]));
  const update = [];
  const create = [];
  for (const p of j.pages) {
    const at = entry.pages.has(p._id) ? p._id : byKey.get(key(p));
    if (at) update.push(Object.assign({}, p, { _id: at }));
    else create.push(p);
  }
  try {
    if (update.length) await entry.updateEmbeddedDocuments('JournalEntryPage', update);
    if (create.length)
      await entry.createEmbeddedDocuments('JournalEntryPage', create, { keepId: true });
  } catch (e) {
    failed.push('Journal entry "' + j.name + '" pages: ' + why(e));
  }
}

// Roll tables. Foundry 13 names a text result and keeps its formatting as the description; older versions use text.
const result = (r) => {
  const base = { _id: r._id, range: r.range, weight: r.weight, drawn: false };
  if (gen >= 13)
    return Object.assign(base, {
      type: 'text',
      name: r.name,
      description: r.text.indexOf('<') >= 0 ? r.text : '',
    });
  return Object.assign(base, { type: gen >= 11 ? 'text' : 0, text: r.text });
};
const tables = data.tables.map((t) => Object.assign({}, t, { results: t.results.map(result) }));
const knownTables = await save('RollTable', tables, without('results'));
for (const t of knownTables) {
  const table = game.tables.get(t._id);
  if (!table) continue;
  try {
    const old = table.results.contents.map((r) => r.id);
    if (old.length) await table.deleteEmbeddedDocuments('TableResult', old);
    await table.createEmbeddedDocuments('TableResult', t.results, { keepId: true });
  } catch (e) {
    failed.push('Roll table "' + t.name + '" results: ' + why(e));
  }
}

// Creatures become dnd5e NPCs; in other systems they stay as the stat block journal pages.
let skipped = 0;
if (data.actors.length && dnd5e) {
  const actor = (a) => {
    const system = { details: { biography: { value: a.biography } }, attributes: {}, abilities: {} };
    if (a.cr !== null) system.details.cr = a.cr;
    if (a.ac !== null) system.attributes.ac = { flat: a.ac, calc: 'flat' };
    if (a.hp !== null) system.attributes.hp = { value: a.hp, max: a.hp, formula: a.hpFormula };
    if (a.speed !== null) system.attributes.movement = { walk: a.speed };
    for (const k of Object.keys(a.abilities)) system.abilities[k] = { value: a.abilities[k] };
    return { _id: a._id, name: a.name, type: 'npc', folder: a.folder, system, flags: a.flags };
  };
  await save('Actor', data.actors.map(actor), without('type'));
} else skipped = data.actors.length;

if (failed.length) console.warn('Waypoint import problems:\n' + failed.join('\n'));
ui.notifications[failed.length ? 'warn' : 'info'](
  'Waypoint import: ' +
    tally.created +
    ' created, ' +
    tally.updated +
    ' updated' +
    (failed.length ? ', ' + failed.length + ' failed (details in the console, F12)' : '') +
    (skipped ? '. Creatures are made only in a dnd5e world; their stat blocks are in the journal.' : '.'),
  { permanent: true },
);
`;
