// "Last we left off": a recap draft for the start of a session, from what the table recorded in the session before.
// Half of long-running actual-play tables open with a recap, and a good one names what was lost plainly (docs/actual-play-study.md).
// Everything here is the DM's own record: recorded outcomes, table markers, the Memory ledger and the Bargain log.
import type { Campaign } from './campaign';
import { memoryOf } from './memory';

export type Recap = { happened: string[]; lost: string[]; owed: string[] };
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const unique = (list: string[]) => [...new Set(list.map((t) => t.trim()).filter(Boolean))];

export function lastWeLeftOff(campaign: Campaign, sessionId: string): Recap {
  const m = memoryOf(campaign),
    markers = (m.markers || []).filter((k) => k.sessionId === sessionId),
    noted = (kind: string) => markers.filter((k) => k.kind === kind && k.text.trim());
  return {
    happened: unique([
      ...campaign.events.filter((e) => e.sessionId === sessionId).map((e) => e.text),
      ...noted('Important moment').map((k) => k.text),
    ]),
    lost: unique([
      ...(m.ledger || [])
        .filter((l) => l.sessionId === sessionId)
        .map(
          (l) =>
            `${l.character || 'The party'}: ${l.what} (${l.kind === 'Toll' && l.bell ? l.bell + '’s Toll' : l.kind})`,
        ),
      ...markers
        .filter((k) => k.kind === 'Heavy moment')
        .map(
          (k) => k.text.trim() || `A heavy moment you marked at ${clock(k.created)}, with no note`,
        ),
    ]),
    owed: unique([
      ...noted('Promise').map((k) => k.text),
      ...(m.bargains || [])
        .filter((b) => b.sessionId === sessionId && b.status === 'Open')
        .map((b) => `${b.with}: ${b.terms}`),
    ]),
  };
}

export const recapEmpty = (r: Recap) => !r.happened.length && !r.lost.length && !r.owed.length;

// Plain text to read from or paste into the player handouts.
export function recapText(r: Recap) {
  const part = (title: string, list: string[]) =>
    list.length ? title + '\n' + list.map((t) => '- ' + t).join('\n') : '';
  return [
    part('Last we left off', r.happened),
    part('What it cost', r.lost),
    part('Still owed', r.owed),
  ]
    .filter(Boolean)
    .join('\n\n');
}
