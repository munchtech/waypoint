import type { Campaign, Card } from './campaign';
import { goPlaces } from './go-links';
import { memoryOf } from './memory';
import { stateOf } from './playbook';

const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

// A saved card that follows one of Waypoint's own trackers (the memory ledger, the bargain log or a world-state value)
// shows what the DM has recorded there, so it never repeats the figure it was imported with. Empty when it follows nothing.
export function trackerStatus(campaign: Campaign, card: Card): string {
  const t = card.tracks;
  if (!t) return '';
  const m = memoryOf(campaign);
  if (t.place === 'memory-ledger') {
    const all = m.ledger || [],
      tolls = all.filter((l) => l.kind === 'Toll').length;
    if (!all.length) return 'no losses recorded';
    return (
      n(all.length, 'loss', 'losses') +
      ' recorded' +
      (tolls ? ' · ' + n(tolls, 'Toll', 'Tolls') : '')
    );
  }
  if (t.place === 'bargains') {
    const all = m.bargains || [],
      open = all.filter((b) => b.status === 'Open').length;
    return all.length
      ? n(all.length, 'bargain', 'bargains') + ` · ${open} open`
      : 'no bargains recorded';
  }
  const pb = m.playbook,
    f = t.flag ? pb?.flags.find((x) => x.id === t.flag) : undefined;
  if (!pb || !f) return '';
  const v = stateOf(pb)[f.id];
  if (f.options) return f.options.find((o) => o.id === v)?.label || String(v);
  return f.max !== undefined ? `${v} / ${f.max}` : String(v);
}

export const trackerName = (card: Card) => (card.tracks ? goPlaces[card.tracks.place] : '');
