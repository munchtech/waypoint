'use client';
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { WikiPage } from '../lib/memory';
import type { GoPlace } from '../lib/go-links';
import { mentionIndex, splitMentions } from '../lib/wiki-mentions';
import { plainPreview } from '../lib/plain-text';
import { pageName } from '../lib/page-name';

// `onOpen` takes a page id, or `creature:<name>` for a stat block (see lib/wiki-mentions). `creatures` names the campaign's
// own stat blocks so prose can link them.
type Links = {
  pages: WikiPage[];
  onOpen: (id: string) => void;
  onGo?: (place: GoPlace) => void;
  creatures?: string[];
};
export const CampaignLinks = createContext<Links | null>(null);
export const useGo = () => useContext(CampaignLinks)?.onGo;
export function useCreatureOpener() {
  const links = useContext(CampaignLinks);
  return links ? (name: string) => links.onOpen('creature:' + name) : undefined;
}

export function useMentionRenderer(excludeId?: string, every = false) {
  const links = useContext(CampaignLinks);
  const pages = links?.pages,
    creatures = links?.creatures;
  const index = useMemo(
    () => mentionIndex(pages || [], excludeId, creatures),
    [pages, excludeId, creatures],
  );
  return (text: string, seen: Set<string>): ReactNode => {
    if (!links) return text;
    return splitMentions(text, index, seen, every).map((part, i) => {
      if (part.pageId?.startsWith('creature:'))
        return (
          <button
            type="button"
            key={i}
            className="wiki-mention creature-mention"
            title={'Stat block · ' + part.pageId.slice(9)}
            onClick={() => links.onOpen(part.pageId!)}
          >
            {part.text}
          </button>
        );
      const page = part.pageId ? links.pages.find((page) => page.id === part.pageId) : undefined;
      return page ? (
        <button
          type="button"
          key={i}
          className="wiki-mention"
          title={pageName(page) + ' · ' + page.status + '\n' + plainPreview(page.body, 180)}
          onClick={() => links.onOpen(page.id)}
        >
          {part.text}
        </button>
      ) : (
        part.text
      );
    });
  };
}
