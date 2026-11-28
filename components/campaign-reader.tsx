import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import MentionTextarea from './mention-textarea';
import { BookOpen, Search, ChevronLeft, ChevronRight, Pin } from 'lucide-react';
import type { Campaign } from '../lib/campaign';
import { memoryOf, pageKinds, type WikiPage } from '../lib/memory';
import { searchCampaign, type SearchHit } from '../lib/campaign-search';
import { pageName } from '../lib/page-name';
import BookText from './book-text';
import MentionedIn from './mentioned-in';
import { creatureEncounters } from '../lib/backlinks';
import { pinName, pinsForPage } from '../lib/maps';
import { bestiaryOf } from '../lib/homebrew';
// What the reader can show, as [value, label]. A wiki kind is added for each kind the campaign uses ("Wiki:NPC").
const categories: [string, string][] = [
  ['All', 'Everything'],
  ['Wiki', 'World wiki'],
  ['Session', 'Session plans'],
  ['Play', 'Prepared paths'],
  ['Event', 'Confirmed outcomes'],
  ['Journal', 'Source notes'],
  ['Material', 'Saved ideas'],
  ['Character', 'Party'],
  ['Handout', 'Handouts'],
  ['Map', 'Maps'],
  ['Creature', 'Campaign creatures'],
  ['Encounter', 'Encounters'],
  ['Rule', 'Rules'],
];
// Where "open" takes each kind of page (useDesk's openWorkspace), so the button says so.
const openLabel: Partial<Record<string, string>> = {
  Wiki: 'Open in the wiki editor',
  Journal: 'Open the note',
  Handout: 'Open the handout',
  Map: 'Open the map',
  Character: 'Open in Party',
  Rule: 'Open in the rules',
  Material: 'Open the idea',
  Creature: 'Open in Combat',
  Encounter: 'Open in Combat',
  Event: 'Open in the table log',
  Play: 'Open in Paths',
  Session: 'Open the session notes',
};
function stored(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}
export default function CampaignReader({
  campaign,
  onPin,
  onNavigate,
  update,
  initialHit,
  onOpenHit,
}: {
  initialHit?: SearchHit | null;
  onOpenHit?: (hit: SearchHit) => void;
  campaign: Campaign;
  update: (fn: (c: Campaign) => Campaign) => void;
  onPin: (id: string) => void;
  onNavigate: (view: string, id?: string) => void;
}) {
  const storageKey = 'waypoint-reader:' + campaign.id;
  const [saved] = useState(() =>
    initialHit
      ? { kind: 'All', query: '', selected: initialHit.kind + ':' + initialHit.id }
      : stored(storageKey),
  );
  const [query, setQuery] = useState(typeof saved?.query === 'string' ? saved.query : ''),
    [kind, setKind] = useState(
      categories.some(([value]) => value === String(saved?.kind).split(':')[0])
        ? saved.kind
        : memoryOf(campaign).pages.length
          ? 'Wiki'
          : 'All',
    ),
    [selected, setSelected] = useState(typeof saved?.selected === 'string' ? saved.selected : ''),
    [large, setLarge] = useState(saved?.large === true),
    [focus, setFocus] = useState(false);
  const [order, setOrder] = useState(saved?.order === 'title' ? 'title' : 'campaign'),
    [trail, setTrail] = useState<
      { selected: string; query: string; kind: string; order: string; scroll: number }[]
    >([]),
    [draft, setDraftState] = useState<WikiPage | null>(() => {
      const d = stored(storageKey + ':draft');
      return d && typeof d.body === 'string' && memoryOf(campaign).pages.some((p) => p.id === d.id)
        ? d
        : null;
    }),
    [message, setMessage] = useState('');
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ selected, order, kind, query, large }));
    } catch {}
  }, [selected, order, kind, query, large, storageKey]);
  // Every draft change is mirrored to local storage here, and the DM is told when that storage is unavailable.
  function setDraft(next: WikiPage | null) {
    setDraftState(next);
    try {
      if (next) localStorage.setItem(storageKey + ':draft', JSON.stringify(next));
      else localStorage.removeItem(storageKey + ':draft');
    } catch {
      if (next)
        setMessage('Draft recovery is unavailable. Save your text before leaving this page.');
    }
  }
  function save() {
    if (!draft) return;
    const current = m.pages.find((p) => p.id === draft.id);
    if (!current || current.updated !== draft.updated) {
      setMessage('Page changed. Keep a copy of your text and reopen before saving.');
      return;
    }
    update((c) => {
      const mem = memoryOf(c);
      return {
        ...c,
        memory: {
          ...mem,
          pages: mem.pages.map((p) =>
            p.id === draft.id
              ? {
                  ...p,
                  body: draft.body,
                  updated: new Date().toISOString(),
                  history: [
                    {
                      sourceId: p.sourceId,
                      quote: p.quote,
                      body: p.body,
                      status: p.status,
                      visibility: p.visibility,
                      date: p.updated,
                    },
                    ...p.history,
                  ],
                }
              : p,
          ),
        },
      };
    });
    setDraft(null);
    setMessage('Page saved. Fact status and visibility are unchanged.');
  }
  const article = useRef<HTMLElement>(null),
    m = memoryOf(campaign);
  const usedKinds = pageKinds.filter((k) => m.pages.some((p) => p.kind === k)),
    inWiki = kind.startsWith('Wiki');
  const found = useMemo(() => {
    const [base, only] = kind.split(':');
    const results = searchCampaign(campaign, query, base).filter(
      (h) => !only || h.pageKind === only,
    );
    if (base === 'Wiki' && !query.trim())
      return results.sort((a, b) =>
        order === 'title'
          ? a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
          : memoryOf(campaign).pages.findIndex((p) => p.id === a.id) -
            memoryOf(campaign).pages.findIndex((p) => p.id === b.id),
      );
    return results;
  }, [campaign, query, kind, order]);
  const hits =
    initialHit && !found.some((h) => h.kind === initialHit.kind && h.id === initialHit.id)
      ? [initialHit, ...found]
      : found;
  const index = Math.max(
      0,
      hits.findIndex((h) => h.kind + ':' + h.id === selected),
    ),
    opened = hits[index],
    fights = opened?.kind === 'Creature' ? creatureEncounters(opened.title, bestiaryOf(m)) : [];
  function remember() {
    if (opened)
      setTrail((t) =>
        [
          ...t,
          { selected: opened.kind + ':' + opened.id, query, kind, order, scroll: window.scrollY },
        ].slice(-30),
      );
  }
  function open(hit: SearchHit) {
    remember();
    setSelected(hit.kind + ':' + hit.id);
    setMessage('');
    requestAnimationFrame(() => {
      article.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
      article.current?.focus({ preventScroll: true });
    });
  }
  // Open another entry from a link on this one, clearing the search so it is in the list.
  function jump(to: string, id: string) {
    remember();
    setQuery('');
    setKind(to);
    setSelected(to + ':' + id);
    setMessage('');
    requestAnimationFrame(() => {
      article.current?.scrollIntoView({ block: 'start' });
      article.current?.focus({ preventScroll: true });
    });
  }
  function back() {
    const previous = trail[trail.length - 1];
    if (!previous) return;
    setSelected(previous.selected);
    setQuery(previous.query);
    setKind(previous.kind);
    setOrder(previous.order);
    setTrail((t) => t.slice(0, -1));
    setMessage('');
    requestAnimationFrame(() => {
      article.current?.focus({ preventScroll: true });
      window.scrollTo({ top: previous.scroll, behavior: 'instant' });
    });
  }
  function findInContents() {
    setFocus(false);
    requestAnimationFrame(() => {
      const active =
        article.current?.previousElementSibling?.querySelector<HTMLElement>(
          '[aria-current="page"]',
        );
      active?.scrollIntoView({ block: 'nearest' });
      active?.focus({ preventScroll: true });
    });
  }
  useEffect(() => {
    const active =
      article.current?.previousElementSibling?.querySelector<HTMLElement>('[aria-current="page"]');
    if (active) {
      const nav = active.parentElement!;
      nav.scrollTop = active.offsetTop - nav.offsetTop - nav.clientHeight / 2;
    }
  }, [selected]);
  const related =
    opened?.kind === 'Wiki'
      ? m.pages.filter(
          (p) =>
            m.pages.find((v) => v.id === opened.id)?.related?.includes(p.id) ||
            p.related?.includes(opened.id),
        )
      : [];
  return (
    <section className={'campaign-reader paper' + (focus ? ' reader-focus' : '')}>
      <header className="reader-header">
        <div>
          <span className="eyebrow">CAMPAIGN REFERENCE</span>
          <h2>
            <BookOpen size={23} />
            Read the campaign
          </h2>
        </div>
        <button className="button" aria-pressed={focus} onClick={() => setFocus(!focus)}>
          {focus ? 'Show contents' : 'Focus on reading'}
        </button>
      </header>
      <div className="reader-tools">
        <div>
          <Search size={18} />
          <input
            aria-label="Search campaign reader"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Find a page, person or phrase…"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear reader search">
              ×
            </button>
          )}
        </div>
        <select
          aria-label="Reader category"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
          }}
        >
          {categories.map(([value, label]) => (
            <Fragment key={value}>
              <option value={value}>{label}</option>
              {value === 'Wiki' &&
                usedKinds.length > 1 &&
                usedKinds.map((k) => (
                  <option key={k} value={'Wiki:' + k}>
                    – {k}
                  </option>
                ))}
            </Fragment>
          ))}
        </select>
        {inWiki && (
          <select
            aria-label="Reader order"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="campaign">Campaign order</option>
            <option value="title">Title order</option>
          </select>
        )}
      </div>
      {message && (
        <p role="status" className="info-box">
          {message}
        </p>
      )}
      <div className="reader-layout">
        <nav className="reader-contents" aria-label="Campaign contents">
          <div className="reader-count">
            {hits.length}{' '}
            {inWiki
              ? hits.length === 1
                ? 'page'
                : 'pages'
              : hits.length === 1
                ? 'result'
                : 'results'}
          </div>
          {hits.map((h) => (
            <button
              key={h.kind + ':' + h.id}
              aria-current={opened === h ? 'page' : undefined}
              onClick={() => open(h)}
            >
              <span>{h.title}</span>
              {(kind === 'All' || (kind === 'Wiki' && h.pageKind !== 'Lore')) && (
                <small>{h.pageKind || h.kind}</small>
              )}
            </button>
          ))}
        </nav>
        <article
          className={'reader-page' + (large ? ' reader-large' : '')}
          tabIndex={-1}
          ref={article}
        >
          {opened ? (
            <>
              <div className="reader-page-tools">
                <span className="eyebrow">
                  {opened.pageKind || opened.kind} · {index + 1} of {hits.length}
                </span>
                <button
                  className="text-button"
                  aria-pressed={large}
                  onClick={() => setLarge(!large)}
                >
                  {large ? 'Standard text' : 'Larger text'}
                </button>
              </div>
              <h2>{opened.title}</h2>
              <p className="reader-status">{opened.status}</p>
              <div className="reader-actions">
                {onOpenHit && (
                  <button className="button primary" onClick={() => onOpenHit(opened)}>
                    {openLabel[opened.kind] || 'Open on the session desk'}
                  </button>
                )}
                {trail.length > 0 && (
                  <button className="button" onClick={back}>
                    Back to previous page
                  </button>
                )}
                {opened.kind === 'Wiki' && (
                  <button
                    className="button"
                    onClick={() => {
                      setDraft(structuredClone(m.pages.find((p) => p.id === opened.id)!));
                      setMessage('');
                    }}
                  >
                    Edit page text
                  </button>
                )}
                <button className="text-button" onClick={findInContents}>
                  Find in contents
                </button>
              </div>
              <BookText
                text={opened.body}
                excludePageId={opened.kind === 'Wiki' ? opened.id : undefined}
              />
              <div className="reader-actions">
                {opened.kind === 'Wiki' && (
                  <button className="button" onClick={() => onPin(opened.id)}>
                    <Pin size={14} />
                    {m.pins?.includes(opened.id) ? 'Unpin from live play' : 'Pin for live play'}
                  </button>
                )}
                {opened.sessionId && (
                  <button
                    className="button"
                    onClick={() => onNavigate('Session desk', opened.sessionId)}
                  >
                    Open linked session
                  </button>
                )}
              </div>
              {related.length > 0 && (
                <div className="reader-related">
                  <h3>Related pages</h3>
                  {related.map((p) => (
                    <button className="text-button" key={p.id} onClick={() => jump('Wiki', p.id)}>
                      {pageName(p)}
                    </button>
                  ))}
                </div>
              )}
              {(opened.kind === 'Wiki' || opened.kind === 'Creature') && (
                <MentionedIn
                  key={opened.kind + opened.id}
                  target={opened.kind === 'Wiki' ? opened.id : 'creature:' + opened.title}
                  pages={m.pages}
                  notes={m.notes}
                  onOpenPage={(id) => jump('Wiki', id)}
                  onOpenNote={(id) => jump('Journal', id)}
                />
              )}
              {opened.kind === 'Wiki' &&
                onOpenHit &&
                (() => {
                  const onMap = pinsForPage(m.maps, opened.id);
                  return (
                    onMap.length > 0 && (
                      <div className="reader-related">
                        <h3>On the map</h3>
                        {onMap.map(({ map, pin }) => (
                          <button
                            className="text-button"
                            key={map.id + pin.id}
                            onClick={() =>
                              onOpenHit({
                                id: map.id + ':' + pin.id,
                                kind: 'Map',
                                title: map.title,
                                body: '',
                                status: '',
                                date: '',
                                score: 0,
                              })
                            }
                          >
                            {map.title} · {pinName(pin, m.pages, map.pins.indexOf(pin))}
                          </button>
                        ))}
                      </div>
                    )
                  );
                })()}
              {fights.length > 0 && (
                <div className="reader-related">
                  <h3>Fights in</h3>
                  {fights.map((e) => (
                    <button
                      className="text-button"
                      key={e.id}
                      onClick={() => jump('Encounter', e.id)}
                    >
                      {e.title}
                    </button>
                  ))}
                </div>
              )}
              {opened.sourceId &&
                (() => {
                  const note = m.notes.find((n) => n.id === opened.sourceId),
                    q = (
                      m.pages.find((pg) => pg.id === opened.id || 'Wiki:' + pg.id === opened.id)
                        ?.quote || ''
                    ).trim(),
                    adds =
                      q.length > 0 && !opened.body.includes(q.replace(/[*_#>]/g, '').slice(0, 40));
                  return (
                    <p className="reader-source tiny muted">
                      {note && onOpenHit && (
                        <button
                          className="text-button"
                          onClick={() =>
                            onOpenHit(
                              searchCampaign(campaign, '', 'Journal').find(
                                (h) => h.id === note.id,
                              )!,
                            )
                          }
                        >
                          Open source note
                        </button>
                      )}
                      From {note?.title || 'a source that is not in this backup'}
                      {adds ? <>: “{q}”</> : '.'}
                    </p>
                  );
                })()}
              <footer className="reader-pagination">
                <button
                  className="button"
                  disabled={index === 0}
                  onClick={() => open(hits[index - 1])}
                >
                  <ChevronLeft size={16} />
                  Previous page
                </button>
                <button
                  className="button"
                  disabled={index === hits.length - 1}
                  onClick={() => open(hits[index + 1])}
                >
                  Next page
                  <ChevronRight size={16} />
                </button>
              </footer>
            </>
          ) : (
            <div className="empty">
              <h3>No pages match.</h3>
              <p>Try a shorter phrase or another category.</p>
            </div>
          )}
        </article>
      </div>
      {draft && (
        <div className="modal-overlay">
          <section
            className="modal reader-editor"
            role="dialog"
            aria-modal="true"
            aria-label="Edit page text"
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                const controls = Array.from(
                  e.currentTarget.querySelectorAll<HTMLElement>('button,textarea,summary'),
                ).filter((el) => el.getClientRects().length);
                const first = controls[0],
                  last = controls[controls.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <h2>{draft.title}</h2>
            <p>
              {draft.status} · {draft.visibility}. Saving preserves a revision in World wiki.
              Unfinished text is recovered on this computer when you return to this campaign reader.
            </p>
            <label>
              Page text
              <MentionTextarea
                autoFocus
                rows={14}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              />
            </label>
            <details>
              <summary>Preview formatting</summary>
              <BookText text={draft.body} />
            </details>
            {message && <p role="status">{message}</p>}
            <div className="reader-actions">
              <button className="button primary" onClick={save}>
                Save and return to reading
              </button>
              <button
                className="button"
                onClick={() => {
                  if (
                    draft.body === m.pages.find((p) => p.id === draft.id)?.body ||
                    window.confirm('Discard unsaved page text?')
                  )
                    setDraft(null);
                }}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
