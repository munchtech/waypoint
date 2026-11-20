import { type SearchHit } from '../lib/campaign-search';
import { Branch, Card, Event, Style } from '../lib/campaign';

// Types and helpers shared by the shell, the desk controller, the views and the dialogs.
export type View =
  | 'Discoveries'
  | 'Player site'
  | 'Foresight'
  | 'Rules library'
  | 'Session desk'
  | 'Campaign'
  | 'Party & preferences'
  | 'Chronicle'
  | 'Saved material'
  | 'Session journal'
  | 'World wiki'
  | 'Next session'
  | 'Campaign hub'
  | 'Player handouts';
export type Visit = {
  campaignId: string;
  view: View;
  hit: SearchHit | null;
  sessionId: string;
  tab: string;
  expanded: string | null;
  scroll: number;
};
export type Packet = {
  title: string;
  summary: string;
  plan: string;
  arc: string;
  branches: Omit<Branch, 'id'>[];
  cards: Omit<Card, 'id' | 'source'>[];
  events: { text: string; style: Style; enjoyment: Event['enjoyment'] }[];
};
// Scrolls to a section that may still be rendering (a view loading after navigation), opening a closed <details> around it.
export function scrollToId(id: string, tries = 40) {
  const target = document.getElementById(id);
  if (!target) {
    if (tries > 0) requestAnimationFrame(() => scrollToId(id, tries - 1));
    return;
  }
  const box = target.closest('details');
  if (box && !box.open) box.open = true;
  target.scrollIntoView({ block: 'start' });
  target.focus({ preventScroll: true });
}
// Shown inside the shell while a lazy view or dialog body loads, so the sidebar, top bar and focus stay in place.
export function ViewLoading() {
  return (
    <p className="view-loading" role="status">
      Loading…
    </p>
  );
}
