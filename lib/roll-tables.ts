import MarkdownIt from 'markdown-it';
import type { Campaign } from './campaign';
import { memoryOf } from './memory';
import { pageName } from './page-name';

// Rollable tables. A Markdown table whose first column is a die ("d6", "d20", "d100", "d%"), or a numbered list right after a
// line that names its die and ends in a colon ("**Rumours (d6), round Yara's fire:**"). Rolling picks a row, and any dice in
// that row ("3d6 × 10 gp", "1d4 + 1 potions") roll too, so a loot table hands over the amounts.
type Token = ReturnType<InstanceType<typeof MarkdownIt>['parse']>[number];
export type Rng = () => number;
export type RollTable = { sides: number; ranges: [number, number][]; entries: string[] };
export type RollMeta = { roll?: RollTable; row?: number };
export type FoundTable = { id: string; title: string; source: string; table: RollTable };

const sidesOf = (value: string) => {
  const n = value === '%' ? 100 : Number(value);
  return n >= 2 && n <= 1000 ? n : null;
};
// A table's first heading: "d6", "1d20", "d%", "Roll (d8)".
export function dieInHead(head: string): number | null {
  const m = head
    .trim()
    .replace(/\*/g, '')
    .match(/^(?:roll\s*)?\(?\s*1?d(\d{1,4}|%)\s*\)?$/i);
  return m ? sidesOf(m[1]) : null;
}
// The line before a numbered list: it names a die and ends in a colon ("Rumours (d6), round Yara's fire:").
export function dieInLabel(text: string): number | null {
  const t = text.trim().replace(/\*/g, '');
  if (!t.endsWith(':')) return null;
  const m = t.match(/(?:^|[\s(])1?d(\d{1,4}|%)(?=[\s),:.]|$)/i);
  return m ? sidesOf(m[1]) : null;
}
// A row's first cell: "4", "2–3", "01–05", "96–00", "19+". A 0 or 00 is the die's top face (d10, d100).
export function rowRange(cell: string, sides: number): [number, number] | null {
  const t = cell.trim().replace(/\*/g, '');
  const m = t.match(/^(\d{1,4})(?:\s*[-–—]\s*(\d{1,4})|(\+))?$/);
  if (!m) return null;
  const face = (v: string) => (Number(v) === 0 ? sides : Number(v));
  const lo = face(m[1]),
    hi = m[2] ? face(m[2]) : m[3] ? sides : lo;
  return lo >= 1 && hi >= lo && hi <= sides ? [lo, hi] : null;
}
// Rows numbered in their first cell when every one parses; otherwise one row per face, in order.
export function rollTable(sides: number, keys: string[], entries: string[]): RollTable | null {
  if (!entries.length) return null;
  const ranges = keys.map((k) => rowRange(k, sides));
  if (ranges.every((r) => r)) return { sides, ranges: ranges as [number, number][], entries };
  if (entries.length !== sides) return null;
  return { sides, ranges: entries.map((_, i) => [i + 1, i + 1]), entries };
}
export function rollOn(table: RollTable, rng: Rng = Math.random) {
  const roll = 1 + Math.floor(rng() * table.sides);
  return { roll, index: table.ranges.findIndex(([lo, hi]) => roll >= lo && roll <= hi) };
}

// Dice inside a row: "2d6", "d8", "1d4 + 1", "3d6 × 10". At most 99 dice of up to 1000 sides each.
const dice = /\b(\d{1,2})?d(\d{1,4})\b(?:\s*([+\-−])\s*(\d{1,4})\b)?(?:\s*[×x*]\s*(\d{1,5})\b)?/g;
export type RollPart = string | { expr: string; total: number; rolls: number[] };
export function rollText(text: string, rng: Rng = Math.random): RollPart[] {
  const parts: RollPart[] = [];
  let at = 0;
  for (const m of text.matchAll(dice)) {
    const count = Number(m[1] || 1),
      sides = Number(m[2]);
    if (count < 1 || sides < 2) continue;
    const rolls = Array.from({ length: count }, () => 1 + Math.floor(rng() * sides));
    let total = rolls.reduce((a, b) => a + b, 0);
    if (m[3]) total += (m[3] === '+' ? 1 : -1) * Number(m[4]);
    if (m[5]) total *= Number(m[5]);
    if (m.index > at) parts.push(text.slice(at, m.index));
    parts.push({ expr: m[0], total: Math.max(0, total), rolls });
    at = m.index + m[0].length;
  }
  if (at < text.length) parts.push(text.slice(at));
  return parts;
}
export const rollTextPlain = (parts: RollPart[]) =>
  parts.map((p) => (typeof p === 'string' ? p : p.expr + ' (' + p.total + ')')).join('');

const plain = (tokens: Token[] | null): string =>
  (tokens || []).map((t) => (t.children ? plain(t.children) : t.content)).join('');
