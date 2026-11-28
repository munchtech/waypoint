'use client';
import { Copy } from 'lucide-react';
import { carryOver, lastWeLeftOff, recapEmpty, recapText } from '../lib/recap';
import type { Campaign, Session } from '../lib/campaign';
import { count } from '../lib/plural';

type Props = {
  campaign: Campaign;
  session: Session;
  notify: (m: string) => void;
  fail: (m: string) => void;
  // The desk shows it as one folding card; the prep brief keeps the two parts as their own blocks.
  card?: boolean;
  open?: boolean;
};
// "Last time": the recap to open with and the DM's own notes from the session before, drafted from what the table recorded (lib/recap.ts).
export function lastTimeOf(campaign: Campaign, session: Session) {
  const index = campaign.sessions.findIndex((s) => s.id === session.id),
    prev = index > 0 ? campaign.sessions[index - 1] : undefined;
  if (!prev) return null;
  const recap = lastWeLeftOff(campaign, prev.id),
    carried = carryOver(campaign, prev.id),
    hasRecap = !recapEmpty(recap),
    hasCarried = carried.notes.length > 0 || carried.followUps.length > 0;
  return hasRecap || hasCarried
    ? { prev, recap: hasRecap ? recap : null, carried: hasCarried ? carried : null }
    : null;
}
export default function LastTime({ campaign, session, notify, fail, card, open }: Props) {
  const last = lastTimeOf(campaign, session);
  if (!last) return null;
  const { recap, carried } = last;
  const copy = () => {
    if (!recap) return;
    void navigator.clipboard.writeText(recapText(recap)).then(
      () => notify('Recap copied as text.'),
      () => fail('Clipboard unavailable.'),
    );
  };
  const recapBlock = recap && (
    <div className="recap-draft">
      <div className="section-title">
        <h3>{card ? 'Read aloud' : 'Last we left off'}</h3>
        <button className="text-button no-print" onClick={copy}>
          <Copy size={13} />
          Copy
        </button>
      </div>
      <p className="tiny muted">
        A draft from what you recorded last session. Open with it in your own words, name what was
        lost plainly, then hand the scene to a player.
      </p>
      {(
        [
          ['What happened', recap.happened],
          ['What it cost', recap.lost],
          ['Still owed', recap.owed],
        ] as const
      ).map(
        ([title, list]) =>
          list.length > 0 && (
            <div key={title}>
              <h4>{title}</h4>
              <ul>
                {list.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ),
      )}
    </div>
  );
  const carriedBlock = carried && (
    <div className="recap-draft carry-over">
      <h3>{card ? 'Just for you' : 'For you from last time'}</h3>
      <p className="tiny muted">
        Your wrap-up notes and the follow-ups you marked at the table. Not for reading aloud.
        Dismiss a follow-up on the Next page once it’s handled.
      </p>
      {carried.notes.map(([title, text]) => (
        <div key={title}>
          <h4>{title}</h4>
          <p>{text}</p>
        </div>
      ))}
      {carried.followUps.length > 0 && (
        <div>
          <h4>Follow up</h4>
          <ul>
            {carried.followUps.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
  if (!card)
    return (
      <>
        {recapBlock}
        {carriedBlock}
      </>
    );
  // Open before play starts; once the table has recorded something tonight it folds away.
  const n = recap ? recap.happened.length + recap.lost.length + recap.owed.length : 0,
    f = carried ? carried.notes.length + carried.followUps.length : 0;
  return (
    <details className="last-time-card" open={open} key={session.id}>
      <summary>
        <span className="eyebrow">LAST TIME</span>
        <strong>{last.prev.title}</strong>
        <small>
          {[n && count(n, 'thing') + ' to recap', f && count(f, 'note') + ' for you']
            .filter(Boolean)
            .join(' · ')}
        </small>
      </summary>
      <div className="last-time-body">
        {recapBlock}
        {carriedBlock}
      </div>
    </details>
  );
}
