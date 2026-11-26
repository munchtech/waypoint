import type { Campaign } from './campaign';
import { attachmentTypes, type AssistChange } from './generation-contract';
import { memoryOf, type WikiPage } from './memory';
import { pageName } from './page-name';

// The assistant: the DM asks for changes ("add the NPCs from these notes", "Yara betrayed the party"), Claude proposes
// wiki changes, and nothing changes until the DM approves one. Every approved change can be undone.
export type AssistProposal = AssistChange & {
  id: string;
  pageId?: string; // the page an update changes
  before?: string; // its text when Claude proposed the change
  state: 'pending' | 'applied' | 'skipped';
};
export type AssistUndo = {
  proposalId: string;
  pageId: string;
  title: string;
  previous: WikiPage | null; // the page before the change, or null for a new page
  applied: string; // the page's updated time once changed: Undo is offered only while it still matches
};
export type AssistState = {
  campaignId: string;
  request: string;
  reply: string;
  proposals: AssistProposal[];
  left: number; // changes to pages whose whole text Claude did not have, left out
  undo: AssistUndo[]; // newest last
};
// Wiki pages are sent whole up to this length; Claude is told not to rewrite a longer page, and such an update is dropped.
export const ASSIST_BODY_LIMIT = 5000;

const key = (s: string) => s.trim().toLocaleLowerCase();
// The page a change names, by its title, its shown name or one of its aliases.
export function pageForTitle(pages: WikiPage[], title: string) {
  const k = key(title);
  return (
    pages.find((p) => key(p.title) === k || key(pageName(p)) === k) ||
    pages.find((p) =>
      p.aliases
        .split(',')
        .map(key)
        .some((a) => a && a === k),
    )
  );
}

// Matches each proposed change to the wiki as it is now: an update to a page that does not exist becomes a new page,
// and a new page whose name is taken becomes an update to it. A second change to the same page is dropped, and so is
// a change to a page whose whole text was not sent (`sent` holds the ids of the pages sent whole).
export function proposalsFor(
  changes: AssistChange[],
  pages: WikiPage[],
  id: () => string,
  sent?: Set<string>,
) {
  const seen = new Set<string>();
  let left = 0;
  const proposals: AssistProposal[] = [];
  for (const ch of changes) {
    const title = ch.title.trim();
    if (!title || !ch.body.trim()) continue;
    const page = pageForTitle(pages, title);
    const k = page ? page.id : key(title);
    if (seen.has(k)) continue;
    seen.add(k);
    if (page && (page.body.length > ASSIST_BODY_LIMIT || (sent && !sent.has(page.id)))) {
      left++;
      continue;
    }
    proposals.push(
      page
        ? {
            ...ch,
            title: page.title,
            kind: page.kind,
            action: 'update',
            id: id(),
            pageId: page.id,
            before: page.body,
            state: 'pending',
          }
        : { ...ch, title, action: 'create', id: id(), state: 'pending' },
    );
  }
  return { proposals, left };
}

const revisionOf = (p: WikiPage) => ({
  sourceId: p.sourceId,
  quote: p.quote,
  body: p.body,
  status: p.status,
  visibility: p.visibility,
  date: p.updated,
});
// Applies one approved change. A new page starts as DM only and Unresolved, like a proposal from a note; an update keeps
// the old text in the page's history.
export function applyProposal(
  c: Campaign,
  p: AssistProposal,
  now: string,
  newId: string,
): { campaign: Campaign; undo: AssistUndo } {
  const m = memoryOf(c),
    old = p.pageId ? m.pages.find((x) => x.id === p.pageId) : undefined;
  const page: WikiPage = old
    ? {
        ...old,
        body: p.body,
        // A new supporting quote replaces the old one and its source note; without one, both stay.
        ...(p.quote.trim() ? { quote: p.quote.slice(0, 800), sourceId: '' } : {}),
        updated: now,
        history: [revisionOf(old), ...old.history],
      }
    : {
        id: newId,
        title: p.title,
        kind: p.kind,
        body: p.body,
        aliases: '',
        status: 'Unresolved',
        visibility: 'DM only',
        sourceId: '',
        quote: p.quote.slice(0, 800),
        updated: now,
        history: [],
      };
  return {
    campaign: {
      ...c,
      memory: {
        ...m,
        pages: old ? m.pages.map((x) => (x.id === old.id ? page : x)) : [page, ...m.pages],
      },
    },
    undo: {
      proposalId: p.id,
      pageId: page.id,
      title: pageName(page),
      previous: old || null,
      applied: now,
    },
  };
}

// Undo is safe only while the page is as the change left it; once the DM edits it, its history is the way back.
export const canUndo = (c: Campaign, u: AssistUndo) =>
  memoryOf(c).pages.some((p) => p.id === u.pageId && p.updated === u.applied);

// Undoes an approved change: a new page is removed (and unlinked from related pages and pins), an updated page goes
// back to how it was.
export function undoProposal(c: Campaign, u: AssistUndo): Campaign {
  if (!canUndo(c, u)) return c;
  const m = memoryOf(c);
  if (u.previous)
    return {
      ...c,
      memory: { ...m, pages: m.pages.map((x) => (x.id === u.pageId ? u.previous! : x)) },
    };
  return {
    ...c,
    memory: {
      ...m,
      pins: m.pins?.filter((id) => id !== u.pageId),
      pages: m.pages
        .filter((x) => x.id !== u.pageId)
        .map((x) =>
          x.related?.includes(u.pageId)
            ? { ...x, related: x.related.filter((id) => id !== u.pageId) }
            : x,
        ),
    },
  };
}

// Notes as text, a PDF, or a photo of handwritten notes. Text is counted in characters, files in bytes.
export const attachmentLimits = { text: 60000, pdf: 8 * 1024 * 1024, image: 3.5 * 1024 * 1024 };
// The type to send for a picked file, or null when it cannot be attached. Markdown goes as plain text.
export function attachmentType(name: string, type: string) {
  if (/\.(md|markdown|txt)$/i.test(name) || type === 'text/plain' || type === 'text/markdown')
    return 'text/plain' as const;
  return (attachmentTypes as readonly string[]).includes(type)
    ? (type as (typeof attachmentTypes)[number])
    : null;
}
