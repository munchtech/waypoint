'use client';
import { useContext, useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { SessionNote, WikiPage } from '../lib/memory';
import { backlinks, sharedIndex } from '../lib/backlinks';
import { CampaignLinks } from './campaign-links';

// Every wiki page and source note that names `target` (a page id, or `creature:<name>`), with the words around the first
// mention. A title opens its page or note when a handler for it is given, and is plain text otherwise.
export default function MentionedIn({
  target,
  pages,
  notes,
  onOpenPage,
  onOpenNote,
}: {
  target: string;
  pages: WikiPage[];
  notes: SessionNote[];
  onOpenPage?: (id: string) => void;
  onOpenNote?: (id: string) => void;
}) {
  const creatures = useContext(CampaignLinks)?.creatures;
  const list = useMemo(
    () => backlinks(target, pages, notes, sharedIndex(pages, creatures)),
    [target, pages, notes, creatures],
  );
  const [all, setAll] = useState(false);
  if (!list.length) return null;
  const shown = all ? list : list.slice(0, 6);
  return (
    <section className="mentioned-in">
      <h3>
        Mentioned in <span className="mentioned-count">{list.length}</span>
      </h3>
      <ul>
        {shown.map((link) => {
          const open = link.kind === 'Wiki' ? onOpenPage : onOpenNote;
          return (
            <li key={link.kind + ':' + link.id}>
              <div className="mentioned-head">
                {open ? (
                  <button className="text-button" onClick={() => open(link.id)}>
                    {link.title}
                    <ArrowUpRight size={13} />
                  </button>
                ) : (
                  <strong>{link.title}</strong>
                )}
                <small>
                  {link.kind === 'Journal' ? 'Source note' : link.pageKind}
                  {link.count > 1 && ' · ' + link.count + ' mentions'}
                </small>
              </div>
              <p>
                {link.before}
                <mark>{link.match}</mark>
                {link.after}
              </p>
            </li>
          );
        })}
      </ul>
      {list.length > 6 && (
        <button className="text-button" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : 'Show all ' + list.length}
        </button>
      )}
    </section>
  );
}
