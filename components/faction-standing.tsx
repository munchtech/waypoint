'use client';
import { useState } from 'react';
import { Minus, Plus, Shield } from 'lucide-react';
import type { Campaign } from '../lib/campaign';
import { memoryOf } from '../lib/memory';
import { pageName } from '../lib/page-name';
import {
  shiftStanding,
  signed,
  standingLabel,
  standingLevels,
  standingMax,
  standingMin,
  standingOf,
} from '../lib/standing';

// The session being played or prepared: the first one not marked done, else the last.
export const currentSession = (c: Campaign) => c.sessions.find((s) => !s.done) || c.sessions.at(-1);

function Scale({ value }: { value: number }) {
  return (
    <div
      className="standing-scale"
      role="meter"
      aria-valuemin={standingMin}
      aria-valuemax={standingMax}
      aria-valuenow={value}
      aria-valuetext={standingLabel(value)}
    >
      {standingLevels.map((level, i) => (
        <i
          key={level}
          title={level}
          className={
            (i + standingMin === value ? 'here ' : '') +
            (i + standingMin < 0 ? 'cold' : i + standingMin > 0 ? 'warm' : 'even')
          }
        />
      ))}
    </div>
  );
}

// Faction pages in the wiki, each with where it stands with the party and the last few things that moved it.
export default function FactionStandingPanel({
  campaign,
  update,
}: {
  campaign: Campaign;
  update: (fn: (c: Campaign) => Campaign) => void;
}) {
  const factions = memoryOf(campaign).pages.filter((p) => p.kind === 'Faction');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const sessionName = (id?: string) => {
    const i = campaign.sessions.findIndex((s) => s.id === id);
    return i < 0 ? '' : 'Session ' + (i + 1);
  };
  function shift(id: string, delta: number) {
    const reason = reasons[id] || '',
      date = new Date().toISOString();
    update((c) => {
      const mem = memoryOf(c),
        sessionId = currentSession(c)?.id;
      return {
        ...c,
        memory: {
          ...mem,
          pages: mem.pages.map((p) =>
            p.id === id
              ? { ...p, standing: shiftStanding(p.standing, { delta, reason, sessionId }, date) }
              : p,
          ),
        },
      };
    });
    setReasons((r) => ({ ...r, [id]: '' }));
  }
  return (
    <section className="paper faction-standing-panel">
      <h3>
        <Shield size={17} /> Faction standing
      </h3>
      <p className="muted">
        How each faction in your wiki regards the party, from Enemies to Allied. Note why when it
        moves, so you remember at the next session.
      </p>
      {!factions.length && (
        <p>Add a Faction page in the World wiki to track how it regards the party.</p>
      )}
      <ul className="faction-list">
        {factions.map((p) => {
          const s = standingOf(p),
            name = pageName(p);
          return (
            <li key={p.id} className="faction">
              <div className="faction-head">
                <strong>{name}</strong>
                <span
                  className={
                    'standing-label ' + (s.value < 0 ? 'cold' : s.value > 0 ? 'warm' : 'even')
                  }
                >
                  {standingLabel(s.value)} {signed(s.value)}
                </span>
              </div>
              <Scale value={s.value} />
              <div className="faction-controls">
                <input
                  aria-label={'Why it changed · ' + name}
                  placeholder="Why? (optional)"
                  value={reasons[p.id] || ''}
                  maxLength={300}
                  onChange={(e) => setReasons((r) => ({ ...r, [p.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="button"
                  aria-label={'Lower standing · ' + name}
                  title="Lower standing"
                  disabled={s.value <= standingMin}
                  onClick={() => shift(p.id, -1)}
                >
                  <Minus size={15} />
                </button>
                <button
                  type="button"
                  className="button"
                  aria-label={'Raise standing · ' + name}
                  title="Raise standing"
                  disabled={s.value >= standingMax}
                  onClick={() => shift(p.id, 1)}
                >
                  <Plus size={15} />
                </button>
              </div>
              {s.log.length > 0 && (
                <ol className="standing-log">
                  {s.log.slice(0, 3).map((e, i) => (
                    <li key={i}>
                      <b>{signed(e.delta)}</b> {standingLabel(e.value)}
                      {e.reason && ' · ' + e.reason}
                      {sessionName(e.sessionId) && <small> · {sessionName(e.sessionId)}</small>}
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
