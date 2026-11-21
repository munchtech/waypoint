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
export function guideSections(plan: string) {
  const at = plan.indexOf('## Running this session');
  if (at < 0) return [];
  return [...plan.slice(at).matchAll(/^(###|##) (.+)$/gm)]
    .map((m) => m[2].trim())
    .filter((t) => !/^Running this session/.test(t));
}
