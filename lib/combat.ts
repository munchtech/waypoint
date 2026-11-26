import type { Playbook, Encounter } from './playbook';
import type { WikiPage } from './memory';

export type EncounterCreature = Encounter['creatures'][number];
export function sessionEncounters(pb: Playbook | undefined, sessionId: string) {
  if (!pb) return [];
  const listed = pb.briefs.find((brief) => brief.sessionId === sessionId)?.encounters || [];
  return pb.encounters.filter(
    (encounter) => encounter.sessionId === sessionId || listed.includes(encounter.id),
  );
}
const normalized = (text: string) =>
  text
    .toLowerCase()
    .replace(/^\s*[\d.]+\s*/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const inOrder = (want: string[], words: string[]) => {
  let at = 0;
  for (const w of words) if (w === want[at]) at++;
  return at === want.length;
};
// The campaign's stat block a name points to: its exact name first, then (when only one block fits) the name without its
// bracket or its epithet ("The Glass Sexton", "Keeper of the Seventh"), then a shortened name ("Captain Rook" for
// Captain Dessa Rook). A one-word name only ever matches exactly, so "Mage" stays the library's Mage.
function campaignBlock(clean: string, pb?: Playbook) {
  const want = normalized(clean),
    blocks = pb?.statblocks || [],
    one = <T>(hits: T[]) => (hits.length === 1 ? hits[0] : undefined);
  if (!want) return undefined;
  return (
    blocks.find((b) => normalized(b.name) === want) ||
    one(
      blocks.filter((b) => {
        const bare = b.name.replace(/\s*\(.*$/, '');
        return [bare, bare.split(/,\s*/)[1] || ''].some((part) => normalized(part) === want);
      }),
    ) ||
    (want.includes(' ')
      ? one(blocks.filter((b) => inOrder(want.split(' '), normalized(b.name).split(' '))))
      : undefined)
  );
}
// A creature named in text ("Druid", "Hushman Sergeant"): the campaign's own stat block when it has one, else the offline
// library's creature of that name.
export function creatureByName(name: string, pb?: Playbook, cr = ''): EncounterCreature {
  const clean = name.replace(/\s*\(.*$/, '').trim(),
    block = campaignBlock(clean, pb);
  return block
    ? { name: block.name, statblock: block.id, base: block.base, cr: block.cr, count: 1 }
    : { name: clean, base: clean, cr, count: 1 };
}
// A "Stat block" cell of a session table ("Noble, two Toughs", "Hush Cultist (Wat); no stats (Pip)"), cut into its
// parts; a part that names a creature carries that name, the joins and "No stats" or "None" carry none.
export function cellCreatures(text: string): { part: string; name?: string }[] {
  return text.split(/(,\s*|\s+\+\s+|\s+and\s+|;\s*)/).map((part, i) => {
    const bare = part.replace(/\(.*?\)/g, '').trim(),
      counted = bare.match(/^(?:a|an|one|two|three|four|five|six|\d+)\s+(.+)$/i),
      name = counted ? counted[1].replace(/(?<=[a-z])s$/, '') : bare;
    return i % 2 === 0 && /^\p{Lu}[\p{L}' -]{2,}$/u.test(name) && !/^(?:No|None)\b/i.test(name)
      ? { part, name }
      : { part };
  });
}
// The book's NPC entries name their numbers in a line like "**2024 stat block:** Druid (CR 2), with reed-healing flavour"
// or "**Stat-lite:** Use Scholar (CR 1) for talk". A flavoured name ("Commoner-clerk") falls back to its base creature.
export function statLine(body: string, pb?: Playbook): EncounterCreature[] {
  const m = body.match(
    /(?:stat block|Stat-lite):?\*\*:?\s*(?:Use\s+)?([A-Z][\p{L}' -]*?)(?:\s+stats)?\s*(?:\(CR ([\d/]+)[^)]*\)|[.,;\n])/u,
  );
  if (!m) return [];
  const found = creatureByName(m[1], pb, m[2] || '');
  return [
    found.statblock || !m[1].includes('-')
      ? found
      : creatureByName(m[1].split('-')[0], pb, m[2] || ''),
  ];
}
export function pageCreatures(page: WikiPage, pb?: Playbook): EncounterCreature[] {
  if (!pb) return statLine(page.body);
  const names = [page.title, ...page.aliases.split(/[,;\n]/)]
    .map(normalized)
    .filter((name) => name.length >= 4);
  const matches = (name: string) =>
    names.some((alias) => {
      const candidate = normalized(name);
      return candidate === alias || (' ' + candidate + ' ').includes(' ' + alias + ' ');
    });
  const blocks = pb.statblocks.map((block) => ({
    name: block.name,
    statblock: block.id,
    base: block.base,
    cr: block.cr,
    count: 1,
  }));
  const all = [...pb.encounters.flatMap((encounter) => encounter.creatures), ...blocks];
  const exact = all.filter((creature) => names.includes(normalized(creature.name)));
  const named = exact.length ? exact : all.filter((creature) => matches(creature.name));
  const candidates = named.length ? named : statLine(page.body, pb);
  return candidates.filter(
    (creature, i, list) =>
      list.findIndex(
        (other) => (other.statblock || other.base) === (creature.statblock || creature.base),
      ) === i,
  );
}
