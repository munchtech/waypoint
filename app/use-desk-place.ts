import { type RefObject, useLayoutEffect, useRef } from 'react';
import { deskPlace, keepPlace, placeOf, scrollToPlace } from '../lib/scroll-place';

// Keeps your place on each desk tab. Changing tab (or session) goes back to where you were on it, or to its start.
export function useDeskPlace(
  campaignId: string,
  sessionId: string,
  tab: string,
  // The thing opened from a search or link: it does its own scrolling.
  target: unknown,
  tabs: RefObject<HTMLElement | null>,
) {
  const key = deskPlace(campaignId, sessionId, tab),
    before = useRef({ campaignId, key, target });
  useLayoutEffect(() => {
    const was = before.current;
    before.current = { campaignId, key, target };
    if (was.key !== key && was.campaignId === campaignId && was.target === target) {
      const above = tabs.current?.previousElementSibling,
        bar = document.querySelector('.topbar')?.getBoundingClientRect().height || 0,
        start = above
          ? Math.max(0, above.getBoundingClientRect().bottom + window.scrollY - bar)
          : 0,
        kept = placeOf(key),
        // The page may already have shrunk around a tab that is still loading, so this is where the last one was left.
        left = Math.max(window.scrollY, placeOf(was.key) ?? 0);
      // From down the page, land on the tab's own content rather than back up at the session banner.
      if (left > start) scrollToPlace(Math.max(kept ?? 0, start));
      else if (kept !== undefined) scrollToPlace(kept);
    }
    const keep = () => keepPlace(key, window.scrollY);
    window.addEventListener('scroll', keep, { passive: true });
    return () => window.removeEventListener('scroll', keep);
  }, [campaignId, key, target, tabs]);
}
