import MarkdownIt from 'markdown-it';
import type { Campaign } from './campaign';
import { kindTitles, partyKnows } from './campaign-book';
import { bestiaryOf } from './homebrew';
import { memoryOf, pageKinds, type WikiPage } from './memory';
import { pageName } from './page-name';
import type { StatBlock } from './playbook';
import { campaignTables } from './roll-tables';
import { mentionIndex, splitMentions } from './wiki-mentions';

// A file Foundry VTT can import: the wiki as journal entries (players see what the party knows), handouts, session plans,
// roll tables and stat blocks. Every id comes from the campaign and the thing itself, so importing the file again updates
// the same Foundry documents instead of making copies. `foundryMacro` (lib/foundry-macro.ts) does the importing.
export const foundryParts = ['wiki', 'handouts', 'sessions', 'tables', 'creatures'] as const;
export type FoundryPart = (typeof foundryParts)[number];
export const foundryPartLabels: Record<FoundryPart, string> = {
  wiki: 'Wiki pages',
  handouts: 'Handouts',
  sessions: 'Session plans',
  tables: 'Roll tables',
  creatures: 'Stat blocks',
};
// Foundry's permission levels: NONE hides a document from players, OBSERVER lets them read it.
export const NONE = 0,
  OBSERVER = 2;

// The world scope is one every Foundry version accepts; it holds the Waypoint key the document came from.
type Flags = { world: { waypoint: string } };
export type FoundryFolder = {
  _id: string;
  name: string;
  type: 'JournalEntry' | 'RollTable' | 'Actor';
  folder: string | null;
  sorting: 'a' | 'm';
  sort: number;
  flags: Flags;
};
export type FoundryPage = {
  _id: string;
  name: string;
  type: 'text';
  sort: number;
  title: { show: boolean; level: number };
  text: { content: string; format: 1 };
  flags: Flags;
};
export type FoundryJournal = {
  _id: string;
  name: string;
  folder: string | null;
  sort: number;
  ownership: { default: number };
  pages: FoundryPage[];
  flags: Flags;
};
export type FoundryResult = {
  _id: string;
  range: [number, number];
  weight: number;
  // The row as Foundry HTML, and as plain text for a result's name.
  text: string;
  name: string;
};
export type FoundryTable = {
  _id: string;
  name: string;
  folder: string | null;
  description: string;
  formula: string;
  replacement: true;
  displayRoll: true;
  results: FoundryResult[];
  flags: Flags;
};
export type Abilities = Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>;
// A creature in no game system's shape; the macro turns it into a dnd5e NPC when the world runs dnd5e.
export type FoundryCreature = {
  _id: string;
  name: string;
  folder: string | null;
  cr: number | null;
  ac: number | null;
  hp: number | null;
  hpFormula: string;
  speed: number | null;
  abilities: Partial<Abilities>;
  biography: string;
  flags: Flags;
};
export type FoundryBundle = {
  format: 'waypoint-foundry';
  version: 1;
  campaign: string;
  exported: string;
  folders: FoundryFolder[];
  journal: FoundryJournal[];
  tables: FoundryTable[];
  actors: FoundryCreature[];
};

