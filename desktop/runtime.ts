// The main process's shared state: the data folder, the test flags, and the windows and stores the routes use.
// It runs before anything else reads app paths, because every module that needs dataDir imports it from here.
import { app, type BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { CampaignStore } from './campaign-store';
import type { RecordingLibrary } from './recordings';
import { RulesStore } from './rules-store';

app.setName('Waypoint');
export const smoke = process.argv.includes('--smoke-test');
const preview = process.argv.includes('--preview-test');
if (smoke || preview) {
  removeOldIsolatedFolders();
  app.setPath('userData', path.join(app.getPath('temp'), 'waypoint-isolated-smoke-' + process.pid));
}
export const dataDir = app.getPath('userData');

// An isolated run's data folder is in use until that app exits, so each isolated run removes the ones left by earlier
// runs that have ended. A folder whose process is still running is left alone.
function removeOldIsolatedFolders() {
  const temp = app.getPath('temp');
  const running = (pid: number) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return (e as NodeJS.ErrnoException).code === 'EPERM';
    }
  };
  try {
    for (const name of fs.readdirSync(temp)) {
      const pid = Number(/^waypoint-isolated-smoke-(\d+)$/.exec(name)?.[1]);
      if (pid && pid !== process.pid && !running(pid))
        fs.rmSync(path.join(temp, name), { recursive: true, force: true });
    }
  } catch {
    // Never let tidying stop a test run.
  }
}
fs.mkdirSync(dataDir, { recursive: true });

// Filled in by main.ts once the app is ready; null until then, and the windows again after they close.
export const state = {
  win: null as BrowserWindow | null,
  playerWin: null as BrowserWindow | null,
  store: null as CampaignStore | null,
  library: null as RecordingLibrary | null,
  storeError: '',
};

let rulesStore: RulesStore | null = null;
export function rules() {
  return (rulesStore ??= new RulesStore(dataDir, path.join(__dirname, 'data', 'srd-5etools.json')));
}
export function closeRules() {
  rulesStore?.close();
}

export function atomicWrite(file: string, value: unknown) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

export type LocalRequest = { path: string; method: string; body?: string };
export type LocalResponse = { status: number; body: unknown };
// Each route module answers the paths it owns and returns undefined for the rest.
export type Route = (req: LocalRequest) => Promise<LocalResponse | undefined>;
