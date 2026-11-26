import type { WikiPage } from './memory';

// How a faction regards the party, from −3 (enemies) to +3 (allies), with a short log of what moved it.
export const standingLevels = [
  'Enemies',
  'Hostile',
  'Wary',
  'Neutral',
  'Friendly',
  'Trusted',
  'Allied',
] as const;
export const standingMin = -3,
  standingMax = 3,
  standingLogLimit = 40;
export type Standing = NonNullable<WikiPage['standing']>;
export type StandingChange = Standing['log'][number];

const clamp = (v: number) => Math.max(standingMin, Math.min(standingMax, Math.round(v)));
export const standingLabel = (value: number) => standingLevels[clamp(value) - standingMin];
export const signed = (n: number) => (n > 0 ? '+' + n : n < 0 ? '−' + -n : '0');
export const standingOf = (page: Pick<WikiPage, 'standing'>): Standing =>
  page.standing || { value: 0, log: [] };

// Move a faction's standing by `delta` steps (or set it with `to`), newest change first. A change that would not move it
// (already at the end of the scale) is not logged.
export function shiftStanding(
  standing: Standing | undefined,
  change: { delta?: number; to?: number; reason?: string; sessionId?: string },
  date: string,
): Standing {
  const now = standing || { value: 0, log: [] },
    value = clamp(change.to ?? now.value + (change.delta || 0)),
    delta = value - now.value;
  if (!delta) return now;
  const entry: StandingChange = {
    delta,
    value,
    reason: (change.reason || '').trim().slice(0, 300),
    date,
  };
  if (change.sessionId) entry.sessionId = change.sessionId;
  return { value, log: [entry, ...now.log].slice(0, standingLogLimit) };
}

// "Friendly (+1)".
export const standingText = (value: number) =>
  standingLabel(value) + ' (' + signed(clamp(value)) + ')';
