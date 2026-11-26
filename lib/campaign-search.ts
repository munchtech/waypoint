import type { Campaign } from './campaign';
import { memoryOf } from './memory';
import { pageName } from './page-name';

export type SearchHit = {
  id: string;
  kind:
    | 'Wiki'
    | 'Journal'
    | 'Event'
    | 'Session'
    | 'Material'
    | 'Play'
    | 'Rule'
    | 'Character'
    | 'Handout'
    | 'Creature'
    | 'Encounter'
    | 'Map';
  title: string;
  // Other names a wiki page goes by; searched with the title.
  aliases?: string;
  body: string;
  status: string;
  date: string;
  sessionId?: string;
  sourceId?: string;
  // What a wiki page is about: NPC, Location, Lore…
  pageKind?: string;
  score: number;
};
const stop = new Set([
  'the',
  'and',
  'what',
  'did',
  'was',
  'were',
  'with',
  'from',
  'that',
  'this',
  'have',
  'has',
  'for',
  'our',
  'are',
  'who',
  'how',
  'of',
  'to',
  'in',
  'on',
  'is',
  'it',
  'be',
  'at',
  'an',
  'or',
  'do',
  'we',
  'me',
  'my',
  'as',
  'by',
  'if',
]);
export function terms(text: string) {
  return [
    ...new Set(
      (
        text
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .toLowerCase()
          .match(/[\p{L}\p{N}]+/gu) || []
      )
        .filter((t) => t.length > 1 && !stop.has(t))
        .map((t) => t.replace(/(?:ing|ed|es|s)$/, '')),
    ),
  ].filter(Boolean);
}
// A single insertion, omission, or replacement in a longer word gets a lower score than a direct match.
function nearWord(a: string, b: string) {
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
export function relevance(text: string, query: string) {
  const words = terms(text),
    tokens = terms(query);
  return tokens.reduce((sum, token) => {
    if (words.some((word) => word === token || word.startsWith(token) || token.startsWith(word)))
      return sum + 1;
    return sum + (words.some((word) => nearWord(word, token)) ? 0.5 : 0);
  }, 0);
}
export function searchCampaign(c: Campaign, query: string, kind = 'All'): SearchHit[] {
  const m = memoryOf(c);
  const entries: Omit<SearchHit, 'score'>[] = [
    ...m.pages.map((p) => ({
      id: p.id,
      kind: 'Wiki' as const,
      title: pageName(p),
      aliases: p.aliases,
      body: p.body,
      status: p.status + ' · ' + p.visibility,
      date: p.updated,
      sourceId: p.sourceId,
      pageKind: p.kind,
    })),
    ...m.notes.map((n) => ({
      id: n.id,
      kind: 'Journal' as const,
      title: n.title,
      body: n.text,
      status: 'Source notes · may contain claims or plans',
      date: n.date,
      sessionId: n.sessionId,
    })),
    ...c.events.map((e) => ({
      id: e.id,
      kind: 'Event' as const,
      title: c.sessions.find((s) => s.id === e.sessionId)?.title || 'Recorded event',
      body: e.text,
      status: 'Confirmed · ' + e.enjoyment,
      date: e.date,
      sessionId: e.sessionId,
    })),
    ...c.sessions.map((s) => ({
      id: s.id,
      kind: 'Session' as const,
      title: s.title,
      body: s.plan + '\n' + s.summary,
      status: s.done ? 'Completed session plan · not a record of outcomes' : 'Prepared draft',
      date: '',
      sessionId: s.id,
    })),
    ...c.sessions.flatMap((s) =>
      s.branches.map((p) => ({
        id: p.id,
        kind: 'Play' as const,
        title: p.title,
        body: [
          p.keywords,
          p.why,
          p.readAloud,
          p.response,
          p.consequence,
          p.rules,
          p.later,
          p.fallback,
        ]
          .filter(Boolean)
          .join('\n'),
        status: 'Prepared possibility',
        date: '',
        sessionId: s.id,
      })),
    ),
    ...(m.playbook?.anytime || []).map((p) => ({
      id: p.id,
      kind: 'Play' as const,
      title: p.title,
      body: [
        p.keywords,
        p.why,
        p.readAloud,
        p.response,
        p.consequence,
        p.rules,
        p.later,
        p.fallback,
      ]
        .filter(Boolean)
        .join('\n'),
      status: 'Anytime possibility',
      date: '',
    })),
    ...c.sessions
      .flatMap((s) =>
        (s.ruleReferences || []).map((r) => ({
          id: r.id,
          kind: 'Rule' as const,
          title: r.name,
          body: r.body,
          status: r.source + ' · ' + r.edition,
          date: '',
          sessionId: s.id,
        })),
      )
      .filter((r, i, list) => list.findIndex((other) => other.id === r.id) === i),
    ...(m.roster || []).map((r) => ({
      id: r.id,
      kind: 'Character' as const,
      title: r.name || 'Unnamed character',
      body: [r.player, r.notes, 'Level ' + r.level].join('\n'),
      status: 'Party roster',
      date: '',
    })),
    ...(m.handouts || []).map((h) => ({
      id: h.id,
      kind: 'Handout' as const,
      title: h.title,
      body: h.body,
      status: 'Handout draft',
      date: h.updated,
    })),
    ...(m.maps || []).map((map) => ({
      id: map.id,
      kind: 'Map' as const,
      title: map.title,
      body: map.pins.map((p) => [p.label, p.note].filter(Boolean).join(' · ')).join('\n'),
      status: 'Map · ' + map.pins.length + (map.pins.length === 1 ? ' pin' : ' pins'),
      date: map.updated,
    })),
    ...(m.playbook?.statblocks || []).map((block) => ({
      id: block.id,
      kind: 'Creature' as const,
      title: block.name,
      body: block.body,
      status: 'Campaign stat block · CR ' + block.cr,
      date: '',
    })),
    ...(m.homebrew || []).map((block) => ({
      id: block.id,
      kind: 'Creature' as const,
      title: block.name,
      body: block.base + '\n' + block.body,
      status: 'Homebrew · built on ' + block.base + ' · CR ' + block.cr,
      date: block.updated,
    })),
    ...(m.playbook?.encounters || []).map((encounter) => ({
      id: encounter.id,
      kind: 'Encounter' as const,
      title: encounter.title,
      body: [
        ...encounter.creatures.map(
          (creature) => creature.count + ' × ' + creature.name + ' · ' + creature.base,
        ),
        encounter.tactics,
        encounter.exit,
        encounter.scale,
      ].join('\n'),
      status: 'Prepared encounter',
      date: '',
      sessionId: encounter.sessionId,
    })),
    ...c.cards.map((card) => ({
      id: card.id,
      kind: 'Material' as const,
      title: card.title,
      body: card.body + '\n' + card.readAloud + '\n' + card.consequence,
      status: 'Suggested material · not canon',
      date: '',
    })),
  ];
  return entries
    .filter((e) => kind === 'All' || e.kind === kind)
    .map((e) => {
      const names = e.title + ' ' + (e.aliases || '');
      return {
        ...e,
        score:
          relevance(names, query) * 4 +
          relevance(e.body, query) +
          (query.trim() && names.toLowerCase().includes(query.trim().toLowerCase()) ? 12 : 0),
      };
    })
    .filter((e) => !query.trim() || e.score > 0)
    .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
}
export function excerpt(body: string, query: string) {
  const token = terms(query).find((t) => body.toLowerCase().includes(t));
  const at = token ? body.toLowerCase().indexOf(token) : 0;
  const start = Math.max(0, at - 90);
  return (
    (start ? '…' : '') + body.slice(start, start + 360) + (start + 360 < body.length ? '…' : '')
  );
}

export function playerFacts(c: Campaign, ids: string[]) {
  return memoryOf(c)
    .pages.filter(
      (p) => ids.includes(p.id) && p.visibility === 'Party knows' && p.status !== 'Planned',
    )
    .map((p) => ({ id: p.id, title: pageName(p), status: p.status, body: p.body }));
}
export function composePlayerHandout(c: Campaign, ids: string[]) {
  return playerFacts(c, ids)
    .map((p) => `${p.title}\n${p.status === 'Confirmed' ? 'Known fact' : p.status}\n${p.body}`)
    .join('\n\n');
}
