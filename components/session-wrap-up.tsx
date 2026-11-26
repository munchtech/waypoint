'use client';
import { useState } from 'react';
import MentionTextarea from './mention-textarea';
import { asDraft, sendManyToWiki } from './player-site';
import { dueAfter } from '../lib/player-site';
import { count } from '../lib/plural';
import { memoryOf } from '../lib/memory';
import { carryOver, lastWeLeftOff } from '../lib/recap';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import type { Campaign, Session, Event } from '../lib/campaign';
type Props = {
  campaign: Campaign;
  session: Session;
  recording: boolean;
  update: (fn: (c: Campaign) => Campaign) => void;
  onRecord: () => void;
  onPlan: () => void;
  onReview?: () => void;
  onSite?: () => void;
  notify?: (m: string) => void;
  fail?: (m: string) => void;
  // With a playbook the next session is already written: finishing opens its prep brief instead of the planner.
  next?: { label: string; go: () => void };
};
export default function SessionWrapUp({
  campaign,
  session,
  recording,
  update,
  onRecord,
  onPlan,
  onSite,
  onReview,
  notify,
  fail,
  next,
}: Props) {
  const [sending, setSending] = useState(false);
  async function sendDue() {
    setSending(true);
    try {
      await sendManyToWiki(campaign, wikiDue.map(asDraft), session.id, {
        update,
        notify: notify || (() => {}),
        fail: fail || (() => {}),
      });
    } finally {
      setSending(false);
    }
  }
  // Prepared player-wiki entries this session makes ready (Send them from Player handouts → Player site).
  const wikiDue = dueAfter(campaign, session.id);
  const events = campaign.events.filter((e) => e.sessionId === session.id),
    markers = (memoryOf(campaign).markers || []).filter((k) => k.sessionId === session.id),
    loved =
      events.filter((e) => e.enjoyment === 'Loved it').length +
      markers.filter((k) => k.kind === 'Loved this').length;
  // What next session's prep brief will open with, so the DM can fix it before closing.
  const recap = lastWeLeftOff(campaign, session.id),
    carried = carryOver(campaign, session.id),
    preview = (
      [
        ['What happened', recap.happened],
        ['What it cost', recap.lost],
        ['Still owed', recap.owed],
        ['Your follow-ups (not read aloud)', carried.followUps],
      ] as const
    ).filter(([, list]) => list.length);
  const debrief = session.debrief || { remember: '', openQuestions: '', nextFocus: '' };
  function field(key: keyof typeof debrief, value: string) {
    update((c) => ({
      ...c,
      sessions: c.sessions.map((s) =>
        s.id === session.id
          ? {
              ...s,
              debrief: {
                remember: '',
                openQuestions: '',
                nextFocus: '',
                ...s.debrief,
                [key]: value,
              },
            }
          : s,
      ),
    }));
  }
  function rating(id: string, enjoyment: Event['enjoyment']) {
    update((c) => ({ ...c, events: c.events.map((e) => (e.id === id ? { ...e, enjoyment } : e)) }));
  }
  function complete() {
    update((c) => ({
      ...c,
      sessions: c.sessions.map((s) => (s.id === session.id ? { ...s, done: true } : s)),
    }));
    if (next) next.go();
    else onPlan();
  }
  return (
    <section className="session-wrap-up">
      <span className="eyebrow">CLOSE THE CHAPTER</span>
      <h2 id="modal-title">What changes next?</h2>
      <p>
        Review the choices that happened, note the loose ends, and give your next session a
        direction. Edits save with your campaign.
      </p>
      <div className="wrap-summary">
        <span>
          <strong>{events.length}</strong> recorded {events.length === 1 ? 'choice' : 'choices'}
        </span>
        <span>
          <strong>{markers.length}</strong> marked {markers.length === 1 ? 'moment' : 'moments'}
        </span>
        <span className="wrap-loved">
          <strong>{loved}</strong> loved
        </span>
        <span>
          <strong>{events.filter((e) => e.enjoyment === 'Less of this').length}</strong> course{' '}
          {events.filter((e) => e.enjoyment === 'Less of this').length === 1
            ? 'correction'
            : 'corrections'}
        </span>
      </div>
      <h3>The choices you recorded</h3>
      {events.length ? (
        <div className="wrap-events">
          {events.map((e) => (
            <article key={e.id}>
              <p>{e.text}</p>
              <label>
                How did the table feel?
                <select
                  aria-label={'Enjoyment: ' + e.text.slice(0, 70)}
                  value={e.enjoyment}
                  onChange={(ev) => rating(e.id, ev.target.value as Event['enjoyment'])}
                >
                  <option>Neutral</option>
                  <option>Loved it</option>
                  <option>Less of this</option>
                </select>
              </label>
            </article>
          ))}
        </div>
      ) : (
        <p className="muted">
          No outcomes recorded for this session yet. You can catch up now or later.
        </p>
      )}
      <button className="text-button" onClick={onRecord}>
        Record what happened <ArrowRight size={14} />
      </button>
      <p className="tiny muted">
        Leave Neutral when enjoyment is unknown. Choosing an action does not automatically mean the
        players enjoyed it.
      </p>
      <label>
        DM reflections · what worked?
        <MentionTextarea
          maxLength={3000}
          rows={3}
          value={debrief.remember}
          onChange={(e) => field('remember', e.target.value)}
          placeholder="The negotiation had everyone engaged. Give the quieter character room next time…"
        />
      </label>
      <label>
        Open questions & unfinished business
        <MentionTextarea
          maxLength={3000}
          rows={3}
          value={debrief.openQuestions}
          onChange={(e) => field('openQuestions', e.target.value)}
          placeholder="Who hired the courier? What does the captain expect in return?"
        />
      </label>
      <label>
        What would make the next session great?
        <MentionTextarea
          maxLength={3000}
          rows={3}
          value={debrief.nextFocus}
          onChange={(e) => field('nextFocus', e.target.value)}
          placeholder="A short exploration scene, a choice with a cost, and a chance to follow up on their bargain…"
        />
      </label>
      {preview.length > 0 && (
        <div className="recap-draft wrap-preview">
          <h3>Next session opens with</h3>
          <p className="tiny muted">
            Drafted from your outcomes, markers, ledger and bargains. Fix anything wrong here before
            you finish; it shows in next session’s prep brief.
          </p>
          {preview.map(([title, list]) => (
            <div key={title}>
              <h4>{title}</h4>
              <ul>
                {list.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      <div className="info-box">
        These reflections guide future preparation. They do not automatically create events or wiki
        facts.
      </div>
      {wikiDue.length > 0 && (
        <div className="info-box wiki-due">
          <p>
            <strong>
              {count(wikiDue.length, 'player-wiki entry', 'player-wiki entries')} ready to send
              after this session:
            </strong>{' '}
            {wikiDue.map((e) => e.title).join(', ')}.
          </p>
          <span className="row-actions">
            <button
              className="button small primary"
              disabled={sending}
              onClick={() => void sendDue()}
            >
              {sending ? 'Sending…' : wikiDue.length > 1 ? 'Send all ' + wikiDue.length : 'Send it'}
            </button>
            {onSite && (
              <button className="text-button" onClick={onSite}>
                Open the player site
              </button>
            )}
          </span>
        </div>
      )}
      {recording && (
        <p className="error-text" role="status">
          Stop the current recording before finishing this session.
        </p>
      )}
      <div className="modal-actions">
        {onReview && (
          <button className="button" onClick={onReview}>
            Review discoveries
          </button>
        )}
        <button className="button" onClick={onPlan}>
          Open planner without finishing
        </button>
        <button className="button primary finish-session" disabled={recording} onClick={complete}>
          <CheckCircle2 size={15} />
          {next
            ? (session.done ? 'Open ' : 'Finish & prep ') + next.label
            : session.done
              ? 'Review next-session plan'
              : 'Finish & plan next session'}
        </button>
      </div>
      <p className="tiny muted">
        {next
          ? 'The prep brief shows this recap and your notes. Nothing is generated.'
          : 'Opening the planner does not start AI or generate anything.'}
      </p>
    </section>
  );
}