// A Foundry id (16 letters and digits) that is always the same for the same seed: two 53-bit hashes, 8 digits each.
function hash53(text: string, seed: number) {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export function foundryId(seed: string) {
  let out = '';
  for (const part of [hash53(seed, 1), hash53(seed, 2)])
    for (let n = part, i = 0; i < 8; i++, n = Math.floor(n / 62)) out += digits[n % 62];
  return out;
}

// A stat block's numbers, read from the two shapes Waypoint holds: the adventure pack's ("**AC** 12 · **HP** 32 (5d8 +
// 10) · **Speed** 30 ft." with an ability table) and the rules library's ("Armor class" / "Hit points" lines and
// "STR 8 (-1) · DEX 14 (+2)").
const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export function crValue(cr: string): number | null {
  const t = cr.trim(),
    frac = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null;
  return /^\d+(?:\.\d+)?$/.test(t) ? Number(t) : null;
}
export function creatureStats(block: Pick<StatBlock, 'body' | 'cr'>) {
  const body = block.body.replace(/\r/g, '');
  const num = (...patterns: RegExp[]) => {
    for (const p of patterns) {
      const m = body.match(p);
      if (m) return m;
    }
    return null;
  };
  const ac = num(/\*\*AC\*\*\s*(\d{1,2})\b/, /^Armor class\s*\n\D*?(\d{1,2})\b/im),
    hp = num(
      /\*\*HP\*\*\s*(\d{1,4})\b\s*(?:\(([^)]*)\))?/,
      /^Hit points\s*\n\s*(\d{1,4})\b\s*(?:\(([^)]*)\))?/im,
    ),
    speed = num(/\*\*Speed\*\*\D*?(\d{1,3})\s*ft/, /^Speed\s*\n\D*?(\d{1,3})\b/im);
  const abilities: Partial<Abilities> = {};
  const head = body.match(
    /^\|\s*STR\s*\|\s*DEX\s*\|\s*CON\s*\|\s*INT\s*\|\s*WIS\s*\|\s*CHA\s*\|.*$/im,
  );
  if (head) {
    const rows = body
      .slice(head.index! + head[0].length)
      .split('\n')
      .filter((line) => line.trim().startsWith('|'))
      .filter((line) => !/^\|[\s|:-]+\|?$/.test(line.trim()));
    const cells = (rows[0] || '').split('|').slice(1, 7);
    cells.forEach((cell, i) => {
      const v = cell.match(/^\s*(\d{1,2})\b/);
      if (v) abilities[abilityKeys[i]] = Number(v[1]);
    });
  } else
    for (const key of abilityKeys) {
      const v = body.match(new RegExp('\\b' + key.toUpperCase() + '\\s+(\\d{1,2})\\b'));
      if (v) abilities[key] = Number(v[1]);
    }
  return {
    cr: crValue(block.cr),
    ac: ac ? Number(ac[1]) : null,
    hp: hp ? Number(hp[1]) : null,
    hpFormula: (hp?.[2] || '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(\d+d\d+)\s*([+-])\s*/, '$1 $2 '),
    speed: speed ? Number(speed[1]) : null,
    abilities,
  };
}

// Markdown to Foundry HTML. Names of other exported pages and creatures become Foundry links, the first mention on each
// page only, and a page never links to itself.
type LinkEnv = {
  index: ReturnType<typeof mentionIndex> | null;
  seen: Set<string>;
  target: (id: string) => string | null;
};
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const md = new MarkdownIt({ html: false, linkify: false, breaks: false });
md.renderer.rules.text = (tokens, idx, _options, linkEnv) => {
  const text = tokens[idx].content,
    env = linkEnv as LinkEnv | undefined;
  let inLink = false;
  for (let i = idx - 1; i >= 0; i--)
    if (tokens[i].type === 'link_close') break;
    else if (tokens[i].type === 'link_open') {
      inLink = true;
      break;
    }
  if (!env?.index || inLink) return escape(text);
  return splitMentions(text, env.index, env.seen)
    .map((part) => {
      const to = part.pageId && env.target(part.pageId);
      return to ? `@UUID[${to}]{${part.text.replace(/[{}[\]]/g, '')}}` : escape(part.text);
    })
    .join('');
};
// Links into Waypoint itself (go: pages, # anchors) mean nothing in Foundry, so they keep only their words.
const kept = (href: string | number | null) => /^(https?:|mailto:)/i.test(String(href ?? ''));
md.renderer.rules.link_open = (tokens, idx, options, _env, self) =>
  kept(tokens[idx].attrGet('href')) ? self.renderToken(tokens, idx, options) : '';
