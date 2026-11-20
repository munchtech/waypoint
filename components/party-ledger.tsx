'use client';
import { useState } from 'react';
import { Users, Plus, Trash2, ScrollText } from 'lucide-react';
import BookText from './book-text';
import type { Campaign, Session } from '../lib/campaign';
import { memoryOf, type Memory } from '../lib/memory';
import {
  ledgerKinds,
  partyBudget,
  sessionTag as sessionLabel,
  type Playbook,
} from '../lib/playbook';
export default function PartyLedger({
  campaign,
  session,
  mutate,
  pb,
  startLevel,
}: {
  campaign: Campaign;
  session: Session;
  mutate: (fn: (m: Memory) => Memory) => void;
  pb?: Playbook;
  startLevel?: number;
}) {
  const m = memoryOf(campaign),
    roster = m.roster || [],
    ledger = m.ledger || [],
    bargains = m.bargains || [];
  const [entry, setEntry] = useState({
      character: '',
      kind: 'Trade' as (typeof ledgerKinds)[number],
      weight: 'Keep',
      what: '',
      bell: '',
    }),
    [deal, setDeal] = useState({ with: '', terms: '' });
  const levels = roster.map((r) => r.level),
    [low, mod, high] = partyBudget(levels);
  const bells =
    pb?.flags.filter((f) => f.group === 'Bells').map((f) => f.label.split(',')[0]) || [];
  const setRoster = (fn: (r: NonNullable<Memory['roster']>) => NonNullable<Memory['roster']>) =>
    mutate((mem) => ({ ...mem, roster: fn(mem.roster || []) }));
  return (
    <div className="party-ledger">
      <section className="paper">
        <div className="section-title">
          <div>
            <span className="eyebrow">THE PARTY</span>
            <h3>
              <Users size={16} />
              Roster
            </h3>
            <p>Levels drive 2024 encounter difficulty everywhere in Foresight.</p>
          </div>
          <button
            className="button small"
            disabled={roster.length >= 12}
            onClick={() =>
              setRoster((r) => [
                ...r,
                {
                  id: crypto.randomUUID(),
                  name: '',
                  player: '',
                  level: r[r.length - 1]?.level || startLevel || 1,
                  notes: '',
                },
              ])
            }
          >
            <Plus size={14} />
            Add character
          </button>
        </div>
        {roster.length ? (
          <table className="roster-table">
            <thead>
              <tr>
                <th>Character</th>
                <th>Player</th>
                <th>Level</th>
                <th>Notes (hook, what they lost)</th>
                <th>
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      aria-label="Character name"
                      value={r.name}
                      maxLength={120}
                      onChange={(e) =>
                        setRoster((x) =>
                          x.map((y) => (y.id === r.id ? { ...y, name: e.target.value } : y)),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label="Player name"
                      value={r.player}
                      maxLength={120}
                      onChange={(e) =>
                        setRoster((x) =>
                          x.map((y) => (y.id === r.id ? { ...y, player: e.target.value } : y)),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label="Level"
                      type="number"
                      min={1}
                      max={20}
                      value={r.level}
                      onChange={(e) =>
                        setRoster((x) =>
                          x.map((y) =>
                            y.id === r.id
                              ? {
                                  ...y,
                                  level: Math.max(
                                    1,
                                    Math.min(20, Math.round(Number(e.target.value) || 1)),
                                  ),
                                }
                              : y,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label="Notes"
                      value={r.notes}
                      maxLength={600}
                      onChange={(e) =>
                        setRoster((x) =>
                          x.map((y) => (y.id === r.id ? { ...y, notes: e.target.value } : y)),
                        )
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={'Remove ' + (r.name || 'character')}
                      onClick={() => setRoster((x) => x.filter((y) => y.id !== r.id))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="tiny muted">
            No characters yet. Until you add them, Foresight assumes four characters at the level
            the campaign expects for each session.
          </p>
        )}
        {roster.length > 0 && (
          <p className="tiny muted">
            2024 XP budget for this party: Low {low} · Moderate {mod} · High {high}.
          </p>
        )}
        <button
          className="text-button"
          disabled={!roster.length}
          onClick={() =>
            setRoster((x) => x.map((y) => ({ ...y, level: Math.min(20, y.level + 1) })))
          }
        >
          Level everyone up
        </button>
      </section>
      <details className="paper" open={!!pb || ledger.length > 0 || bargains.length > 0}>
        <summary>Memory ledger & bargains</summary>
        <section id="memory-ledger" className="ledger-anchor" tabIndex={-1}>
          <span className="eyebrow">TOLLS, TITHES AND TRADES</span>
          <h3>
            <ScrollText size={16} />
            Memory ledger
          </h3>
          <p className="muted">
            Players choose every memory. Keep the kinds apart: a Toll can never be bought back; a
            Tithe can be redeemed from its jar; eel bites return after a long rest.
          </p>
          <div className="ledger-form">
            <label>
              Character
              <input
                list="ledger-characters"
                value={entry.character}
                maxLength={120}
                onChange={(e) => setEntry({ ...entry, character: e.target.value })}
              />
            </label>
            <datalist id="ledger-characters">
              {roster.map((r) => (
                <option key={r.id} value={r.name} />
              ))}
            </datalist>
            <label>
              Kind
              <select
                value={entry.kind}
                onChange={(e) =>
                  setEntry({ ...entry, kind: e.target.value as (typeof ledgerKinds)[number] })
                }
              >
                {ledgerKinds.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label>
              Weight
              <select
                value={entry.weight}
                onChange={(e) => setEntry({ ...entry, weight: e.target.value })}
              >
                {['Mote', 'Keep', 'Heartkeep', 'Knowing', '—'].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            {entry.kind === 'Toll' && bells.length > 0 && (
              <label>
                Bell
                <select
                  value={entry.bell}
                  onChange={(e) => setEntry({ ...entry, bell: e.target.value })}
                >
                  <option value="">Choose a bell</option>
                  {bells.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="wide">
              What was given or lost (the player’s words)
              <input
                value={entry.what}
                maxLength={600}
                onChange={(e) => setEntry({ ...entry, what: e.target.value })}
              />
            </label>
            <button
              className="button primary"
              disabled={!entry.character.trim() || !entry.what.trim()}
              onClick={() => {
                mutate((mem) => ({
                  ...mem,
                  ledger: [
                    {
                      id: crypto.randomUUID(),
                      ...entry,
                      character: entry.character.trim(),
                      what: entry.what.trim(),
                      sessionId: session.id,
                      date: new Date().toISOString(),
                    },
                    ...(mem.ledger || []),
                  ],
                }));
                setEntry({ ...entry, what: '' });
              }}
            >
              <Plus size={14} />
              Record
            </button>
          </div>
          {ledger.length ? (
            <ul className="ledger-list">
              {ledger.map((l) => (
                <li key={l.id}>
                  <span className={'pill neutral kind-' + l.kind.toLowerCase()}>
                    {l.kind}
                    {l.weight && l.weight !== '—' ? ' · ' + l.weight : ''}
                    {l.bell ? ' · ' + l.bell : ''}
                  </span>
                  <div>
                    <strong>{l.character}</strong>
                    <p>{l.what}</p>
                    <small>
                      {sessionLabel(campaign, l.sessionId)} ·{' '}
                      {new Date(l.date).toLocaleDateString()}
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Remove ledger entry"
                    onClick={() =>
                      mutate((mem) => ({
                        ...mem,
                        ledger: (mem.ledger || []).filter((x) => x.id !== l.id),
                      }))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tiny muted">Nothing recorded yet.</p>
          )}
          {pb?.references?.map((r) => (
            <details key={r.title} className="ledger-reference">
              <summary>{r.title}</summary>
              <BookText text={r.body} />
            </details>
          ))}
        </section>
        <section id="bargains" className="paper ledger-anchor" tabIndex={-1}>
          <span className="eyebrow">PROMISES WITH TEETH</span>
          <h3>Bargain log</h3>
          <div className="ledger-form">
            <label>
              With
              <input
                value={deal.with}
                maxLength={160}
                onChange={(e) => setDeal({ ...deal, with: e.target.value })}
              />
            </label>
            <label className="wide">
              Terms
              <input
                value={deal.terms}
                maxLength={1200}
                onChange={(e) => setDeal({ ...deal, terms: e.target.value })}
              />
            </label>
            <button
              className="button primary"
              disabled={!deal.with.trim() || !deal.terms.trim()}
              onClick={() => {
                mutate((mem) => ({
                  ...mem,
                  bargains: [
                    {
                      id: crypto.randomUUID(),
                      with: deal.with.trim(),
                      terms: deal.terms.trim(),
                      status: 'Open',
                      sessionId: session.id,
                      date: new Date().toISOString(),
                    },
                    ...(mem.bargains || []),
                  ],
                }));
                setDeal({ with: '', terms: '' });
              }}
            >
              <Plus size={14} />
              Add bargain
            </button>
          </div>
          {bargains.length ? (
            <ul className="ledger-list">
              {bargains.map((b) => (
                <li key={b.id}>
                  <select
                    aria-label={'Status of bargain with ' + b.with}
                    value={b.status}
                    onChange={(e) =>
                      mutate((mem) => ({
                        ...mem,
                        bargains: (mem.bargains || []).map((x) =>
                          x.id === b.id ? { ...x, status: e.target.value as typeof b.status } : x,
                        ),
                      }))
                    }
                  >
                    {['Open', 'Kept', 'Broken'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <div>
                    <strong>{b.with}</strong>
                    <p>{b.terms}</p>
                    <small>{sessionLabel(campaign, b.sessionId)}</small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Remove bargain"
                    onClick={() =>
                      mutate((mem) => ({
                        ...mem,
                        bargains: (mem.bargains || []).filter((x) => x.id !== b.id),
                      }))
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="tiny muted">No bargains recorded yet.</p>
          )}
        </section>
      </details>
    </div>
  );
}
