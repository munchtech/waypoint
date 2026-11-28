import type { WikiPage } from './memory';
import { splitMentions, type mentionIndex } from './wiki-mentions';

// The relationship web: every connection between wiki pages, and the part of it around one page.
// A connection is a related page set in the editor (with how they connect, if written) or a page named in another's text.
type Index = ReturnType<typeof mentionIndex>;
export type WebEdge = { a: string; b: string; set: boolean; mentions: number; label: string };

export function webEdges(pages: WikiPage[], index: Index): WebEdge[] {
  const ids = new Set(pages.map((p) => p.id)),
    edges = new Map<string, WebEdge>();
  const edge = (x: string, y: string) => {
    const [a, b] = x < y ? [x, y] : [y, x],
      key = a + '\n' + b;
    let e = edges.get(key);
    if (!e) edges.set(key, (e = { a, b, set: false, mentions: 0, label: '' }));
    return e;
  };
  for (const p of pages) {
    for (const id of p.related || []) {
      if (id === p.id || !ids.has(id)) continue;
      const e = edge(p.id, id),
        label = (p.relations?.[id] || '').trim();
      e.set = true;
      if (label && !e.label) e.label = label;
    }
    const named = new Set<string>();
    for (const part of splitMentions(p.body, index, new Set(), true))
      if (part.pageId && part.pageId !== p.id && ids.has(part.pageId)) named.add(part.pageId);
    for (const id of named) edge(p.id, id).mentions++;
  }
  return [...edges.values()];
}

export const otherEnd = (e: WebEdge, id: string) => (e.a === id ? e.b : e.a);
const weight = (e: WebEdge) => (e.set ? 100 : 0) + (e.label ? 50 : 0) + e.mentions;

// The pages around `focus`: its own connections (ring 1, strongest first) and a few of theirs (ring 2), with the line
// that joins each one to the web (only those, so a busy page stays readable). `mentions: false` keeps only the related pages set in the editor.
export function neighborhood(
  edges: WebEdge[],
  focus: string,
  { mentions = true, near = 12, far = 18, perPage = 3 } = {},
) {
  const used = edges.filter((e) => e.set || (mentions && e.mentions > 0)),
    links = new Map<string, WebEdge[]>();
  for (const e of used) for (const id of [e.a, e.b]) links.set(id, [...(links.get(id) || []), e]);
  const around = (id: string) => [...(links.get(id) || [])].sort((x, y) => weight(y) - weight(x));
  const all = around(focus),
    lines = all.slice(0, near),
    ring1 = lines.map((e) => otherEnd(e, focus)),
    shown = new Set([focus, ...ring1]),
    ring2: { id: string; parent: string }[] = [];
  // Ring 2 is dealt out a page at a time, one to each ring-1 page in turn, so the outer ring fills evenly all the way round.
  const queues = ring1.map((parent) => ({ parent, next: around(parent) }));
  for (let round = 0; round < perPage; round++)
    for (const { parent, next } of queues) {
      if (ring2.length === far) break;
      for (let e = next.shift(); e; e = next.shift()) {
        const id = otherEnd(e, parent);
        if (shown.has(id)) continue;
        shown.add(id);
        ring2.push({ id, parent });
        lines.push(e);
        break;
      }
    }
  return {
    ring1,
    ring2,
    links: lines,
    total: all.length,
  };
}
