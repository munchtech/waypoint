// What a generation sends to Claude about the campaign. Each task gets only what it can use: the most recent history,
// plus the events, saved material and sessions whose words match the request, so a long campaign does not send
// hundreds of unrelated events with every quick card.
import type { Campaign, Session } from './campaign';
import { relevance } from './campaign-search';
import { memoryContext, memoryOf } from './memory';
import { partySignals } from './party-signals';
import { stateSummary } from './playbook';

type Budget = {
  events: number; // events in all, the most recent first
  recent: number; // of which always the latest, whatever they say
  cards: number;
  sessions: number;
  pages: number;
};
const budgets: Record<string, Budget> = {
  prepare: { events: 60, recent: 25, cards: 8, sessions: 12, pages: 40 },
  next: { events: 100, recent: 40, cards: 8, sessions: 20, pages: 40 },
  improvise: { events: 30, recent: 12, cards: 5, sessions: 4, pages: 20 },
  path: { events: 40, recent: 15, cards: 4, sessions: 6, pages: 25 },
  ask: { events: 80, recent: 15, cards: 6, sessions: 20, pages: 30 },
  recap: { events: 40, recent: 20, cards: 0, sessions: 6, pages: 25 },
  memory: { events: 30, recent: 10, cards: 0, sessions: 4, pages: 40 },
};
const fallback = budgets.prepare;

// The latest `recent` items, then the best matches for the query among the rest, kept in their original order.
export function pick<T>(
  items: T[],
  text: (item: T) => string,
  query: string,
  total: number,
  recent: number,
) {
  if (items.length <= total) return items;
  const latest = new Set(items.slice(-recent));
  const scored = items
    .filter((item) => !latest.has(item))
    .map((item, at) => ({ item, at, score: query.trim() ? relevance(text(item), query) : 0 }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.at - a.at)
    .slice(0, total - latest.size);
  const chosen = new Set([...latest, ...scored.map((entry) => entry.item)]);
  return items.filter((item) => chosen.has(item));
}

// Saved material: newest first in the campaign, so the matching cards come first and the newest fill the rest.
function pickCards(cards: Campaign['cards'], query: string, total: number) {
  if (!total) return [];
  const matching = query.trim()
    ? cards
        .map((card, at) => ({ card, at, score: relevance(card.title + ' ' + card.body, query) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.at - b.at)
        .map((entry) => entry.card)
    : [];
  return [...new Set([...matching, ...cards])].slice(0, total);
}

// The context for every mode except campaign, which sends only the new campaign's own fields.
export function generationContext(
  campaign: Campaign,
  session: Session,
  mode: string,
  prompt: string,
  extra: Record<string, unknown> = {},
) {
  const budget = budgets[mode] || fallback,
    memory = memoryOf(campaign);
  const query = [prompt, memory.planner.focus, session.title, session.plan.slice(0, 4000)].join(
    ' ',
  );
  const events = pick(campaign.events, (e) => e.text, query, budget.events, budget.recent);
  const others = campaign.sessions.filter((s) => s.id !== session.id);
  const sessions = pick(
    others,
    (s) => s.title + ' ' + s.summary + ' ' + (s.debrief || ''),
    query,
    budget.sessions,
    Math.ceil(budget.sessions / 2),
  );
  const cards = pickCards(campaign.cards, query, budget.cards);
  // A new path only needs to know which intentions are already covered; ask may be about any path, so it keeps them.
  const { ruleReferences, branches, ...rest } = session;
  const currentSession =
    mode === 'path'
      ? rest
      : mode === 'improvise'
        ? { ...rest, branches: branches.map((b) => ({ title: b.title, style: b.style })) }
        : { ...rest, branches };
  return {
    campaign: {
      name: campaign.name,
      premise: campaign.premise,
      tone: campaign.tone,
      party: campaign.party,
      boundaries: campaign.boundaries,
      twist: campaign.twist,
      arc: campaign.arc,
      preferences: campaign.preferences,
    },
    currentSession,
    ...(mode === 'path' ? { existingPaths: branches.slice(0, 80).map((b) => b.title) } : {}),
    confirmedEvents: events,
    playerSignals: partySignals(campaign),
    ...memoryContext(campaign, false, query, budget.pages),
    rulesReferences: ruleReferences || [],
    worldState: memory.playbook ? stateSummary(memory.playbook) : undefined,
    savedDraftMaterial: cards,
    priorSessions: sessions.map((s) => ({
      title: s.title,
      summary: s.summary,
      done: s.done,
      debrief: s.debrief,
    })),
    contextSelection: {
      confirmedEvents: { included: events.length, total: campaign.events.length },
      priorSessions: { included: sessions.length, total: others.length },
      savedDraftMaterial: { included: cards.length, total: campaign.cards.length },
      method: 'The most recent entries, plus older ones whose words match this request',
    },
    ...extra,
  };
}
