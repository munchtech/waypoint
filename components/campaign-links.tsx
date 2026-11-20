'use client';
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { WikiPage } from '../lib/memory';
import type { GoPlace } from '../lib/go-links';
import { mentionIndex, splitMentions } from '../lib/wiki-mentions';
import { plainPreview } from '../lib/plain-text';

type Links = { pages: WikiPage[]; onOpen: (id: string) => void; onGo?: (place: GoPlace) => void };
export const CampaignLinks = createContext<Links | null>(null);
export const useGo = () => useContext(CampaignLinks)?.onGo;

export function useMentionRenderer(excludeId?: string, every = false) {
  const links = useContext(CampaignLinks);
  const pages = links?.pages;
  const index = useMemo(() => mentionIndex(pages || [], excludeId), [pages, excludeId]);
  return (text: string, seen: Set<string>): ReactNode => {
    if (!links) return text;
    return splitMentions(text, index, seen, every).map((part, i) => {
      const page = part.pageId ? links.pages.find((page) => page.id === part.pageId) : undefined;
      return page ? (
        <button
          type="button"
          key={i}
          className="wiki-mention"
          title={page.title + ' · ' + page.status + '\n' + plainPreview(page.body, 180)}
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
