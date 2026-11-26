'use client';
import CampaignReader from './campaign-reader';
import CampaignBookPanel from './campaign-book';
import RollTablesPanel from './roll-tables-panel';
import { useState } from 'react';
import { BookOpen, Pin, ArrowRight, Clock, GitBranch, FileText } from 'lucide-react';
import type { Campaign } from '../lib/campaign';
import { memoryOf } from '../lib/memory';
import { pageName } from '../lib/page-name';
export default function CampaignHub({
  campaign,
  update,
  onNavigate,
  initialHit,
  onOpenHit,
}: {
  initialHit?: import('../lib/campaign-search').SearchHit | null;
  onOpenHit?: (hit: import('../lib/campaign-search').SearchHit) => void;
  campaign: Campaign;
  update: (fn: (c: Campaign) => Campaign) => void;
  onNavigate: (view: string, sessionId?: string) => void;
}) {
  const [graphFocus, setGraphFocus] = useState('');
  const m = memoryOf(campaign),
    pending = m.notes.reduce(
      (sum, n) => sum + n.proposals.filter((p) => p.state === 'pending').length,
      0,
    );
  const pages = m.pages,
    focus = pages.find((p) => p.id === graphFocus) || pages[0];
  const related = focus
    ? pages
        .filter((p) => (focus.related || []).includes(p.id) || (p.related || []).includes(focus.id))
        .slice(0, 10)
    : [];
  const pinned = pages.filter((p) => (m.pins || []).includes(p.id));
  function togglePin(id: string) {
    update((c) => {
      const mem = memoryOf(c);
      return {
        ...c,
        memory: {
          ...mem,
          pins: (mem.pins || []).includes(id)
            ? (mem.pins || []).filter((x) => x !== id)
            : [...(mem.pins || []), id],
        },
      };
    });
  }
  return (
    <div className="campaign-hub">
      <div className="hub-stats">
        {[
          [pages.length, 'Wiki page', 'Wiki pages', 'World wiki'],
          [pending, 'Awaiting review', 'Awaiting review', 'Discoveries'],
          [campaign.events.length, 'Confirmed event', 'Confirmed events', 'Chronicle'],
          [
            pages.filter((p) => p.clock && p.clock.progress < 6).length,
            'Active clock',
            'Active clocks',
            'Next session',
          ],
        ].map(([total, one, many, view]) => (
          <button className="paper" key={many} onClick={() => onNavigate(String(view))}>
            <strong>{total}</strong>
            <span>{total === 1 ? one : many}</span>
            <ArrowRight size={16} />
          </button>
        ))}
      </div>
      <CampaignReader
        initialHit={initialHit}
        onOpenHit={onOpenHit}
        key={campaign.id}
        update={update}
        campaign={campaign}
        onPin={togglePin}
        onNavigate={onNavigate}
      />
      <div className="content-grid">
        <section className="paper">
          <h3>
            <Pin size={17} /> At a glance
          </h3>
          <p className="muted">Keep the people and facts you need during play close by.</p>
          {pinned.map((p) => (
            <article key={p.id} className="memory-thread">
              <div className="section-title">
                <h3>{pageName(p)}</h3>
                <button className="text-button" onClick={() => togglePin(p.id)}>
                  Unpin
                </button>
              </div>
              <span className="eyebrow">
                {p.status} · {p.visibility}
              </span>
              <p>{p.body}</p>
            </article>
          ))}
          {!pinned.length && <p>Open a wiki search result and pin it here.</p>}
          <h3>
            <Clock size={17} /> World clocks
          </h3>
          {pages
            .filter((p) => p.clock)
            .map((p) => (
              <article className="memory-thread" key={p.id}>
                <strong>{pageName(p)}</strong>
                <div className="clock-segments" aria-label={`${p.clock!.progress} of 6`}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <i key={i} className={i < p.clock!.progress ? 'filled' : ''} />
                  ))}
                </div>
                <p>{p.clock!.stakes}</p>
                <button
                  className="text-button"
                  onClick={() =>
                    update((c) => ({
                      ...c,
                      memory: {
                        ...memoryOf(c),
                        pages: memoryOf(c).pages.map((page) =>
                          page.id === p.id
                            ? {
                                ...page,
                                clock: {
                                  ...page.clock!,
                                  progress: Math.min(6, page.clock!.progress + 1),
                                },
                              }
                            : page,
                        ),
                      },
                    }))
                  }
                  disabled={p.clock!.progress === 6}
                >
                  Advance one step
                </button>
              </article>
            ))}
        </section>
        <section className="paper">
          <h3>
            <GitBranch size={17} /> Connections in your world
          </h3>
          <p className="muted">
            Links you create in the wiki. Choose a page to explore its neighbors.
          </p>
          <select
            aria-label="Relationship focus"
            value={focus?.id || ''}
            onChange={(e) => setGraphFocus(e.target.value)}
          >
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {pageName(p)}
              </option>
            ))}
          </select>
          {focus ? (
            <>
              <svg
                className="relationship-map"
                viewBox="0 0 500 340"
                role="img"
                aria-label={`Connections to ${pageName(focus)}`}
              >
                <circle className="ring" cx="250" cy="170" r="118" strokeDasharray="3 7" />
                {related.map((p, i) => {
                  const a = (2 * Math.PI * i) / related.length;
                  const x = 250 + 175 * Math.cos(a),
                    y = 170 + 125 * Math.sin(a);
                  return (
                    <g key={p.id}>
                      <line className="link" x1="250" y1="170" x2={x} y2={y} />
                      <circle className="node" cx={x} cy={y} r="9" />
                      <text x={x} y={y + 25} textAnchor="middle">
                        {pageName(p).slice(0, 20)}
                      </text>
                    </g>
                  );
                })}
                <circle className="hub" cx="250" cy="170" r="42" />
                <text className="hub-label" x="250" y="174" textAnchor="middle">
                  {pageName(focus).slice(0, 17)}
                </text>
              </svg>
              <div className="connection-list">
                {related.map((p) => (
                  <button className="button" key={p.id} onClick={() => setGraphFocus(p.id)}>
                    <BookOpen size={13} />
                    {pageName(p)}
                  </button>
                ))}
              </div>
              {!related.length && (
                <p className="muted">Add related pages in the wiki editor to connect this page.</p>
              )}
            </>
          ) : (
            <div className="empty">
              <GitBranch size={30} />
              <p>Your relationship map will grow with the wiki.</p>
            </div>
          )}
        </section>
      </div>
      <section className="paper">
        <h3>
          <FileText size={17} /> Recent history
        </h3>
        {[...campaign.events]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 8)
          .map((e) => (
            <article className="memory-thread" key={e.id}>
              <span className="eyebrow">
                {new Date(e.date).toLocaleDateString()} ·{' '}
                {campaign.sessions.find((s) => s.id === e.sessionId)?.title}
              </span>
              <p>{e.text}</p>
            </article>
          ))}
        {!campaign.events.length && (
          <p className="muted">Confirmed outcomes will appear here as you record them.</p>
        )}
      </section>
      <RollTablesPanel campaign={campaign} />
      <CampaignBookPanel campaign={campaign} />
    </div>
  );
}