function closing(tokens: Token[], open: number) {
  let depth = 0;
  for (let i = open; i < tokens.length; i++) {
    depth += tokens[i].nesting;
    if (depth === 0) return i;
  }
  return tokens.length - 1;
}
// Marks the rollable tables and lists in parsed Markdown: the table or list token gets `meta.roll`, each body row or item
// `meta.row`. Returns what it found, each titled by the line that introduces it or the heading above it ('' if neither).
export function markRollTables(tokens: Token[]): { title: string; table: RollTable }[] {
  const found: { title: string; table: RollTable }[] = [];
  let heading = '',
    label = '',
    labelEnd = -1;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading_open') heading = plain(tokens[i + 1]?.children || null).trim();
    if (token.type === 'paragraph_open' && tokens[i + 1]?.type === 'inline') {
      label = plain(tokens[i + 1].children).trim();
      labelEnd = i + 2;
    }
    // A line right before it that ends in a colon names it; otherwise the heading above it does.
    const titled = () =>
      labelEnd === i - 1 && /:\s*$/.test(label) ? label.replace(/[:\s]+$/, '') : heading;
    if (token.type === 'table_open') {
      const end = closing(tokens, i),
        heads: string[] = [],
        rows: { open: Token; cells: string[] }[] = [];
      let body = false;
      for (let j = i; j < end; j++) {
        const t = tokens[j];
        if (t.type === 'tbody_open') body = true;
        if (t.type === 'tr_open' && body) rows.push({ open: t, cells: [] });
        if ((t.type === 'th_open' || t.type === 'td_open') && tokens[j + 1]?.type === 'inline') {
          const text = plain(tokens[j + 1].children).trim();
          if (!body) heads.push(text);
          else rows[rows.length - 1]?.cells.push(text);
        }
      }
      const sides = dieInHead(heads[0] || ''),
        table =
          sides &&
          rollTable(
            sides,
            rows.map((r) => r.cells[0] || ''),
            rows.map((r) => r.cells.slice(1).join(' · ')),
          );
      if (table) {
        token.meta = { ...(token.meta || {}), roll: table };
        rows.forEach((r, n) => (r.open.meta = { ...(r.open.meta || {}), row: n }));
        found.push({ title: titled(), table });
      }
      i = end;
      continue;
    }
    if (token.type === 'ordered_list_open' && labelEnd === i - 1) {
      const sides = dieInLabel(label);
      if (!sides) continue;
      const end = closing(tokens, i),
        items: { open: Token; text: string }[] = [];
      for (let j = i + 1, depth = 0; j < end; j++) {
        const t = tokens[j];
        if (t.type === 'list_item_open' && depth === 0) items.push({ open: t, text: '' });
        else if (
          t.type === 'inline' &&
          depth === 1 &&
          items.length &&
          !items[items.length - 1].text
        )
          items[items.length - 1].text = plain(t.children).trim();
        depth += t.type.endsWith('list_open') ? 1 : t.type.endsWith('list_close') ? -1 : 0;
      }
      const table = rollTable(
        sides,
        [],
        items.map((it) => it.text),
      );
      if (table) {
        token.meta = { ...(token.meta || {}), roll: table };
        items.forEach((it, n) => (it.open.meta = { ...(it.open.meta || {}), row: n }));
        found.push({ title: titled(), table });
      }
    }
  }
  return found;
}

const markdown = new MarkdownIt({ html: false, linkify: false, breaks: false });
export const tablesInText = (text: string) => markRollTables(markdown.parse(text, {}));
// Every rollable table in the campaign: wiki pages, session notes and table cards.
export function campaignTables(c: Campaign): FoundTable[] {
  const found: FoundTable[] = [];
  const add = (id: string, source: string, text: string) =>
    tablesInText(text).forEach((t, n) =>
      found.push({ id: id + ':' + n, source, title: t.title || source, table: t.table }),
    );
  for (const p of memoryOf(c).pages) add('page:' + p.id, pageName(p), p.body);
  c.sessions.forEach((s, i) =>
    add('session:' + s.id, 'Session ' + (i + 1) + ' · ' + s.title, s.plan),
  );
  for (const card of c.cards) add('card:' + card.id, 'Card · ' + card.title, card.body);
  return found;
}
// A starting loot table for a new wiki page.
export const lootTemplate = [
  'Roll when the party searches a hoard, a body or a strongbox. Change the rows to suit the place.',
  '',
  '| d20 | Find |',
  '| --- | --- |',
  '| 1–5 | 2d6 copper pieces and a broken tool |',
  '| 6–10 | 3d6 silver pieces |',
  '| 11–14 | 2d4 × 10 gold pieces |',
  '| 15–17 | A trinket that hints at who owned it |',
  '| 18–19 | A potion of healing |',
  '| 20 | Something from a player character’s wish list |',
].join('\n');
