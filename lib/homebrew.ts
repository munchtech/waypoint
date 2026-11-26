import { z } from 'zod';
import { statblockSchema, type Encounter, type StatBlock } from './playbook-schema';
import type { RuleEntry, RuleReference } from './rules';

// Homebrew creatures: a copy of a library creature that the DM renames and reskins. Copies live beside the playbook
// (memory.homebrew), so applying an update pack never replaces them, and a campaign without a playbook has them too.
export const HOMEBREW_LIMIT = 80,
  HOMEBREW_BODY = 12000;
export const homebrewBlock = statblockSchema.extend({
  // The library entry it was copied from, so the original can be opened again.
  from: z.string().max(200).optional(),
  edition: z.string().max(40).optional(),
  source: z.string().max(40).optional(),
  updated: z.string().max(40),
});
export type HomebrewBlock = z.infer<typeof homebrewBlock>;
export const isHomebrew = (block: { id: string }) => block.id.startsWith('hb-');

const shortened = '[Shortened: the original is longer. Open the original for the rest.]';
// A copy of a library creature, named "Goblin (homebrew)" until the DM renames it; a second copy is "(homebrew 2)".
export function homebrewFrom(
  entry: RuleEntry,
  have: { name: string }[],
  id: string = crypto.randomUUID(),
  now = new Date().toISOString(),
): HomebrewBlock {
  const taken = new Set(have.map((b) => b.name.toLowerCase()));
  let name = entry.name + ' (homebrew)';
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${entry.name} (homebrew ${n})`;
  let body = [entry.summary, entry.body].filter(Boolean).join('\n\n');
  if (body.length > HOMEBREW_BODY) {
    const cut = body.lastIndexOf('\n\n', HOMEBREW_BODY - shortened.length - 2);
    body = body.slice(0, cut > 0 ? cut : HOMEBREW_BODY - shortened.length - 2) + '\n\n' + shortened;
  }
  return {
    id: 'hb-' + id,
    name: name.slice(0, 160),
    cr: (entry.summary.match(/\bCR ([\d/]+)/)?.[1] || '?').slice(0, 8),
    base: entry.name.slice(0, 160),
    body,
    from: entry.id.slice(0, 200),
    edition: entry.edition.slice(0, 40),
    source: entry.source.slice(0, 40),
    updated: now,
  };
}
export const withHomebrew = (list: HomebrewBlock[], block: HomebrewBlock) =>
  list.some((b) => b.id === block.id)
    ? list.map((b) => (b.id === block.id ? block : b))
    : [...list, block];
export const withoutHomebrew = (list: HomebrewBlock[], id: string) =>
  list.filter((b) => b.id !== id);
// What a session pins, like a library reference: a snapshot of the copy as it is now.
export function homebrewReference(block: HomebrewBlock): RuleReference {
  const text = `CR ${block.cr} · homebrew built on ${block.base}\n\n${block.body}`;
  return {
    id: block.id,
    name: block.name,
    kind: 'Creature',
    source: 'Homebrew',
    edition: block.edition || '',
    page: '',
    body: text.length > 8000 ? text.slice(0, 7900) + '\n\n[Snapshot shortened.]' : text,
  };
}

// Every stat block the campaign can look up: its playbook's, then its homebrew copies.
export type Bestiary = { statblocks: StatBlock[]; encounters: Encounter[] };
export function bestiaryOf(m: {
  playbook?: Bestiary;
  homebrew?: HomebrewBlock[];
}): Bestiary | undefined {
  const own = m.homebrew || [];
  if (!own.length) return m.playbook;
  return {
    statblocks: [...(m.playbook?.statblocks || []), ...own],
    encounters: m.playbook?.encounters || [],
  };
}
