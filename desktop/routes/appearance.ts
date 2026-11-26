// The light or dark theme. Waypoint starts light; choosing dark is saved in appearance.json as { mode }.
// The older { theme } setting (which could follow Windows) is ignored, so everyone starts light once.
// Electron's nativeTheme drives prefers-color-scheme in every window and the window frame, so the stylesheet's
// light-dark() colours follow it from the first paint.
import { nativeTheme } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { atomicWrite, dataDir, type Route } from '../runtime';

export type Theme = 'light' | 'dark';
const file = path.join(dataDir, 'appearance.json');
const isTheme = (t: unknown): t is Theme => t === 'light' || t === 'dark';

export function savedTheme(): Theme {
  try {
    const { mode } = JSON.parse(fs.readFileSync(file, 'utf8')) as { mode?: unknown };
    return isTheme(mode) ? mode : 'light';
  } catch {
    return 'light';
  }
}

// Called once before the first window opens.
export function applySavedTheme() {
  nativeTheme.themeSource = savedTheme();
}

export const appearanceRoute: Route = async (req) => {
  if (req.path !== '/api/appearance') return;
  if (req.method === 'POST') {
    const { theme } = JSON.parse(req.body || '{}') as { theme?: unknown };
    if (!isTheme(theme)) return { status: 400, body: { error: 'Choose light or dark.' } };
    atomicWrite(file, { mode: theme });
    nativeTheme.themeSource = theme;
  }
  return { status: 200, body: { theme: savedTheme(), dark: nativeTheme.shouldUseDarkColors } };
};
