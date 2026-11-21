// The Electron main process: the app window, the local request bridge, the audio protocol and the quit sequence.
// The paths the renderer asks for are answered in routes/, and the packaged self-check lives in smoke-test.ts.
import { dataDir, smoke, state, closeRules } from './runtime';
import { route } from './routes';
import { cancelGeneration } from './routes/ai';
import { applySavedTheme } from './routes/appearance';
import { runSmokeTest } from './smoke-test';
import { cancelRestart, installOnQuit, startUpdates } from './updater';
import { safeWebLink } from '../lib/safe-web-link';
import { audioRange } from '../lib/transcript';
import { Readable } from 'node:stream';
import { CampaignStore } from './campaign-store';
import { RecordingLibrary } from './recordings';
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  shell,
  desktopCapturer,
  dialog,
  nativeTheme,
  protocol,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'waypoint-audio',
    privileges: {
      standard: true,
      secure: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);
function trusted(event: Electron.IpcMainInvokeEvent) {
  const { win } = state;
  if (!win || event.sender !== win.webContents || event.senderFrame !== win.webContents.mainFrame)
    throw new Error('Unknown application window.');
}
ipcMain.handle('waypoint:request', async (event, req) => {
  trusted(event);
  try {
    return await route(req);
  } catch (e) {
    return {
      status: 502,
      body: {
        error:
          e instanceof Error
            ? e.message
            : 'The local engine could not finish. Your campaign is safe.',
      },
    };
  }
});
ipcMain.handle('waypoint:cancel', (event) => {
  trusted(event);
  cancelGeneration();
});
const locked = app.requestSingleInstanceLock();
if (!locked) app.quit();
else {
  app.on('second-instance', () => {
    state.win?.restore();
    state.win?.focus();
  });
  app.whenReady().then(() => {
    applySavedTheme();
    try {
      state.store = new CampaignStore(dataDir);
    } catch (e) {
      state.storeError = e instanceof Error ? e.message : 'Campaign migration failed';
    }
    // The speech helper is too large to ship inside the app. The portable exe looks beside itself; the installed app looks
    // in %LOCALAPPDATA%\Waypoint, because an update replaces everything in its install folder.
    const speechRoots = [
      process.env.PORTABLE_EXECUTABLE_DIR,
      path.join(process.env.LOCALAPPDATA || app.getPath('appData'), 'Waypoint'),
      app.isPackaged
        ? path.dirname(app.getPath('exe'))
        : path.resolve(__dirname, '..', '..', '..', '..', 'outputs'),
    ]
      .filter((dir): dir is string => Boolean(dir))
      .map((dir) => path.join(dir, 'Waypoint-Speech'));
    const speechScript = path.join(dataDir, 'speech-worker.py');
    fs.writeFileSync(speechScript, fs.readFileSync(path.join(__dirname, 'speech-worker.py')));
    const library = (state.library = new RecordingLibrary(dataDir, speechRoots, speechScript));
    protocol.handle('waypoint-audio', (request) => {
      try {
        const url = new URL(request.url);
        if (url.hostname !== 'recording' || !['GET', 'HEAD'].includes(request.method))
          return new Response(null, { status: 403 });
        const file = library.audioFile(url.pathname.slice(1)),
          size = fs.statSync(file).size;
        let range;
        try {
          range = audioRange(request.headers.get('range'), size);
        } catch {
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': 'bytes */' + size },
          });
        }
        const types: Record<string, string> = {
          '.webm': 'audio/webm',
          '.wav': 'audio/wav',
          '.mp3': 'audio/mpeg',
          '.m4a': 'audio/mp4',
          '.ogg': 'audio/ogg',
          '.flac': 'audio/flac',
        };
        const headers: Record<string, string> = {
          'Access-Control-Allow-Origin': 'null',
          'Content-Type': types[path.extname(file)],
          'Accept-Ranges': 'bytes',
          'Content-Length': String(Math.max(0, range.end - range.start + 1)),
          'Cache-Control': 'no-store',
        };
        if (range.status === 206)
          headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
        return new Response(
          request.method === 'HEAD' || !size
            ? null
            : (Readable.toWeb(
                fs.createReadStream(file, { start: range.start, end: range.end }),
              ) as ReadableStream),
          { status: range.status, headers },
        );
      } catch {
        return new Response(null, { status: 404 });
      }
    });
    const win = (state.win = new BrowserWindow({
      width: 1420,
      height: 940,
      minWidth: 850,
      minHeight: 650,
      title: 'Waypoint',
      icon: path.join(__dirname, 'renderer', 'waypoint-icon.png'),
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#111920' : '#f1eee7',
      show: !smoke,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    }));
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: 'Waypoint',
          submenu: [
            { label: 'Open app data folder', click: () => shell.openPath(dataDir) },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        {
          label: 'View',
          submenu: [
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
          ],
        },
      ]),
    );
    win.webContents.setWindowOpenHandler(({ url }) => {
      const safe = safeWebLink(url);
      if (safe)
        void shell
          .openExternal(safe)
          .catch(() =>
            dialog.showErrorBox(
              'Could not open link',
              'Open this address in your browser: ' + safe,
            ),
          );
      return { action: 'deny' };
    });
    win.webContents.on('will-prevent-unload', (event) => {
      if (smoke) {
        event.preventDefault();
        return;
      }
      const choice = dialog.showMessageBoxSync(win, {
        type: 'warning',
        buttons: ['Keep Waypoint open', 'Close without saving'],
        defaultId: 0,
        cancelId: 0,
        message: 'Some campaign changes are not saved yet.',
        detail:
          'Keep Waypoint open until saving finishes. If saving has failed, export a backup first.',
      });
      if (choice === 1) event.preventDefault();
      else cancelRestart();
    });
    win.webContents.on('will-navigate', (e) => e.preventDefault());
    win.webContents.session.setPermissionRequestHandler((wc, permission, callback) =>
      callback(
        wc === state.win?.webContents &&
          (permission === 'media' || permission === 'display-capture'),
      ),
    );
    win.webContents.session.setPermissionCheckHandler(
      (wc, permission) =>
        wc === state.win?.webContents &&
        (permission === 'media' || permission === 'display-capture'),
    );
    win.webContents.session.setDisplayMediaRequestHandler(async (request, callback) => {
      if (request.frame !== state.win?.webContents.mainFrame) {
        callback({});
        return;
      }
      try {
        const screens = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 0, height: 0 },
        });
        if (!screens.length) {
          callback({});
          return;
        }
        callback({ video: screens[0], audio: 'loopback' });
      } catch {
        callback({});
      }
    });
    win.on('closed', () => {
      state.playerWin?.destroy();
      state.win = null;
    });
    win.on('close', (event) => {
      if (library.isRecording || library.isTranscribing) {
        event.preventDefault();
        dialog.showMessageBoxSync(win, {
          type: 'info',
          message: 'Stop recording or transcription before closing Waypoint.',
          detail: 'Your saved audio stays on disk. Use Stop & save or Stop transcription first.',
        });
      }
    });

    win.webContents.on('did-fail-load', (_e, code, description) => {
      console.error('Renderer load failed', code, description);
      if (smoke) app.exit(1);
    });
    win.webContents.on('render-process-gone', () => {
      console.error('Renderer process failed');
      if (smoke) app.exit(1);
    });
    win.webContents.on('did-finish-load', () => {
      console.log('Waypoint desktop renderer loaded.');
      if (smoke) void runSmokeTest(win);
    });
    win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    startUpdates();
  });
}
let quitting = false;
app.on('before-quit', (event) => {
  if (!quitting && locked && state.win) {
    event.preventDefault();
    state.win.close();
  }
});
app.on('window-all-closed', () => {
  cancelGeneration();
  quitting = true;
  app.quit();
});
app.on('will-quit', () => {
  cancelGeneration();
  state.library?.close();
  state.store?.close();
  closeRules();
  installOnQuit();
});
