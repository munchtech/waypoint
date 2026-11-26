'use client';
import { useCallback, useEffect, useState } from 'react';
import { appFetch, isDesktop } from '../lib/transport';

// The light or dark theme. Waypoint starts light and the sidebar button switches to dark and back. On the desktop the
// main process saves the choice and drives prefers-color-scheme (and the window frame); data-theme pins the
// stylesheet's color-scheme as well, so the choice also applies where nothing drives prefers-color-scheme.
export type Theme = 'light' | 'dark';
export const themeLabel: Record<Theme, string> = {
  light: 'Theme · Light',
  dark: 'Theme · Dark',
};

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => {
    apply('light');
    if (!isDesktop()) return;
    let live = true;
    appFetch('/api/appearance')
      .then((r) => r.json())
      .then((saved: { theme?: string }) => {
        if (live && (saved.theme === 'light' || saved.theme === 'dark')) {
          setTheme(saved.theme);
          apply(saved.theme);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const next = useCallback(() => {
    const value: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(value);
    apply(value);
    if (isDesktop())
      appFetch('/api/appearance', { method: 'POST', body: JSON.stringify({ theme: value }) }).catch(
        () => {},
      );
  }, [theme]);
  return { theme, next };
}
