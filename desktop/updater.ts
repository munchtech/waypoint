// Updates for the installed build. On launch, and every six hours while it is open, Waypoint asks GitHub Releases for
// a newer version and downloads it in the background. The update installs when Waypoint quits, or straight away from
// "Restart to update". The portable exe, development builds and the self-test never check, except a development
// build that holds a dev-app-update.yml (written by the update test, which points it at a local feed).
import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import fs from 'node:fs';
import path from 'node:path';
import { smoke, state, type Route } from './runtime';

export type UpdateState = 'off' | 'checking' | 'current' | 'downloading' | 'ready' | 'error';
type Status = {
  state: UpdateState;
  available?: string;
  percent?: number;
  error?: string;
  reason?: string;
};

const sixHours = 6 * 60 * 60 * 1000;
let status: Status = { state: 'off', reason: 'Updates have not started.' };
let restartAfterQuit = false;

function offReason() {
  if (smoke) return 'The self-test does not check for updates.';
  if (process.env.PORTABLE_EXECUTABLE_DIR)
    return 'The portable Waypoint.exe does not update itself. Install Waypoint to get updates.';
  if (!app.isPackaged && !fs.existsSync(path.join(app.getAppPath(), 'dev-app-update.yml')))
    return 'Development builds do not check for updates.';
  return '';
}

// A short reason for the DM: the updater's errors carry whole HTTP responses.
function brief(e: unknown) {
  const text = e instanceof Error ? e.message : String(e);
  if (/ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ENOTFOUND|ETIMEDOUT|ECONNREFUSED/.test(text))
    return 'This computer is offline, or GitHub could not be reached.';
  if (/\b404\b|No published versions|latest\.yml/.test(text))
    return 'No release has been published yet.';
  return text.split('\n')[0].slice(0, 200);
}

async function check() {
  if (['off', 'checking', 'downloading', 'ready'].includes(status.state)) return;
  status = { state: 'checking' };
  try {
    const result = await autoUpdater.checkForUpdates();
    // The download runs on; its failure arrives as an 'error' event.
    result?.downloadPromise?.catch(() => {});
  } catch (e) {
    status = { state: 'error', error: brief(e) };
  }
}

// Called once when the app is ready.
export function startUpdates() {
  const reason = offReason();
  if (reason) {
    status = { state: 'off', reason };
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = true;
  autoUpdater.forceDevUpdateConfig = !app.isPackaged;
  autoUpdater.on('update-not-available', () => (status = { state: 'current' }));
  autoUpdater.on(
    'update-available',
    (info) => (status = { state: 'downloading', available: info.version, percent: 0 }),
  );
  autoUpdater.on('download-progress', (progress) => {
    if (status.state === 'downloading')
      status = { ...status, percent: Math.floor(progress.percent) };
  });
  autoUpdater.on(
    'update-downloaded',
    (info) => (status = { state: 'ready', available: info.version }),
  );
  autoUpdater.on('error', (e) => (status = { state: 'error', error: brief(e) }));
  status = { state: 'current' };
  void check();
  setInterval(() => void check(), sixHours).unref();
}

// The DM chose to keep Waypoint open when asked about unsaved changes, so the restart is off.
export function cancelRestart() {
  restartAfterQuit = false;
}

// Called from will-quit, after the stores close. Without a restart request, electron-updater installs on quit itself.
export function installOnQuit() {
  if (restartAfterQuit && status.state === 'ready') autoUpdater.quitAndInstall(true, true);
}

export const updateRoute: Route = async (req) => {
  if (req.path !== '/api/update') return;
  if (req.method === 'POST') {
    const { action } = JSON.parse(req.body || '{}') as { action?: unknown };
    if (action === 'check') {
      if (status.state === 'off') return { status: 409, body: { error: status.reason } };
      await check();
    } else if (action === 'restart') {
      if (status.state !== 'ready')
        return { status: 409, body: { error: 'No update is ready to install yet.' } };
      if (state.library?.isRecording || state.library?.isTranscribing)
        return {
          status: 409,
          body: { error: 'Stop recording or transcription before restarting to update.' },
        };
      restartAfterQuit = true;
      // The usual quit sequence: the window asks about unsaved changes, then the stores close.
      setImmediate(() => app.quit());
    } else return { status: 400, body: { error: 'Choose check or restart.' } };
  }
  return { status: 200, body: { version: app.getVersion(), ...status } };
};
