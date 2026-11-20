// What the players see: the separate player display window, and the player site, one site.html the DM uploads.
import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { playerDocument } from '../../lib/player-display';
import { dataDir, smoke, state, type Route } from '../runtime';

export const playersRoute: Route = async (req) => {
  if (req.path === '/api/player/show' || req.path === '/api/player/clear') {
    if (req.method !== 'POST') throw new Error('Use POST for player display.');
    const html = playerDocument(
      req.path.endsWith('/clear')
        ? { title: 'The story continues…', body: 'Waiting for your dungeon master.' }
        : JSON.parse(req.body || '{}'),
    );
    if (!state.playerWin || state.playerWin.isDestroyed()) {
      if (req.path.endsWith('/clear')) return { status: 200, body: { ok: true } };
      const playerWin = (state.playerWin = new BrowserWindow({
        width: 1000,
        height: 760,
        show: !smoke,
        title: 'Waypoint · Player display',
        autoHideMenuBar: true,
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          partition: 'waypoint-player',
        },
      }));
      playerWin.setMenu(null);
      playerWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      playerWin.webContents.on('will-navigate', (e) => e.preventDefault());
      playerWin.webContents.session.setPermissionRequestHandler((_w, _p, cb) => cb(false));
      playerWin.on('closed', () => {
        state.playerWin = null;
      });
    }
    await state.playerWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    if (!smoke) state.playerWin.show();
    return { status: 200, body: { ok: true } };
  }
  // The player site: Waypoint asks where to keep site.html once, remembers the path, and rewrites it on every send.
  if (req.path === '/api/site/write' && req.method === 'POST') {
    const { html, choose } = JSON.parse(req.body || '{}') as { html?: unknown; choose?: unknown };
    if (typeof html !== 'string' || !html.startsWith('<!doctype html>') || html.length > 20000000)
      return { status: 400, body: { error: 'The site page could not be built.' } };
    const file = path.join(dataDir, 'site.json');
    let target = '';
    try {
      target = (JSON.parse(fs.readFileSync(file, 'utf8')) as { path?: string }).path || '';
    } catch {}
    if (choose || !target || !fs.existsSync(path.dirname(target))) {
      const result = await dialog.showSaveDialog({
        title: 'Where should Waypoint keep your player site?',
        defaultPath: target || path.join(app.getPath('documents'), 'site.html'),
        filters: [{ name: 'Web page', extensions: ['html'] }],
      });
      if (result.canceled || !result.filePath) return { status: 200, body: { saved: false } };
      target = result.filePath;
      fs.writeFileSync(file, JSON.stringify({ path: target }));
    }
    fs.writeFileSync(target, html);
    return { status: 200, body: { saved: true, path: target } };
  }
  if (req.path === '/api/site/where' && req.method === 'GET') {
    try {
      const target =
        (JSON.parse(fs.readFileSync(path.join(dataDir, 'site.json'), 'utf8')) as { path?: string })
          .path || '';
      return { status: 200, body: { path: target } };
    } catch {
      return { status: 200, body: { path: '' } };
    }
  }
};
