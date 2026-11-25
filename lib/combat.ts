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
// A creature named in text ("Druid", "Hushman Sergeant"): the campaign's own stat block when it has one, else the offline
// library's creature of that name.
export function creatureByName(name: string, pb?: Playbook, cr = ''): EncounterCreature {
  const clean = name.replace(/\s*\(.*$/, '').trim(),
    block = pb?.statblocks.find((b) => normalized(b.name) === normalized(clean));
  return block
    ? { name: block.name, statblock: block.id, base: block.base, cr: block.cr, count: 1 }
    : { name: clean, base: clean, cr, count: 1 };
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
