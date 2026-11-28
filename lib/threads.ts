import type { Campaign } from './campaign';
import type { RosterMember } from './playbook-schema';

// Personal threads: each character's own story, kept on the roster. The goal is what they want (or want back);
// a beat is a scene that moved it. A character is due a beat once THREAD_GAP played sessions have gone by without one.
export const THREAD_GAP = 5,
  BEAT_LIMIT = 12;
export type Thread = NonNullable<RosterMember['thread']>;
export type Beat = Thread['beats'][number];
export type ThreadStatus = {
  member: RosterMember;
  goal: string;
  beats: number;
  last?: Beat;
  // Played sessions since the last beat (or since the start, with no beat yet), not counting tonight.
  without: number;
  due: boolean;
};

export const threadOf = (m: RosterMember): Thread =>
  m.thread || { goal: '', beats: [] };

// Add a beat to a character's thread, newest last; the oldest drop off past BEAT_LIMIT.
export function addBeat(
  m: RosterMember,
  beat: { text: string; sessionId?: string },
  date: string,
  id: string = crypto.randomUUID(),
): RosterMember {
  const text = beat.text.trim().slice(0, 300);
  if (!text) return m;
  const t = threadOf(m),
    entry: Beat = { id, text, date };
  if (beat.sessionId) entry.sessionId = beat.sessionId;
  return { ...m, thread: { ...t, beats: [...t.beats, entry].slice(-BEAT_LIMIT) } };
}
export const removeBeat = (m: RosterMember, id: string): RosterMember => {
  const t = threadOf(m);
  return { ...m, thread: { ...t, beats: t.beats.filter((b) => b.id !== id) } };
};
export const setGoal = (m: RosterMember, goal: string): RosterMember => ({
  ...m,
  thread: { ...threadOf(m), goal: goal.slice(0, 300) },
});

// Where each named character's thread stands as of `sessionId`. Only sessions marked played count, so the Act IV
// road a party never took doesn't make anyone look overdue.
export function threadStatus(
  campaign: Pick<Campaign, 'sessions'>,
  roster: RosterMember[] | undefined,
  sessionId: string,
  gap = THREAD_GAP,
): ThreadStatus[] {
  const sessions = campaign.sessions,
    at = sessions.findIndex((s) => s.id === sessionId),
    now = at < 0 ? sessions.length : at,
    index = (id?: string) => sessions.findIndex((s) => s.id === id);
  return (roster || [])
    .filter((m) => m.name.trim())
    .map((member) => {
      const t = threadOf(member),
        // Beats from tonight or earlier; one with no session (or a removed one) counts from the start.
        placed = t.beats
          .map((b) => ({ b, i: index(b.sessionId) }))
          .filter(({ i }) => i <= now),
        lastPlaced = placed.reduce<{ b: Beat; i: number } | undefined>(
          (best, p) => (!best || p.i >= best.i ? p : best),
          undefined,
        ),
        from = lastPlaced ? lastPlaced.i : -1,
        without =
          lastPlaced && lastPlaced.i === now
            ? 0
            : sessions.slice(from + 1, now).filter((s) => s.done).length;
      return {
        member,
        goal: t.goal.trim(),
        beats: t.beats.length,
        last: lastPlaced?.b,
        without,
        due: without >= gap,
      };
    });
}
export const threadsDue = (...args: Parameters<typeof threadStatus>) =>
  threadStatus(...args).filter((s) => s.due);
