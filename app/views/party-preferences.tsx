import PartyLedger from '../../components/party-ledger';
import { type CSSProperties } from 'react';
import { memoryOf } from '../../lib/memory';
import { GitBranch, ArrowRight, Feather } from 'lucide-react';
import { styles } from '../../lib/campaign';
import { useDeskContext } from '../use-desk';

// The party roster, table preferences and the ledgers they link to.
export function PartyView() {
  const { setView, campaign, session, update, memory } = useDeskContext();
  return (
    <>
      <PartyLedger
        campaign={campaign}
        session={session}
        pb={memory.playbook}
        startLevel={memory.playbook?.briefs.find((b) => b.sessionId === session.id)?.level}
        mutate={(fn) => update((c) => ({ ...c, memory: fn(memoryOf(c)) }))}
      />
      <div className="content-grid">
        <section className="paper">
          <h3>The adventurers</h3>
          <label>
            Party members, level, and what makes them tick
            <textarea
              rows={6}
              value={campaign.party}
              onChange={(e) => update((c) => ({ ...c, party: e.target.value }))}
            />
          </label>
          <label>
            Campaign tone
            <select
              value={campaign.tone}
              onChange={(e) => update((c) => ({ ...c, tone: e.target.value }))}
            >
              {[
                'Mysterious & atmospheric',
                'Heroic & hopeful',
                'Dark & dangerous',
                'Whimsical & chaotic',
                'Political & intricate',
              ].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Off-limits, off-screen, and things to avoid
            <textarea
              rows={4}
              value={campaign.boundaries}
              placeholder="Themes to avoid, fade-to-black subjects, table agreements…"
              onChange={(e) => update((c) => ({ ...c, boundaries: e.target.value }))}
            />
          </label>
          <p className="tiny muted">These instructions travel with every generation request.</p>
        </section>
        <section className="paper">
          <h3>What your table enjoys</h3>
          <p className="muted">Your explicit preferences guide generation. Update these anytime.</p>
          {styles.map((s) => (
            <label className="range-label" key={s}>
              <span>
                {s}
                <b>{campaign.preferences[s]} / 5</b>
              </span>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                style={{ '--fill': campaign.preferences[s] * 20 + '%' } as CSSProperties}
                value={campaign.preferences[s]}
                onChange={(e) =>
                  update((c) => ({
                    ...c,
                    preferences: { ...c.preferences, [s]: Number(e.target.value) },
                  }))
                }
              />
            </label>
          ))}
          <section className="twist-panel">
            <div className="section-title">
              <h3>
                <GitBranch size={16} /> Plot twists
              </h3>
            </div>
            <p>How surprising should new ideas be?</p>
            <div className="segmented">
              {['None', 'Subtle', 'Bold'].map((t) => (
                <button
                  className={campaign.twist === t ? 'selected' : ''}
                  aria-pressed={campaign.twist === t}
                  key={t}
                  onClick={() => update((c) => ({ ...c, twist: t }))}
                >
                  {t}
                </button>
              ))}
            </div>
            <small>
              {campaign.twist === 'None'
                ? 'Keep new material straightforward.'
                : campaign.twist === 'Subtle'
                  ? 'Plant clues. Let the reveal feel earned.'
                  : 'Bigger reversals, grounded in your story.'}
            </small>
          </section>
          <div className="info-box">
            <Feather size={18} />
            <p>
              Waypoint adapts by reusing your recorded events and feedback. It does not retrain a
              model or assume every choice reflects a preference.
            </p>
          </div>
          <button className="button" onClick={() => setView('Chronicle')}>
            Review the party’s history
            <ArrowRight size={15} />
          </button>
        </section>
      </div>
    </>
  );
}
