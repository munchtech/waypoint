'use client';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { BookOpen, GitBranch } from 'lucide-react';
import type { WikiPage } from '../lib/memory';
import { pageName } from '../lib/page-name';
import { sharedIndex } from '../lib/backlinks';
import { neighborhood, otherEnd, webEdges } from '../lib/relationship-web';

// Node colour by kind of page; the legend names them, and every node carries its name.
const groupOf = (kind: WikiPage['kind']) =>
  kind === 'NPC' || kind === 'Character'
    ? 'kind-people'
    : kind === 'Location'
      ? 'kind-place'
      : kind === 'Faction'
        ? 'kind-faction'
        : 'kind-other';
const groups = [
  ['kind-people', 'People'],
  ['kind-place', 'Places'],
  ['kind-faction', 'Factions'],
  ['kind-other', 'Quests, items, lore'],
] as const;
const short = (name: string, n: number) => (name.length > n ? name.slice(0, n - 1) + '…' : name);
const W = 720,
  H = 470,
  cx = W / 2,
  cy = H / 2;
const at = (angle: number, rx: number, ry: number) => ({
  x: cx + rx * Math.cos(angle),
  y: cy + ry * Math.sin(angle),
});

// Wiki pages and how they connect, around one page at a time: its own connections, a few of theirs, and the lines among
// them. Click a page to move to it.
export default function RelationshipWeb({ pages }: { pages: WikiPage[] }) {
  const [focusId, setFocusId] = useState(''),
    [mentions, setMentions] = useState(true);
  const edges = useMemo(() => webEdges(pages, sharedIndex(pages)), [pages]);
  const byId = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);
  const focus = byId.get(focusId) || pages[0];
  const web = focus ? neighborhood(edges, focus.id, { mentions }) : null;
  if (!focus || !web)
    return (
      <section className="paper relationship-web">
        <h3>
          <GitBranch size={17} /> Relationship web
        </h3>
        <div className="empty">
          <GitBranch size={30} />
          <p>Your relationship web will grow with the wiki.</p>
        </div>
      </section>
    );
  const place = new Map<string, { x: number; y: number; ring: number }>([
    [focus.id, { x: cx, y: cy, ring: 0 }],
  ]);
  const angles = new Map<string, number>();
  web.ring1.forEach((id, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / web.ring1.length;
    angles.set(id, a);
    place.set(id, { ...at(a, 175, 120), ring: 1 });
  });
  const spread = web.ring1.length ? Math.min(0.5, Math.PI / web.ring1.length) : 0.5;
  for (const parent of web.ring1) {
    const kids = web.ring2.filter((k) => k.parent === parent);
    kids.forEach((k, j) => {
      const a =
        angles.get(parent)! + (kids.length > 1 ? (j / (kids.length - 1) - 0.5) * spread : 0);
      place.set(k.id, { ...at(a, 320, 205), ring: 2 });
    });
  }
  const move = (id: string) => setFocusId(id);
  const key = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      move(id);
    }
  };
  const near = web.ring1.map((id) => ({
    page: byId.get(id)!,
    edge: web.links.find(
      (e) => otherEnd(e, focus.id) === id && (e.a === focus.id || e.b === focus.id),
    )!,
  }));
  return (
    <section className="paper relationship-web">
      <h3>
        <GitBranch size={17} /> Relationship web
      </h3>
      <p className="muted">
        How the pages in your wiki connect: related pages you set in the editor (solid lines, with
        how they connect) and pages named in each other’s text (dotted). Click a page to move to it.
      </p>
      <div className="web-controls">
        <select
          aria-label="Relationship focus"
          value={focus.id}
          onChange={(e) => move(e.target.value)}
        >
          {pages.map((p) => (
            <option key={p.id} value={p.id}>
              {pageName(p)}
            </option>
          ))}
        </select>
        <label className="web-toggle">
          <input
            type="checkbox"
            checked={mentions}
            onChange={(e) => setMentions(e.target.checked)}
          />
          Include pages named in the text
        </label>
      </div>
      <svg
        className="relationship-map web-map"
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label={'Connections around ' + pageName(focus)}
      >
        {web.links.map((e) => {
          const a = place.get(e.a)!,
            b = place.get(e.b)!;
          return (
            <g key={e.a + '|' + e.b}>
              <line
                className={'link' + (e.set ? ' set' : ' named')}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
              />
              {e.label && (
                <text
                  className="edge-label"
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 4}
                  textAnchor="middle"
                >
                  {short(e.label, 22)}
                </text>
              )}
            </g>
          );
        })}
        {[...place].map(([id, p]) => {
          const page = byId.get(id)!,
            name = pageName(page),
            hub = p.ring === 0;
          return (
            <g
              key={id}
              className={'web-node ' + groupOf(page.kind) + (hub ? ' hub' : ' ring' + p.ring)}
              role={hub ? undefined : 'button'}
              tabIndex={hub ? undefined : 0}
              aria-label={hub ? undefined : 'Move to ' + name}
              onClick={hub ? undefined : () => move(id)}
              onKeyDown={hub ? undefined : key(id)}
            >
              <title>{name + ' · ' + page.kind}</title>
              <circle cx={p.x} cy={p.y} r={hub ? 30 : p.ring === 1 ? 10 : 7} />
              <text x={p.x} y={hub ? p.y + 46 : p.y + (p.ring === 1 ? 24 : 20)} textAnchor="middle">
                {short(name, hub ? 28 : p.ring === 1 ? 20 : 16)}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="web-legend" aria-label="Colours">
        {groups.map(([g, label]) => (
          <li key={g} className={'web-node ' + g}>
            <svg viewBox="0 0 10 10" aria-hidden="true">
              <circle cx="5" cy="5" r="5" />
            </svg>
            {label}
          </li>
        ))}
      </ul>
      {web.total > web.ring1.length && (
        <p className="muted">
          Showing the {web.ring1.length} strongest of {web.total} connections.
        </p>
      )}
      <div className="connection-list">
        {near.map(({ page, edge }) => (
          <button className="button" key={page.id} onClick={() => move(page.id)}>
            <BookOpen size={13} />
            {pageName(page)}
            {edge?.label && <small> · {edge.label}</small>}
          </button>
        ))}
      </div>
      {!web.ring1.length && (
        <p className="muted">
          Nothing connects to this page yet. Choose related pages in the wiki editor, or name it in
          another page’s text.
        </p>
      )}
    </section>
  );
}
