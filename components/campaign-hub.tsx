'use client';
import CampaignReader from './campaign-reader';
import CampaignBookPanel from './campaign-book';
import FoundryExportPanel from './foundry-export';
import RollTablesPanel from './roll-tables-panel';
import FactionStandingPanel from './faction-standing';
import { Pin, ArrowRight, Clock, FileText } from 'lucide-react';
import RelationshipWeb from './relationship-web';
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
  const m = memoryOf(campaign),
    pending = m.notes.reduce(
      (sum, n) => sum + n.proposals.filter((p) => p.state === 'pending').length,
      0,
    );
  const pages = m.pages;
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
      </div>
      <RelationshipWeb pages={pages} />
      <FactionStandingPanel campaign={campaign} update={update} />
      <RollTablesPanel campaign={campaign} />
      <CampaignBookPanel campaign={campaign} />
      <FoundryExportPanel campaign={campaign} />
    </div>
  );
}
