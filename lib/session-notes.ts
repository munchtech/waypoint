// Reading a session plan at the table: its own pacing timeline ("| 0:20 to 0:50 | Scene 1 … |") and its "## Table card" section.
export type Row = { from: number; to: number; what: string };
const plainText = (t: string) =>
  t
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim();
export function timeline(plan: string): Row[] {
  return [...plan.matchAll(/^\|\s*(\d+):(\d\d)\s+to\s+(\d+):(\d\d)\s*\|\s*(.+?)\s*\|\s*$/gm)].map(
    (m) => ({ from: +m[1] * 60 + +m[2], to: +m[3] * 60 + +m[4], what: plainText(m[5]) }),
  );
}
// The plan's "## Table card" section, up to the next heading of the same level.
export function tableCard(plan: string) {
  const at = plan.search(/^## Table card/m);
  if (at < 0) return '';
  const rest = plan.slice(at),
    next = rest.slice(3).search(/^## /m);
  return next < 0 ? rest : rest.slice(0, next + 3);
}
export const clockText = (min: number) =>
  Math.floor(min / 60) + ':' + String(Math.floor(min % 60)).padStart(2, '0');
// Where the plan's timeline says a session usually is after `min` minutes.
export function pace(rows: Row[], min: number) {
  if (!rows.length) return null;
  const now = rows.find((r) => min >= r.from && min < r.to),
    last = rows[rows.length - 1];
  if (now) {
    const next = rows[rows.indexOf(now) + 1];
    return {
      now: now.what,
      next: next ? next.what + ' at ' + clockText(next.from) : 'The closing question',
      over: false,
    };
  }
  return min >= last.to
    ? {
        now: 'Past the planned time. Check “Running long” in Pacing for where to cut or stop.',
        next: '',
        over: true,
      }
    : null;
}
// Revision 7.8 gives each Act I scene a "**Bring it back.**" line: one move in the fiction for when a joke runs on.
// Each is returned with the heading it sits under.
export function bringBacks(plan: string) {
  const out: { scene: string; line: string }[] = [];
  let scene = '';
  for (const l of plan.split('\n')) {
    const h = /^#{2,3} (.+)$/.exec(l);
    if (h) scene = h[1].trim();
    const m = /^\*\*Bring it back\.\*\*\s*(.+)$/.exec(l);
    if (m) out.push({ scene, line: plainText(m[1]) });
  }
  return out;
}
// The scene a timeline row is about ("Scene 3: the port", "Scenes 4 and 5: …" → 3, 4), if any.
export const rowScene = (what: string) => {
  const m = /\bScenes? (\d+)/.exec(what);
  return m ? +m[1] : null;
};
// The plan's "**Where to break:**" line.
export function breakNote(plan: string) {
  const m = /\*\*Where to break:\*\*\s*(.+)$/m.exec(plan);
  return m ? plainText(m[1]) : '';
}
// Actual-play tables break at a median 48% of the session, four in five between a third and two thirds of the way in,
// so the hint shows from 40% of the planned time until 65%.
export function breakDue(rows: Row[], min: number) {
  if (!rows.length) return false;
  const total = rows[rows.length - 1].to;
  return min >= total * 0.4 && min < total * 0.65;
}
// Who has had the scene least tonight, from the spotlight counts (ties: everyone tied, in roster order).
export function leastSpotlit<T extends { id: string }>(
  roster: T[],
  counts: Record<string, number>,
) {
  if (!roster.length) return [];
  const low = Math.min(...roster.map((r) => counts[r.id] || 0));
  return roster.filter((r) => (counts[r.id] || 0) === low);
}
// The guide's sections, for jumping between scenes: its ### headings and the table card.
// A plan carrying a new-DM guide holds two tellings of its opening scenes: the book's short plan, then the full guide after
// it. The notes show the guide and fold the short plan, so a scene doesn't read twice. Plans without a guide stay whole.
export function planParts(plan: string): { guide: string; book: string } {
  const at = plan.search(/^## Running this session/m);
  if (at <= 0) return { guide: plan, book: '' };
  const book = plan.slice(0, at).trim();
  return { guide: plan.slice(at), book };
}
// The 2024 action names are ordinary words too ("help her up"), so they count only when written capitalised, as the rules write them.
const actionNames = new Set([
  'Influence',
  'Study',
  'Search',
  'Help',
  'Hide',
  'Dash',
  'Dodge',
  'Disengage',
  'Ready',
  'Utilize',
]);
const ruleStop = new Set(
  'a an the not your tonight every whole room same before as in on of for to is rule rules spell its it'.split(
    ' ',
  ),
);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// What to look for in the scenes for one "Rules you'll use tonight" line: the words of its bold name ("**Grappled underwater.**"
// → grappl… underwater), each item of a list ("**Influence, Study, Search:**") on its own.
function ruleKeys(term: string): RegExp[] {
  return term
    .replace(/\(.*?\)/g, '')
    .split(/,|:|;|\band\b/)
    .flatMap((part) => {
      let words = part
        .trim()
        .replace(/[.!]+$/, '')
        .split(/\s+/)
        .filter(Boolean);
      if (words.length > 1 && /ing$/i.test(words[0])) words = words.slice(1);
      const stop = (w?: string) => !!w && ruleStop.has(w.toLocaleLowerCase());
      while (stop(words[0])) words = words.slice(1);
      words = words.slice(0, 3);
      while (stop(words[words.length - 1])) words = words.slice(0, -1);
      if (!words.length || words.join('').length < 4) return [];
      const last = words[words.length - 1],
        stem = last.length > 4 ? last.replace(/(?:es|ed|ing|s)$/i, '') : last,
        source = '\\b' + [...words.slice(0, -1), stem].map(escapeRe).join('\\s+') + '[\\p{L}-]*';
      return [new RegExp(source, words.length === 1 && actionNames.has(last) ? 'u' : 'iu')];
    });
}
// The guide's "Rules you'll use tonight" list, each line followed by links to the scenes of the guide that call for it.
export function ruleUses(guide: string): string {
  const lines = guide.split('\n'),
    start = lines.findIndex((l) => /^\*\*Rules you.ll use tonight/.test(l));
  if (start < 0) return guide;
  let end = start + 1;
  while (end < lines.length && /^- /.test(lines[end])) end++;
  const sections: { title: string; text: string }[] = [];
  for (const line of lines.slice(end)) {
    if (/^## /.test(line)) break;
    const head = line.match(/^### (.+)$/);
    if (head) sections.push({ title: head[1].trim(), text: '' });
    else if (sections.length) sections[sections.length - 1].text += line + '\n';
  }
  const scenes = sections.filter(
    (s) =>
      !/^(Before you start|Key people|Places at a glance|Opening recap|Recap|Pacing|Where to break|If you get stuck|End of)/i.test(
        s.title,
      ),
  );
  for (let i = start + 1; i < end; i++) {
    const term = lines[i].match(/^- \*\*(.+?)\*\*/)?.[1];
    if (!term) continue;
    const keys = ruleKeys(term),
      hits = scenes.filter((s) => keys.some((k) => k.test(s.text)));
    if (!hits.length || hits.length === scenes.length) continue;
    const label = (t: string) => t.replace(/\s*\(.*$/, '').replace(/:.*$/, '');
    const slug = (t: string) =>
      t
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .replace(/\s+/g, '-');
    lines[i] +=
      ' *Tonight:* ' + hits.map((s) => `[${label(s.title)}](#${slug(s.title)})`).join(' · ');
  }
  return lines.join('\n');
}
// The text of the guide's "Running the fights" section, for the Combat tab.
export function fightPlan(plan: string): string {
  const m = plan.match(/^### Running the fights[^\n]*\n([\s\S]*?)(?=^#{2,3} |(?![\s\S]))/m);
  return m ? m[1].trim() : '';
}
// Under the guide's "Running the fights" heading, the night's stat blocks by name, so each one opens from there.
export function withFightRoster(guide: string, names: string[]): string {
  if (!names.length) return guide;
  const line =
    "**Stat blocks for tonight's fights:** " +
    names.join(' · ') +
    '. Click a name for its numbers and what it does. The Combat tab has each fight with its difficulty and how to retune it.';
  return guide.replace(/^### Running the fights[^\n]*\n/m, (head) => head + '\n' + line + '\n');
}
export function guideSections(plan: string) {
  const at = plan.indexOf('## Running this session');
  if (at < 0) return [];
  return [...plan.slice(at).matchAll(/^(###|##) (.+)$/gm)]
    .map((m) => m[2].trim())
    .filter((t) => !/^Running this session/.test(t));
}
