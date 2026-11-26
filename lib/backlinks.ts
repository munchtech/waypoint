import type { SessionNote, WikiPage } from './memory';
import type { Playbook } from './playbook';
import { pageName } from './page-name';
import { mentionIndex, splitMentions, titleNames } from './wiki-mentions';

// Links run both ways: a page that names another links to it as it is read (lib/wiki-mentions), and the page it names
// lists every page and source note that does so. `target` is a page id, or `creature:<name>` for a stat block.
type Index = ReturnType<typeof mentionIndex>;
export type Backlink = {
  kind: 'Wiki' | 'Journal';
  id: string;
  title: string;
  pageKind?: WikiPage['kind'];
  count: number;
  before: string;
  match: string;
  after: string;
};

// One index for the whole campaign, shared by every reader of the same page list.
const cache = new WeakMap<object, { creatures?: string[]; index: Index }>();
export function sharedIndex(pages: WikiPage[], creatures?: string[]) {
  const hit = cache.get(pages);
  if (hit && hit.creatures === creatures) return hit.index;
  const index = mentionIndex(pages, undefined, creatures);
  cache.set(pages, { creatures, index });
  return index;
}

// The lower-case names that link to `target`, so a text is split only when it could name it.
export function linkingNames(index: Index, target: string) {
  return [...index.byName].filter(([, id]) => id === target).map(([name]) => name);
}

// The words either side of the first mention, as plain text cut at a word.
const flat = (text: string) => text.replace(/\*\*|[*|_#>]/g, ' ').replace(/\s+/g, ' ');
function around(text: string, at: number, length: number) {
  let before = flat(text.slice(Math.max(0, at - 110), at)).trimStart(),
    after = flat(text.slice(at + length, at + length + 110)).trimEnd();
  if (before.length > 70) {
    const cut = before.indexOf(' ', before.length - 70);
    before = '…' + before.slice(cut >= 0 ? cut + 1 : before.length - 70);
  }
  if (after.length > 70) {
    const cut = after.lastIndexOf(' ', 70);
    after = after.slice(0, cut > 0 ? cut : 70) + '…';
  }
  return { before, after };
}

export function backlinks(
  target: string,
  pages: WikiPage[],
  notes: Pick<SessionNote, 'id' | 'title' | 'text' | 'date'>[],
  index: Index,
): Backlink[] {
  const names = linkingNames(index, target);
  if (!names.length) return [];
  const sources = [
    ...pages
      .filter((p) => p.id !== target)
      .map((p) => ({
        kind: 'Wiki' as const,
        id: p.id,
        title: pageName(p),
        pageKind: p.kind,
        text: p.body,
      })),
    ...[...notes]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((n) => ({ kind: 'Journal' as const, id: n.id, title: n.title, text: n.text })),
  ];
  const found: Backlink[] = [];
  for (const { text, ...source } of sources) {
    const lower = text.toLocaleLowerCase();
    if (!names.some((name) => lower.includes(name))) continue;
    let count = 0,
      at = -1,
      length = 0,
      offset = 0;
    for (const part of splitMentions(text, index, new Set(), true)) {
      if (part.pageId === target && !count++) {
        at = offset;
        length = part.text.length;
      }
      offset += part.text.length;
    }
    if (count)
      found.push({
        ...source,
        count,
        match: text.slice(at, at + length),
        ...around(text, at, length),
      });
  }
  return found;
}

// The prepared encounters a stat block fights in, by its block id or its plain name.
export function creatureEncounters(name: string, pb?: Playbook) {
  if (!pb) return [];
  const block = pb.statblocks.find((b) => b.name === name),
    key = name.toLocaleLowerCase();
  return pb.encounters.filter((encounter) =>
    encounter.creatures.some(
      (c) =>
        (block && c.statblock === block.id) ||
        c.name.toLocaleLowerCase() === key ||
        c.base.toLocaleLowerCase() === key,
    ),
  );
}

// What the @ picker offers. Each page is offered under a name that links back to it, so picking one always makes a link.
export type LinkOption = { id: string; name: string; kind: string; hint: string };
export function linkName(page: WikiPage, index: Index) {
  const aliases = page.aliases.split(/[,;\n]/).map((a) => a.trim());
  for (const name of [pageName(page), ...titleNames(page).names, page.title, ...aliases]) {
    const key = name.toLocaleLowerCase(),
      exact = index.exact.get(key);
    if (name && index.byName.get(key) === page.id && (!exact || exact === name)) return name;
  }
  return '';
}
export function linkOptions(
  query: string,
  pages: WikiPage[],
  index: Index,
  creatures: string[] = [],
  limit = 8,
): LinkOption[] {
  const q = query.trim().toLocaleLowerCase();
  const offered = [
    ...pages.map((p) => ({
      id: p.id,
      name: linkName(p, index),
      kind: p.kind,
      also: p.aliases,
      updated: p.updated,
    })),
    ...creatures
      .filter((name) => index.byName.get(name.toLocaleLowerCase()) === 'creature:' + name)
      .map((name) => ({ id: 'creature:' + name, name, kind: 'Stat block', also: '', updated: '' })),
  ].filter((o) => o.name);
  const rank = (o: (typeof offered)[number]) => {
    const name = o.name.toLocaleLowerCase();
    if (!q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.split(/[\s'-]+/).some((w) => w.startsWith(q))) return 2;
    if (
      o.also
        .toLocaleLowerCase()
        .split(/[,;\n]/)
        .some((a) => a.trim().startsWith(q))
    )
      return 3;
    return name.includes(q) ? 4 : 0;
  };
  return offered
    .map((o) => ({ o, r: rank(o) }))
    .filter(({ r }) => !q || r > 0)
    .sort((a, b) =>
      q
        ? a.r - b.r || a.o.name.length - b.o.name.length || a.o.name.localeCompare(b.o.name)
        : b.o.updated.localeCompare(a.o.updated),
    )
    .slice(0, limit)
    .map(({ o }) => ({
      id: o.id,
      name: o.name,
      kind: o.kind,
      hint: o.also && rank(o) === 3 ? o.also.split(/[,;\n]/)[0].trim() : '',
    }));
}

// The "@name" being typed just before the caret, if any: an @ at the start or after a space or opening mark, then up to 40
// characters on one line. "@ " and an email address ("a@b") are left alone.
export function atQuery(text: string, caret: number) {
  const m = text.slice(0, caret).match(/(?:^|[\s(["'“‘])@([^\s@][^@\n]{0,39})?$/u);
  if (!m) return null;
  const query = m[1] || '';
  return { start: caret - query.length - 1, query };
}
