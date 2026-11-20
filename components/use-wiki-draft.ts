import { useState } from 'react';
import type { Campaign } from '../lib/campaign';
import { memoryOf, wikiPage, type WikiPage } from '../lib/memory';

export function useWikiDraft(campaign: Campaign, initialId?: string) {
  const prefix = 'waypoint-wiki-draft:' + campaign.id + ':',
    indexKey = prefix + 'last';
  const [loaded] = useState(() => {
    try {
      const id = initialId || localStorage.getItem(indexKey);
      if (!id) return null;
      const parsed = wikiPage.safeParse(JSON.parse(localStorage.getItem(prefix + id) || 'null'));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  });
  const [draft, setDraftState] = useState<WikiPage | null>(
    () =>
      loaded ||
      structuredClone(memoryOf(campaign).pages.find((page) => page.id === initialId) || null),
  );
  const [failure, setFailure] = useState('');
  function setDraft(value: WikiPage | null) {
    setDraftState(value);
    if (!value) return;
    try {
      const saved = memoryOf(campaign).pages.find((page) => page.id === value.id);
      if (saved && JSON.stringify(saved) === JSON.stringify(value)) {
        localStorage.removeItem(prefix + value.id);
        if (localStorage.getItem(indexKey) === value.id) localStorage.removeItem(indexKey);
      } else {
        localStorage.setItem(prefix + value.id, JSON.stringify(value));
        localStorage.setItem(indexKey, value.id);
      }
      setFailure('');
    } catch {
      setFailure(
        'Local draft recovery is unavailable. Save this page or copy your edits before leaving.',
      );
    }
  }
  function clearDraft() {
    if (draft) {
      try {
        localStorage.removeItem(prefix + draft.id);
        if (localStorage.getItem(indexKey) === draft.id) localStorage.removeItem(indexKey);
      } catch {
        setFailure('The page is saved, but its local recovery copy could not be cleared.');
      }
    }
    setDraftState(null);
  }
  return { draft, setDraft, clearDraft, failure, recovered: !!loaded };
}
