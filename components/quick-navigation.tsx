'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowUpRight, X } from 'lucide-react';
import type { Campaign } from '../lib/campaign';
import { searchCampaign, relevance, excerpt, type SearchHit } from '../lib/campaign-search';
import { plainPreview } from '../lib/plain-text';
import { appFetch, isDesktop } from '../lib/transport';
import type { RuleEntry } from '../lib/rules';
import { memoryOf } from '../lib/memory';
import { recentItems } from '../lib/recent-items';

export type QuickAction = { label: string; detail: string; run: () => void };
type Props = {
  campaign: Campaign;
  campaigns: Campaign[];
  actions: QuickAction[];
  onOpen: (hit: SearchHit) => void;
  onRule: (hit: SearchHit) => void;
  onElsewhere: (campaignId: string, kind: SearchHit['kind'], id: string) => void;
  onClose: () => void;
};
// A match the desktop app's full-text index found in another saved campaign.
type StoreHit = { campaign: string; kind: string; id: string; title: string; text: string };
const storeKinds: Record<string, SearchHit['kind']> = {
  session: 'Session',
  event: 'Event',
  card: 'Material',
  page: 'Wiki',
  note: 'Journal',
};
const categories = [
  ['All', 'Everything'],
  ['Wiki', 'World wiki'],
  ['Session', 'Session plans'],
  ['Play', 'Prepared paths'],
  ['Event', 'Confirmed outcomes'],
  ['Journal', 'Source notes'],
  ['Material', 'Saved ideas'],
  ['Character', 'Party'],
  ['Handout', 'Handouts'],
  ['Creature', 'Campaign creatures'],
  ['Encounter', 'Encounters'],
  ['Rule', 'Rules'],
];
export default function QuickNavigation({
  campaign,
  campaigns,
  actions,
  onOpen,
  onRule,
  onElsewhere,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null),
    [query, setQuery] = useState(''),
    [index, setIndex] = useState(0);
  const [category, setCategory] = useState('All'),
    [recent] = useState(() => recentItems(campaign.id));
  const [rules, setRules] = useState<{ query: string; entries: RuleEntry[]; error: string }>({
    query: '',
    entries: [],
    error: '',
  });
  const searchingRules =
    isDesktop() && query.trim().length >= 2 && (category === 'All' || category === 'Rule');
  useEffect(() => {
    const d = dialog.current,
      opener = document.activeElement as HTMLElement | null;
    d?.showModal();
    return () => {
      d?.close();
      opener?.focus?.();
    };
  }, []);
  useEffect(() => {
    if (!searchingRules) return;
    let active = true;
    const timer = setTimeout(() => {
      void appFetch('/api/rules/search', {
        method: 'POST',
        body: JSON.stringify({
          query: query.trim(),
          kind: 'All',
          source: 'All',
          edition: 'All',
          offset: 0,
          limit: 8,
        }),
      })
        .then(async (r) => {
          if (!r.ok) throw Error('Rules search unavailable.');
          const data = (await r.json()) as { entries: RuleEntry[] };
          if (active) setRules({ query, entries: data.entries.slice(0, 8), error: '' });
        })
        .catch(() => {
          if (active)
            setRules({
              query,
              entries: [],
              error: 'Rules search is unavailable. Open Library → Rules to retry.',
            });
        });
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, searchingRules]);
  const [others, setOthers] = useState<{ query: string; hits: StoreHit[] }>({
    query: '',
    hits: [],
  });
  const searchingOthers =
    isDesktop() && campaigns.length > 1 && query.trim().length >= 2 && category === 'All';
  useEffect(() => {
    if (!searchingOthers) return;
    let active = true;
    const timer = setTimeout(() => {
      void appFetch('/api/campaigns/search', {
        method: 'POST',
        body: JSON.stringify({ query: query.trim(), exclude: campaign.id }),
      })
        .then(async (r) => {
          if (!r.ok) throw Error('Campaign search unavailable.');
          const data = (await r.json()) as { hits: StoreHit[] };
          if (active) setOthers({ query, hits: data.hits.slice(0, 8) });
        })
        .catch(() => {
          if (active) setOthers({ query, hits: [] });
        });
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, searchingOthers, campaign.id]);
  const matches = useMemo(() => {
    const destinations =
      category === 'All'
        ? actions
            .filter((a) => !query.trim() || relevance(a.label + ' ' + a.detail, query) > 0)
            .map((a, i) => ({ ...a, id: 'action:' + i, kind: 'Go to' }))
        : [];
    const entries = searchCampaign(campaign, query, category);
    const asAction = (hit: SearchHit, kind: string = hit.kind) => ({
      id: hit.kind + ':' + hit.id,
      kind,
      label: hit.title,
      detail: plainPreview(excerpt(hit.body, query), 150),
      run: () => onOpen(hit),
    });
    if (!query.trim() && category === 'All') {
      const pinned = entries.filter(
        (hit) => hit.kind === 'Wiki' && memoryOf(campaign).pins?.includes(hit.id),
      );
      const visited = recent
        .map((item) => entries.find((hit) => hit.id === item.id && hit.kind === item.kind))
        .filter(
          (hit): hit is SearchHit =>
            !!hit && !pinned.some((p) => p.id === hit.id && p.kind === hit.kind),
        );
      return [
        ...pinned.slice(0, 6).map((hit) => asAction(hit, 'Kept handy')),
        ...visited.map((hit) => asAction(hit, 'Recent · ' + hit.kind)),
        ...destinations,
      ];
    }
    const content = entries.slice(0, 35).map((hit) => asAction(hit));
    const references =
      searchingRules && rules.query === query
        ? rules.entries
            .filter((entry) => !entries.some((hit) => hit.kind === 'Rule' && hit.id === entry.id))
            .map((entry) => ({
              id: 'rule:' + entry.id,
              kind: 'Rule',
              label: entry.name,
              detail: entry.kind + ' · ' + entry.source + ' · ' + entry.edition,
              run: () =>
                onRule({
                  id: entry.id,
                  kind: 'Rule',
                  title: entry.name,
                  body: '',
                  status: entry.source,
                  date: '',
                  score: 0,
                }),
            }))
        : [];
    const elsewhere =
      searchingOthers && others.query === query
        ? others.hits.flatMap((hit) => {
            const kind = storeKinds[hit.kind],
              name = campaigns.find((c) => c.id === hit.campaign)?.name;
            if (!kind || !name) return [];
            return [
              {
                id: 'elsewhere:' + hit.campaign + ':' + hit.kind + ':' + hit.id,
                kind: name + ' · ' + kind,
                label: hit.title || (kind === 'Event' ? 'Recorded event' : 'Untitled'),
                detail: plainPreview(hit.text, 150),
                run: () => onElsewhere(hit.campaign, kind, hit.id),
              },
            ];
          })
        : [];
    return [...content, ...references, ...elsewhere, ...destinations];
  }, [
    actions,
    campaign,
    campaigns,
    query,
    rules,
    others,
    onOpen,
    onRule,
    onElsewhere,
    category,
    recent,
    searchingRules,
    searchingOthers,
  ]);
  const selected = Math.min(index, Math.max(0, matches.length - 1));
  useEffect(() => {
    dialog.current
      ?.querySelector('.command-results .selected')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected, query]);
  function choose(action: QuickAction) {
    onClose();
    action.run();
  }
  return (
    <dialog
      aria-label="Search campaign"
      ref={dialog}
      className="command-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="command-surface">
        <div className="command-input">
          <Search size={22} />
          <input
            autoFocus
            aria-label="Search campaign content and rules"
            placeholder="People, places, session notes, choices, rules…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex(Math.min(selected + 1, matches.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex(Math.max(0, selected - 1));
              }
              if (e.key === 'Enter' && matches[selected]) {
                e.preventDefault();
                choose(matches[selected]);
              }
            }}
          />
          <button aria-label="Close search" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <label className="command-category">
          Search in
          <select
            aria-label="Search category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setIndex(0);
            }}
          >
            {categories.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="command-results">
          {matches.map((action, i) => (
            <button
              key={action.id}
              className={selected === i ? 'selected' : ''}
              onMouseEnter={() => setIndex(i)}
              onClick={() => choose(action)}
            >
              <span>
                <small className="search-kind">{action.kind}</small>
                <strong>{action.label}</strong>
                <small>{action.detail}</small>
              </span>
              <ArrowUpRight size={17} />
            </button>
          ))}
          {!matches.length && (
            <p>
              {category === 'Rule' && query.trim().length < 2
                ? 'Enter at least two characters to search the rules library.'
                : query
                  ? 'No matches. Try a name, a few words from your notes, or another category.'
                  : 'No items in this category yet.'}
            </p>
          )}
          {searchingRules && rules.query !== query && (
            <p role="status">Searching the rules library…</p>
          )}
          {rules.query === query && rules.error && <p role="status">{rules.error}</p>}
        </div>
        <footer>
          <span>↑ ↓ to browse · Enter to open</span>
          <span>Esc to close</span>
        </footer>
      </div>
    </dialog>
  );
}
