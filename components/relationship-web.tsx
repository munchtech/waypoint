'use client';
import {
  createElement,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from 'react';
import {
  ArrowLeft,
  Flag,
  MapPin,
  Network,
  PenLine,
  ScrollText,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { WikiPage } from '../lib/memory';
import type { SearchHit } from '../lib/campaign-search';
import { pageName } from '../lib/page-name';
import { plainPreview } from '../lib/plain-text';
import { sharedIndex } from '../lib/backlinks';
import { neighborhood, otherEnd, webEdges, type WebEdge } from '../lib/relationship-web';

// Pages are grouped by kind; each group has a colour and an icon, and the legend chips turn a group on or off.
type Group = 'people' | 'place' | 'faction' | 'other';
const groupOf = (kind: WikiPage['kind']): Group =>
  kind === 'NPC' || kind === 'Character'
    ? 'people'
    : kind === 'Location'
      ? 'place'
      : kind === 'Faction'
        ? 'faction'
        : 'other';
const groups: { id: Group; label: string; Icon: LucideIcon }[] = [
  { id: 'people', label: 'People', Icon: UserRound },
  { id: 'place', label: 'Places', Icon: MapPin },
  { id: 'faction', label: 'Factions', Icon: Flag },
  { id: 'other', label: 'Quests, items & lore', Icon: ScrollText },
];
const iconOf = (g: Group) => groups.find((x) => x.id === g)!.Icon;
// A fixed component, so React never sees a new component type while it renders.
function GroupIcon({ group, ...props }: { group: Group } & ComponentProps<LucideIcon>) {
  return createElement(iconOf(group), props);
}
const short = (name: string, n: number) => (name.length > n ? name.slice(0, n - 1) + '…' : name);

// The drawing: the chosen page in the middle, its connections on an inner ellipse and a few of theirs on an outer one.
const W = 1000,
  H = 600,
  cx = W / 2,
  cy = H / 2 - 6;
const R1 = { x: 228, y: 156 },
  R2 = { x: 352, y: 250 },
  MID = { x: (R1.x + R2.x) / 2, y: (R1.y + R2.y) / 2 };
const at = (a: number, r: { x: number; y: number }) => ({
  x: cx + r.x * Math.cos(a),
  y: cy + r.y * Math.sin(a),
});
// Rough text widths for keeping labels apart (Manrope is close to 0.56em a character).
const textWidth = (text: string, size: number) => text.length * size * 0.56;
const N1 = 24,
  N2 = 21;
type Box = { x0: number; x1: number; y0: number; y1: number };
const overlaps = (a: Box, b: Box) =>
  a.x0 < b.x1 + 4 && b.x0 < a.x1 + 4 && a.y0 < b.y1 + 2 && b.y0 < a.y1 + 2;
// Outer labels sit on the far side of their dot, so they read outwards like a compass rose.
function outerLabel(a: number, name: string) {
  const p = at(a, R2),
    c = Math.cos(a),
    w = textWidth(short(name, N2), 11);
  if (c > 0.3) return { ...p, anchor: 'start' as const, tx: p.x + 11, ty: p.y + 4, w };
  if (c < -0.3) return { ...p, anchor: 'end' as const, tx: p.x - 11, ty: p.y + 4, w };
  return { ...p, anchor: 'middle' as const, tx: p.x, ty: Math.sin(a) < 0 ? p.y - 12 : p.y + 20, w };
}
function boxOf(ring: 1 | 2, a: number, name: string): Box {
  if (ring === 1) {
    const p = at(a, R1),
      w = Math.max(36, textWidth(short(name, N1), 12));
    return { x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - 18, y1: p.y + 38 };
  }
  const l = outerLabel(a, name),
    x0 = l.anchor === 'start' ? l.x - 8 : l.anchor === 'end' ? l.tx - l.w : l.tx - l.w / 2,
    x1 = l.anchor === 'start' ? l.tx + l.w : l.anchor === 'end' ? l.x + 8 : l.tx + l.w / 2;
  return { x0, x1, y0: Math.min(l.y - 8, l.ty - 11), y1: Math.max(l.y + 8, l.ty + 3) };
}
// Nudges neighbours on one ring apart until their labels no longer touch (or it runs out of tries).
function spreadOut(items: { id: string; a: number; name: string }[], ring: 1 | 2) {
  const list = [...items].sort((x, y) => x.a - y.a);
  if (list.length < 2) return list;
  for (let round = 0; round < 160; round++) {
    let moved = false;
    // With two, the pair across the wrap is the same pair again, and pushing it twice would undo the push.
    for (let i = 0; i < (list.length === 2 ? 1 : list.length); i++) {
      const p = list[i],
        q = list[(i + 1) % list.length];
      if (p === q || !overlaps(boxOf(ring, p.a, p.name), boxOf(ring, q.a, q.name))) continue;
      p.a -= 0.012;
      q.a += 0.012;
      moved = true;
    }
    if (!moved) break;
  }
  return list;
}

// Wiki pages and how they connect, around one page at a time: its own connections, a few of theirs, and the lines among
// them. Click a page to move to it; Back retraces the way you came.
export default function RelationshipWeb({
  pages,
  onOpenPage,
}: {
  pages: WikiPage[];
  onOpenPage?: (hit: SearchHit) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const [focusId, setFocusId] = useState(''),
    [trail, setTrail] = useState<string[]>([]),
    [mentions, setMentions] = useState(true),
    [hidden, setHidden] = useState<Group[]>([]),
    [hover, setHover] = useState('');
  const allEdges = useMemo(() => webEdges(pages, sharedIndex(pages)), [pages]);
  const byId = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);
  // With nothing chosen yet, start on the best-connected person, place or faction rather than the first page.
  const start = useMemo(() => {
    const degree = new Map<string, number>();
    for (const e of allEdges)
      for (const id of [e.a, e.b]) degree.set(id, (degree.get(id) || 0) + (e.set ? 3 : 1));
    const best = (list: WikiPage[]) =>
      list.reduce<WikiPage | undefined>(
        (top, p) => ((degree.get(p.id) || 0) > (top ? degree.get(top.id) || 0 : 0) ? p : top),
        undefined,
      );
    return best(pages.filter((p) => groupOf(p.kind) !== 'other')) || best(pages) || pages[0];
  }, [allEdges, pages]);
  const focus = byId.get(focusId) || start;
  const edges = useMemo(() => {
    if (!hidden.length || !focus) return allEdges;
    const shown = (id: string) =>
      id === focus.id || !hidden.includes(groupOf(byId.get(id)?.kind || 'Lore'));
    return allEdges.filter((e) => shown(e.a) && shown(e.b));
  }, [allEdges, hidden, focus, byId]);
  const web = focus ? neighborhood(edges, focus.id, { mentions }) : null;
  const options = useMemo(
    () =>
      groups.map((g) => ({
        ...g,
        pages: pages
          .filter((p) => groupOf(p.kind) === g.id)
          .map((p) => ({ id: p.id, name: pageName(p) }))
          .sort((x, y) => x.name.localeCompare(y.name)),
      })),
    [pages],
  );
  if (!focus || !web)
    return (
      <section className="paper relationship-web">
        <div className="web-head">
          <h3>
            <Network size={17} /> Relationship web
          </h3>
        </div>
        <div className="empty">
          <Network size={30} />
          <p>Links between wiki pages show up here.</p>
        </div>
      </section>
    );

  // Places: the inner ring evenly round the middle, each page's own connections fanned out behind it.
  const name = (id: string) => pageName(byId.get(id)!);
  const inner = spreadOut(
    web.ring1.map((id, i) => ({
      id,
      a: -Math.PI / 2 + (2 * Math.PI * i) / web.ring1.length,
      name: name(id),
    })),
    1,
  );
  const angle = new Map(inner.map((n) => [n.id, n.a]));
  const sector = web.ring1.length ? (2 * Math.PI) / web.ring1.length : Math.PI;
  const outer = spreadOut(
    web.ring1.flatMap((parent) => {
      const kids = web.ring2.filter((k) => k.parent === parent),
        step = Math.min(0.17, (sector * 0.8) / Math.max(1, kids.length));
      return kids.map((k, j) => ({
        id: k.id,
        a: angle.get(parent)! + (j - (kids.length - 1) / 2) * step,
        name: name(k.id),
      }));
    }),
    2,
  );
  const outerAngle = new Map(outer.map((n) => [n.id, n.a]));
  const parentOf = new Map(web.ring2.map((k) => [k.id, k.parent]));
  const pos = (id: string) =>
    id === focus.id
      ? { x: cx, y: cy }
      : angle.has(id)
        ? at(angle.get(id)!, R1)
        : at(outerAngle.get(id)!, R2);
  // Lines from the middle run straight; lines out to the outer ring bow outwards from their inner page.
  const curves = web.links.map((e) => {
    const far = e.a === focus.id ? e.b : e.b === focus.id ? e.a : parentOf.has(e.a) ? e.a : e.b,
      from = otherEnd(e, far),
      a = pos(from),
      b = pos(far),
      c = from !== focus.id && angle.has(from) ? at(angle.get(from)!, MID) : null;
    return {
      e,
      g: groupOf(byId.get(far)!.kind),
      d: c ? `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}` : `M${a.x},${a.y} L${b.x},${b.y}`,
      mid: c
        ? { x: 0.25 * a.x + 0.5 * c.x + 0.25 * b.x, y: 0.25 * a.y + 0.5 * c.y + 0.25 * b.y }
        : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  });
  // Hovering a page lights its own lines and the pages at their ends; the rest fades back.
  const lit = new Set<string>();
  if (hover)
    for (const e of web.links)
      if (e.a === hover || e.b === hover) {
        lit.add(e.a);
        lit.add(e.b);
      }
  const dim = (id: string) => (hover && !lit.has(id) ? ' dim' : '');
  const edgeDim = (e: WebEdge) => (hover && e.a !== hover && e.b !== hover ? ' dim' : '');

  const move = (id: string) => {
    if (id === focus.id) return;
    setTrail((t) => [...t.filter((x) => x !== focus.id), focus.id].slice(-6));
    setFocusId(id);
    setHover('');
  };
  const back = () => {
    const prev = trail[trail.length - 1];
    if (!prev) return;
    setTrail(trail.slice(0, -1));
    setFocusId(prev);
    setHover('');
  };
  const key = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      move(id);
    }
  };
  const nodeEvents = (id: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': 'Move to ' + name(id),
    onClick: () => move(id),
    onKeyDown: key(id),
    onMouseEnter: () => setHover(id),
    onMouseLeave: () => setHover(''),
    onFocus: () => setHover(id),
    onBlur: () => setHover(''),
  });
  const near = web.ring1.map((id) => ({
    page: byId.get(id)!,
    edge: web.links.find(
      (e) => otherEnd(e, focus.id) === id && (e.a === focus.id || e.b === focus.id),
    )!,
  }));
  // Each chip counts this page's own connections of that kind, shown or not, so a hidden kind still says what it holds.
  const countOf = (g: Group) =>
    allEdges.filter(
      (e) =>
        (e.a === focus.id || e.b === focus.id) &&
        (e.set || (mentions && e.mentions > 0)) &&
        groupOf(byId.get(otherEnd(e, focus.id))!.kind) === g,
    ).length;
  const focusGroup = groupOf(focus.kind),
    preview = plainPreview(focus.body || '', 240);

  return (
    <section className="paper relationship-web">
      <div className="web-head">
        <div>
          <h3>
            <Network size={17} /> Relationship web
          </h3>
          <p className="muted">
            How your wiki pages connect. Solid lines are related pages you set in the editor; dotted
            lines are pages named in each other’s text. Click a page to move to it.
          </p>
        </div>
        {trail.length > 0 && (
          <nav className="web-trail" aria-label="Pages you came through">
            <button className="button" onClick={back}>
              <ArrowLeft size={14} /> Back
            </button>
            <ol>
              {trail.slice(-3).map((id) => (
                <li key={id}>
                  <button className="text-button" onClick={() => move(id)}>
                    {short(name(id), 22)}
                  </button>
                </li>
              ))}
              <li aria-current="page">{short(pageName(focus), 22)}</li>
            </ol>
          </nav>
        )}
      </div>
      <div className="web-controls">
        <select
          aria-label="Relationship focus"
          value={focus.id}
          onChange={(e) => move(e.target.value)}
        >
          {options
            .filter((g) => g.pages.length)
            .map((g) => (
              <optgroup key={g.id} label={g.label}>
                {g.pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
        <div className="web-filters" role="group" aria-label="Show these kinds of page">
          {groups.map(({ id, label, Icon }) => {
            const on = !hidden.includes(id);
            return (
              <button
                key={id}
                className={'web-chip k-' + id + (on ? ' on' : '')}
                aria-pressed={on}
                onClick={() => setHidden(on ? [...hidden, id] : hidden.filter((g) => g !== id))}
              >
                <Icon size={13} />
                {label}
                <span className="count">{countOf(id)}</span>
              </button>
            );
          })}
          <button
            className={'web-chip k-named' + (mentions ? ' on' : '')}
            aria-pressed={mentions}
            onClick={() => setMentions(!mentions)}
          >
            <svg viewBox="0 0 18 4" aria-hidden="true">
              <line x1="1" y1="2" x2="17" y2="2" />
            </svg>
            Named in the text
          </button>
        </div>
      </div>
      <div className="web-canvas">
        <svg
          className="web-map"
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-label={'Connections around ' + pageName(focus)}
        >
          <defs>
            <radialGradient id={uid + 'glow'}>
              <stop offset="0" className="glow-in" />
              <stop offset="1" className="glow-out" />
            </radialGradient>
          </defs>
          <ellipse cx={cx} cy={cy} rx={R2.x + 40} ry={R2.y + 30} fill={`url(#${uid}glow)`} />
          <ellipse className="guide" cx={cx} cy={cy} rx={R1.x} ry={R1.y} />
          <ellipse className="guide" cx={cx} cy={cy} rx={R2.x} ry={R2.y} />
          {curves.map(({ e, d, g }) => (
            <path
              key={e.a + '|' + e.b}
              className={'edge k-' + g + (e.set ? ' set' : ' named') + edgeDim(e)}
              d={d}
            />
          ))}
          {curves
            .filter(({ e }) => e.label)
            .map(({ e, mid }) => (
              <text
                key={'label' + e.a + '|' + e.b}
                className={'edge-label' + edgeDim(e)}
                x={mid.x}
                y={mid.y - 5}
                textAnchor="middle"
              >
                {short(e.label, 24)}
              </text>
            ))}
          {outer.map(({ id, a }) => {
            const page = byId.get(id)!,
              l = outerLabel(a, name(id));
            return (
              <g
                key={id}
                className={'web-node ring2 k-' + groupOf(page.kind) + dim(id)}
                {...nodeEvents(id)}
              >
                <title>{name(id) + ' · ' + page.kind}</title>
                <circle className="hit" cx={l.x} cy={l.y} r={14} />
                <circle className="dot" cx={l.x} cy={l.y} r={6.5} />
                <text x={l.tx} y={l.ty} textAnchor={l.anchor}>
                  {short(name(id), N2)}
                </text>
              </g>
            );
          })}
          {inner.map(({ id, a }) => {
            const page = byId.get(id)!,
              p = at(a, R1),
              g = groupOf(page.kind);
            return (
              <g key={id} className={'web-node ring1 k-' + g + dim(id)} {...nodeEvents(id)}>
                <title>{name(id) + ' · ' + page.kind}</title>
                <circle className="dot" cx={p.x} cy={p.y} r={16} />
                <GroupIcon
                  group={g}
                  className="glyph"
                  x={p.x - 8}
                  y={p.y - 8}
                  width={16}
                  height={16}
                />
                <text x={p.x} y={p.y + 33} textAnchor="middle">
                  {short(name(id), N1)}
                </text>
              </g>
            );
          })}
          <g className={'web-node hub k-' + focusGroup}>
            <title>{pageName(focus) + ' · ' + focus.kind}</title>
            <circle className="halo" cx={cx} cy={cy} r={50} />
            <circle className="dot" cx={cx} cy={cy} r={38} />
            <GroupIcon
              group={focusGroup}
              className="glyph"
              x={cx - 15}
              y={cy - 15}
              width={30}
              height={30}
            />
            <text className="hub-name" x={cx} y={cy + 66} textAnchor="middle">
              {short(pageName(focus), 34)}
            </text>
            <text className="hub-kind" x={cx} y={cy + 84} textAnchor="middle">
              {focus.kind + ' · ' + web.total + (web.total === 1 ? ' connection' : ' connections')}
            </text>
          </g>
        </svg>
      </div>
      {web.total > web.ring1.length && (
        <p className="muted web-note">
          Showing the {web.ring1.length} strongest of {web.total} connections.
        </p>
      )}
      <div className="web-details">
        <article className={'web-focus k-' + focusGroup}>
          <span className="web-kind">
            <GroupIcon group={focusGroup} size={13} /> {focus.kind}
            <span className="web-status">
              {focus.status} · {focus.visibility}
            </span>
          </span>
          <h4>{pageName(focus)}</h4>
          {preview && <p>{preview}</p>}
          {onOpenPage && (
            <button
              className="button"
              onClick={() =>
                onOpenPage({
                  id: focus.id,
                  kind: 'Wiki',
                  title: focus.title,
                  body: '',
                  status: focus.status,
                  date: '',
                  pageKind: focus.kind,
                  score: 0,
                })
              }
            >
              <PenLine size={14} /> Open in the wiki editor
            </button>
          )}
        </article>
        <div className="web-links">
          {groups.map(({ id, label, Icon }) => {
            const here = near.filter((n) => groupOf(n.page.kind) === id);
            if (!here.length) return null;
            return (
              <section key={id} className={'k-' + id}>
                <h5>
                  <Icon size={13} /> {label} <span className="count">{here.length}</span>
                </h5>
                <ul>
                  {here.map(({ page, edge }) => (
                    <li key={page.id}>
                      <button
                        className="web-link"
                        onClick={() => move(page.id)}
                        onMouseEnter={() => setHover(page.id)}
                        onMouseLeave={() => setHover('')}
                      >
                        <span className="name">{pageName(page)}</span>
                        <small>
                          {edge?.label || (edge?.set ? 'Related page' : 'Named in the text')}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {!web.ring1.length && (
            <p className="muted">
              {hidden.length
                ? 'Nothing of the kinds shown connects to this page. Turn a kind back on above.'
                : 'Nothing connects to this page yet. Choose related pages in the wiki editor, or name it in another page’s text.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
