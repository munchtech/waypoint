import type { WikiPage } from './memory';

export type Mention = { text: string; pageId?: string };
const genericAliases = new Set([
  'keep',
  'change',
  'changes',
  'rule',
  'rules',
  'note',
  'notes',
  'party',
  'session',
  'sessions',
  'world',
  'story',
  'time',
  'pilot',
]);
// Three-letter names (Ila, Tam, Eld) link only when written exactly as on the page, capital first, so "ila" or "TAM" stay plain text.
const shortName = (name: string) => /^\p{Lu}\p{Ll}{2}$/u.test(name);
// Titles and ranks people are called by but that aren't their names: "Hushman Tobias Quill" is also just "Tobias Quill".
const honorifics = new Set([
  'brother',
  'captain',
  'chancellor',
  'father',
  'hushman',
  'lady',
  'lord',
  'master',
  'mistress',
  'mother',
  'old',
  'pilot-mistress',
  'reckoner',
  'ser',
  'sir',
  'sister',
  'thane',
]);
const notNames = new Set(['deceased', 'the', 'of', 'and']);
// Book titles come numbered and in capitals ("2. MOTHER SALLOW", "10. ONDRA SALLOW (THE CANTOR)", "B.6 Canon Quick Check");
// text names them plainly ("Mother Sallow"), so the number and the bracketed note come off and capitals become Title Case.
const titleCase = (s: string) =>
  s === s.toLocaleUpperCase()
    ? s.toLocaleLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase())
    : s;
export function titleNames(page: Pick<WikiPage, 'title' | 'kind'>) {
  const plain = page.title
    .replace(/^(?:[A-Z]\.)?\d+(?:\.\d+)*\.?\s+/, '')
    .replace(/\s*\(([^)]*)\)\s*$/, '')
    .trim();
  const bracket = page.title.match(/\(([^)]*)\)\s*$/)?.[1].trim() || '';
  const full = titleCase(plain),
    names = [full],
    single: string[] = [];
  // Other pages keep a derived name only when it is more than one word: "5.2 Characters" must not link every "characters".
  if (page.kind !== 'NPC')
    return { names: full === page.title || !/\s/.test(full) ? [] : names, single };
  const words = full.split(/\s+/);
  let rest = words;
  while (rest.length > 2 && honorifics.has(rest[0].toLocaleLowerCase())) rest = rest.slice(1);
  if (rest[0]?.toLocaleLowerCase() === 'the' && rest.length > 1) rest = rest.slice(1);
  if (rest.length < words.length) names.push(rest.join(' '));
  if (bracket && !notNames.has(bracket.toLocaleLowerCase()) && !/,/.test(bracket)) {
    const b = titleCase(bracket);
    names.push(b);
    if (/^the\s+\S+$/i.test(b)) names.push(b.replace(/^the\s+/i, ''));
  }
  // A person's own first and last names link on their own too, capital first, unless another page shares the word.
  if (!/^the\b/i.test(full) && rest.length >= 2 && rest.length <= 3)
    for (const w of rest)
      if (
        /^\p{Lu}[\p{L}'-]{2,}$/u.test(w) &&
        !notNames.has(w.toLocaleLowerCase()) &&
        !honorifics.has(w.toLocaleLowerCase())
      )
        single.push(w);
  return { names: names.filter((n) => n !== page.title), single };
}
// `creatures` are stat block names ("Hushman Sergeant") that link to the creature itself, as `creature:<name>`, unless a
// wiki page already goes by that name.
export function mentionIndex(pages: WikiPage[], excludeId?: string, creatures: string[] = []) {
  const names = new Map<string, { name: string; ids: Set<string>; exact: boolean }>();
  const add = (name: string, id: string, exact: boolean) => {
    const key = name.toLocaleLowerCase();
    const entry = names.get(key) || { name, ids: new Set<string>(), exact };
    entry.ids.add(id);
    entry.exact &&= exact;
    names.set(key, entry);
  };
  for (const page of pages) {
    const aliases = page.aliases
      .split(/[,;\n]/)
      .map((name) => name.trim())
      .filter((name) => !genericAliases.has(name.toLocaleLowerCase()) && !/^\d+$/.test(name));
    const derived = titleNames(page);
    for (const name of [page.title, ...derived.names, ...aliases]
      .map((name) => name.trim())
      .filter((name) => name.length >= 4 || shortName(name)))
      add(name, page.id, name.length < 4);
    for (const name of derived.single)
      if (!genericAliases.has(name.toLocaleLowerCase())) add(name, page.id, true);
  }
  // Text names them in the plural as often as not: "four Hushmen", "memory-eels", "Glass-Wolves".
  const plural = (name: string) =>
    /[(,]/.test(name)
      ? ''
      : /man$/i.test(name)
        ? name.replace(/man$/i, 'men')
        : /f$/i.test(name)
          ? name.replace(/f$/i, 'ves')
          : /s$/i.test(name)
            ? ''
            : name + 's';
  for (const name of creatures)
    for (const form of [name, plural(name)])
      if (form.length >= 4 && !names.has(form.toLocaleLowerCase()))
        add(form, 'creature:' + name, false);
  // A name two pages share links to neither: "Sallow" could be Mother Sallow or Ondra.
  const unique = [...names.values()].filter(
    (entry) => entry.ids.size === 1 && !entry.ids.has(excludeId || ''),
  );
  const byName = new Map(
    unique.map((entry) => [entry.name.toLocaleLowerCase(), [...entry.ids][0]]),
  );
  const exact = new Map(
    unique
      .filter((entry) => entry.exact)
      .map((entry) => [entry.name.toLocaleLowerCase(), entry.name]),
  );
  const escaped = unique
    .map((entry) => entry.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length);
  const pattern = escaped.length
    ? new RegExp('(?<![\\p{L}\\p{N}_])(?:' + escaped.join('|') + ')(?![\\p{L}\\p{N}_])', 'giu')
    : null;
  return { byName, exact, pattern };
}

// Link the first unambiguous mention of a page in a document, or every mention when `every` is set (session notes and
// play cards, read at the table), preserving the original words.
export function splitMentions(
  text: string,
  index: ReturnType<typeof mentionIndex>,
  seen: Set<string>,
  every = false,
): Mention[] {
  if (!index.pattern) return [{ text }];
  const parts: Mention[] = [];
  let start = 0;
  for (const match of text.matchAll(index.pattern)) {
    const key = match[0].toLocaleLowerCase(),
      id = index.byName.get(key),
      exact = index.exact.get(key);
    if (!id || (!every && seen.has(id)) || (exact && exact !== match[0])) continue;
    if (match.index > start) parts.push({ text: text.slice(start, match.index) });
    parts.push({ text: match[0], pageId: id });
    seen.add(id);
    start = match.index + match[0].length;
  }
  if (start < text.length) parts.push({ text: text.slice(start) });
  return parts;
}
