'use client';
import { useCallback, useEffect, useState } from 'react';
import { appFetch, isDesktop } from '../lib/transport';

// The light or dark theme. "system" follows Windows. On the desktop the main process saves the choice and drives
// prefers-color-scheme (and the window frame); data-theme pins the stylesheet's color-scheme as well, so the choice
// also applies where nothing drives prefers-color-scheme.
export type Theme = 'system' | 'light' | 'dark';
const order: Theme[] = ['system', 'light', 'dark'];
export const themeLabel: Record<Theme, string> = {
  system: 'Theme · Windows',
  light: 'Theme · Light',
  dark: 'Theme · Dark',
};

function apply(theme: Theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  useEffect(() => {
    if (!isDesktop()) return;
    let live = true;
    appFetch('/api/appearance')
      .then((r) => r.json())
      .then((saved: { theme?: Theme }) => {
        if (live && saved.theme && order.includes(saved.theme)) {
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
    const value = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(value);
    apply(value);
    if (isDesktop())
      appFetch('/api/appearance', { method: 'POST', body: JSON.stringify({ theme: value }) }).catch(
        () => {},
      );
  }, [theme]);
  return { theme, next };
}
