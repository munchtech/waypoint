import type { Campaign, Card, Session } from './campaign';
import { memoryOf, pageKinds, type Handout, type WikiPage } from './memory';
import { pageName } from './page-name';
import type { Brief, Encounter, StatBlock } from './playbook';

// What goes into a printed campaign book. The DM's copy holds everything; the players' copy holds only what the party
// already knows (pages marked "Party knows" that are not still planned) and the handouts, so it can be given to the table.
export type BookCopy = 'DM' | 'Players';
export const bookParts = ['overview', 'sessions', 'wiki', 'appendix', 'cards', 'handouts'] as const;
export type BookPart = (typeof bookParts)[number];
export const bookPartLabels: Record<BookPart, string> = {
  overview: 'Campaign overview',
  sessions: 'Sessions, read-aloud text and encounters',
  wiki: 'People, places and lore',
  appendix: 'Encounter and stat block appendix',
  cards: 'Table cards',
  handouts: 'Handouts',
};
// Parts that only make sense in the DM's copy.
export const dmOnlyParts: BookPart[] = ['sessions', 'appendix', 'cards'];
export const kindTitles: Record<WikiPage['kind'], string> = {
  NPC: 'People',
  Character: 'Player characters',
  Location: 'Places',
  Faction: 'Factions',
  Quest: 'Quests',
  Item: 'Items',
  Lore: 'Lore',
  Ruling: 'Rulings',
};
export type BookSession = {
  session: Session;
  number: number;
  encounters: Encounter[];
  brief?: Brief;
};
export type BookContents = {
  copy: BookCopy;
  title: string;
  subtitle: string;
  overview?: {
    premise: string;
    tone: string;
    party: string;
    arc: string;
    boundaries: string;
    twist: string;
    roster: { name: string; player: string; level: number }[];
  };
  sessions: BookSession[];
  wiki: { kind: WikiPage['kind']; title: string; pages: WikiPage[] }[];
  encounters: Encounter[];
  statblocks: StatBlock[];
  cards: Card[];
  handouts: Handout[];
  chapters: { id: string; title: string }[];
};
export const partyKnows = (p: WikiPage) => p.visibility === 'Party knows' && p.status !== 'Planned';
const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

export function bookContents(c: Campaign, copy: BookCopy, parts: BookPart[]): BookContents {
  const m = memoryOf(c),
    pb = m.playbook,
    dm = copy === 'DM',
    want = (part: BookPart) => parts.includes(part) && (dm || !dmOnlyParts.includes(part));
  const pages = m.pages.filter((p) => dm || partyKnows(p));
  const wiki = want('wiki')
    ? pageKinds
        .map((kind) => ({
          kind,
          title: kindTitles[kind],
          pages: pages
            .filter((p) => p.kind === kind)
            .sort((a, b) => byName(pageName(a), pageName(b))),
        }))
        .filter((g) => g.pages.length)
    : [];
  const sessions = want('sessions')
    ? c.sessions.map((session, i) => ({
        session,
        number: i + 1,
        encounters: (pb?.encounters || []).filter((e) => e.sessionId === session.id),
        brief: pb?.briefs.find((b) => b.sessionId === session.id),
      }))
    : [];
  const sessionIds = new Set(c.sessions.map((s) => s.id)),
    // The appendix holds every encounter not already printed with its session.
    encounters = want('appendix')
      ? (pb?.encounters || []).filter(
          (e) => !want('sessions') || !e.sessionId || !sessionIds.has(e.sessionId),
        )
      : [],
    statblocks = want('appendix')
      ? [...(pb?.statblocks || []), ...(m.homebrew || [])].sort((a, b) => byName(a.name, b.name))
      : [];
  const cards = want('cards') ? c.cards : [],
    handouts = want('handouts') ? m.handouts || [] : [];
  const overview = want('overview')
    ? {
        premise: dm ? c.premise : '',
        tone: c.tone,
        party: c.party,
        arc: dm ? c.arc : '',
        boundaries: dm ? c.boundaries : '',
        twist: dm ? c.twist : '',
        roster: (m.roster || []).map((r) => ({ name: r.name, player: r.player, level: r.level })),
      }
    : undefined;
  const chapters = [
    overview && { id: 'overview', title: 'Campaign overview' },
    sessions.length && { id: 'sessions', title: 'Sessions' },
    wiki.length && { id: 'wiki', title: dm ? 'People, places and lore' : 'What the party knows' },
    (encounters.length || statblocks.length) && {
      id: 'appendix',
      title: 'Appendix: encounters and stat blocks',
    },
    cards.length && { id: 'cards', title: 'Appendix: table cards' },
    handouts.length && { id: 'handouts', title: 'Handouts' },
  ].filter((x): x is { id: string; title: string } => !!x);
  return {
    copy,
    title: c.name,
    subtitle: dm ? "Dungeon Master's book" : "Players' guide",
    overview,
    sessions,
    wiki,
    encounters,
    statblocks,
    cards,
    handouts,
    chapters,
  };
}

// A file name for the saved book: the campaign's name in plain lowercase words.
export function bookFileName(name: string, copy: BookCopy) {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'campaign';
  return base + (copy === 'DM' ? '-dm-book' : '-players-guide') + '.pdf';
}