md.renderer.rules.link_close = (tokens, idx, options, _env, self) => {
  for (let i = idx - 1; i >= 0; i--)
    if (tokens[i].type === 'link_open')
      return kept(tokens[i].attrGet('href')) ? self.renderToken(tokens, idx, options) : '';
  return self.renderToken(tokens, idx, options);
};
const toHtml = (text: string, env: LinkEnv) => md.render(text || '', env).trim();
const inlineHtml = (text: string) =>
  md.renderInline(text || '', { index: null, seen: new Set(), target: () => null }).trim();
const plainText = (text: string) =>
  text
    .replace(/\*\*|__|\*|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export function foundryBundle(
  c: Campaign,
  parts: FoundryPart[],
  now = new Date().toISOString(),
): FoundryBundle {
  const m = memoryOf(c),
    want = (part: FoundryPart) => parts.includes(part),
    id = (key: string) => foundryId(c.id + ':' + key),
    flags = (key: string): Flags => ({ world: { waypoint: key } });
  const pages = want('wiki') ? m.pages : [],
    handouts = want('handouts') ? m.handouts || [] : [],
    blocks: StatBlock[] = want('creatures') ? bestiaryOf(m)?.statblocks || [] : [],
    tables = want('tables') ? campaignTables(c) : [];
  const folders: FoundryFolder[] = [],
    folder = (key: string, name: string, type: FoundryFolder['type'], parent: string | null) => {
      const f: FoundryFolder = {
        _id: id('folder:' + key),
        name,
        type,
        folder: parent,
        sorting: 'a',
        sort: folders.length * 1000,
        flags: flags('folder:' + key),
      };
      folders.push(f);
      return f._id;
    };
  const rootName = c.name.trim() + ' (Waypoint)';
  const journalRoot =
    pages.length || handouts.length || blocks.length || (want('sessions') && c.sessions.length)
      ? folder('journal', rootName, 'JournalEntry', null)
      : null;
  const statEntry = id('statblocks'),
    statPage = (block: StatBlock) => id('statblock:' + block.id);
  const blockByName = new Map(blocks.map((b) => [b.name, b]));
  // Where a mention links: a wiki page's entry, or a creature's page in the stat block entry.
  const target = (to: string) => {
    if (to.startsWith('creature:')) {
      const block = blockByName.get(to.slice('creature:'.length));
      return block ? `JournalEntry.${statEntry}.JournalEntryPage.${statPage(block)}` : null;
    }
    return pages.some((p) => p.id === to) ? 'JournalEntry.' + id('page:' + to) : null;
  };
  const index =
    pages.length || blocks.length
      ? mentionIndex(
          pages,
          undefined,
          blocks.map((b) => b.name),
        )
      : null;
  const html = (text: string, self?: string) =>
    toHtml(text, { index, seen: new Set(self ? [self] : []), target });
  const page = (key: string, name: string, content: string, sort = 0): FoundryPage => ({
    _id: id(key),
    name,
    type: 'text',
    sort,
    title: { show: true, level: 1 },
    text: { content, format: 1 },
    flags: flags(key),
  });
  const journal: FoundryJournal[] = [];
  const kindFolders = new Map<WikiPage['kind'], string>();
  for (const kind of pageKinds)
    if (pages.some((p) => p.kind === kind))
      kindFolders.set(kind, folder('kind:' + kind, kindTitles[kind], 'JournalEntry', journalRoot));
  for (const p of pages)
    journal.push({
      _id: id('page:' + p.id),
      name: pageName(p),
      folder: kindFolders.get(p.kind) || journalRoot,
      sort: 0,
      ownership: { default: partyKnows(p) ? OBSERVER : NONE },
      pages: [page('page:' + p.id + ':text', pageName(p), html(p.body, p.id))],
      flags: flags('page:' + p.id),
    });
  if (handouts.length) {
    const handoutFolder = folder('handouts', 'Handouts', 'JournalEntry', journalRoot);
    for (const h of handouts)
      journal.push({
        _id: id('handout:' + h.id),
        name: h.title,
        folder: handoutFolder,
        sort: 0,
        ownership: { default: OBSERVER },
        pages: [page('handout:' + h.id + ':text', h.title, html(h.body))],
        flags: flags('handout:' + h.id),
      });
  }
  if (want('sessions') && c.sessions.length)
    journal.push({
      _id: id('sessions'),
      name: 'Session plans',
      folder: journalRoot,
      sort: 0,
      ownership: { default: NONE },
      pages: c.sessions.map((s, i) =>
        page(
          'session:' + s.id,
          'Session ' + (i + 1) + ' · ' + s.title,
          [html(s.plan), s.summary.trim() ? '<h2>What happened</h2>' + html(s.summary) : '']
            .filter(Boolean)
            .join('\n'),
          (i + 1) * 1000,
        ),
      ),
      flags: flags('sessions'),
    });
  if (blocks.length)
    journal.push({
      _id: statEntry,
      name: 'Stat blocks',
      folder: journalRoot,
      sort: 0,
      ownership: { default: NONE },
      pages: [...blocks]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b, i) =>
          page('statblock:' + b.id, b.name, html(b.body, 'creature:' + b.name), (i + 1) * 1000),
        ),
      flags: flags('statblocks'),
    });
  const tableRoot = tables.length ? folder('tables', rootName, 'RollTable', null) : null;
  const foundTables: FoundryTable[] = tables.map((t) => ({
    _id: id('table:' + t.id),
    name: plainText(t.title).slice(0, 200) || 'Roll table',
    folder: tableRoot,
    description: '<p>From ' + escape(t.source) + '</p>',
    formula: '1d' + t.table.sides,
    replacement: true,
    displayRoll: true,
    results: t.table.entries.map((entry, n) => ({
      _id: id('table:' + t.id + ':' + n),
      range: t.table.ranges[n],
      weight: 1 + t.table.ranges[n][1] - t.table.ranges[n][0],
      text: inlineHtml(entry),
      name: plainText(entry).slice(0, 200),
    })),
    flags: flags('table:' + t.id),
  }));
  const actorRoot = blocks.length ? folder('actors', rootName, 'Actor', null) : null;
  const actors: FoundryCreature[] = blocks.map((b) => ({
    _id: id('actor:' + b.id),
    name: b.name,
    folder: actorRoot,
    ...creatureStats(b),
    biography: html(b.body, 'creature:' + b.name),
    flags: flags('actor:' + b.id),
  }));
  return {
    format: 'waypoint-foundry',
    version: 1,
    campaign: c.name,
    exported: now,
    folders,
    journal,
    tables: foundTables,
    actors,
  };
}

// What the file will hold, counted without laying anything out: "212 journal entries · 14 roll tables · 23 creatures".
export function foundrySummary(c: Campaign, parts: FoundryPart[]) {
  const m = memoryOf(c),
    want = (part: FoundryPart) => parts.includes(part),
    blocks = want('creatures') ? bestiaryOf(m)?.statblocks.length || 0 : 0,
    journal =
      (want('wiki') ? m.pages.length : 0) +
      (want('handouts') ? (m.handouts || []).length : 0) +
      (want('sessions') && c.sessions.length ? 1 : 0) +
      (blocks ? 1 : 0),
    tables = want('tables') ? campaignTables(c).length : 0;
  const count = (n: number, one: string, many: string) =>
    n ? n + ' ' + (n === 1 ? one : many) : '';
  return [
    count(journal, 'journal entry', 'journal entries'),
    count(tables, 'roll table', 'roll tables'),
    count(blocks, 'creature', 'creatures'),
  ].filter(Boolean);
}

// The saved file's name: the campaign's name in plain lowercase words.
export function foundryFileName(name: string) {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'campaign';
  return base + '.foundry.json';
}
