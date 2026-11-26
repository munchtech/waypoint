// Campaign data: the saved campaigns, the previous save, restore points, recordings, and opening the data folder.
import { app, dialog, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { dataDir, state, type Route } from '../runtime';

// The last campaign book saved, the only file the window may ask to open.
let savedBook = '';

export const campaignsRoute: Route = async (req) => {
  const { store, library } = state;
  // The campaign book: the window lays the book out for print, then this prints it to a PDF and asks where to save it.
  if (req.path === '/api/campaign-book' && req.method === 'POST') {
    const win = state.win;
    if (!win) throw new Error('The Waypoint window is not open.');
    const { fileName } = JSON.parse(req.body || '{}') as { fileName?: unknown };
    const name =
      typeof fileName === 'string' && /^[\w.-]{1,100}\.pdf$/.test(fileName)
        ? fileName
        : 'campaign-book.pdf';
    const pdf = await win.webContents.printToPDF({
      pageSize: 'Letter',
      printBackground: true,
      margins: { top: 0.7, bottom: 0.8, left: 0.75, right: 0.75 },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;text-align:center;font:8pt Georgia,serif;color:#777"><span class="pageNumber"></span></div>',
      generateDocumentOutline: true,
      generateTaggedPDF: true,
    });
    const result = await dialog.showSaveDialog(win, {
      title: 'Save campaign book',
      defaultPath: path.join(app.getPath('documents'), name),
      filters: [{ name: 'PDF document', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return { status: 200, body: { saved: false } };
    fs.writeFileSync(result.filePath, pdf);
    savedBook = result.filePath;
    return { status: 200, body: { saved: true, path: result.filePath } };
  }
  if (req.path === '/api/campaign-book/open' && req.method === 'POST') {
    const { path: file } = JSON.parse(req.body || '{}') as { path?: unknown };
    if (!savedBook || file !== savedBook || !fs.existsSync(savedBook))
      return { status: 400, body: { error: 'That book is no longer where it was saved.' } };
    const failed = await shell.openPath(savedBook);
    return failed ? { status: 400, body: { error: failed } } : { status: 200, body: { ok: true } };
  }
  // A Foundry VTT export: the window builds the file (lib/foundry-export.ts) and this asks where to save it.
  if (req.path === '/api/foundry-export' && req.method === 'POST') {
    const win = state.win;
    if (!win) throw new Error('The Waypoint window is not open.');
    const { fileName, bundle } = JSON.parse(req.body || '{}') as {
      fileName?: unknown;
      bundle?: { format?: unknown };
    };
    if (!bundle || bundle.format !== 'waypoint-foundry')
      return { status: 400, body: { error: 'That is not a Foundry export.' } };
    const name =
      typeof fileName === 'string' && /^[\w.-]{1,100}\.foundry\.json$/.test(fileName)
        ? fileName
        : 'campaign.foundry.json';
    const result = await dialog.showSaveDialog(win, {
      title: 'Save for Foundry VTT',
      defaultPath: path.join(app.getPath('documents'), name),
      filters: [{ name: 'Foundry import file', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { status: 200, body: { saved: false } };
    fs.writeFileSync(result.filePath, JSON.stringify(bundle));
    return { status: 200, body: { saved: true, path: result.filePath } };
  }
  if (req.path === '/api/open-data' && req.method === 'POST') {
    await shell.openPath(dataDir);
    return { status: 200, body: { ok: true } };
  }
  if (req.path.startsWith('/api/recordings/') && req.method === 'POST') {
    if (!library) throw new Error('Recording library unavailable');
    return {
      status: 200,
      body: await library.route(
        req.path.slice('/api/recordings/'.length),
        JSON.parse(req.body || '{}'),
      ),
    };
  }
  if (req.path === '/api/export-previous' && req.method === 'POST') {
    const previous = store?.previous();
    if (!previous) throw new Error('No previous save is available yet.');
    const result = await dialog.showSaveDialog({
      title: 'Export previous campaign save',
      defaultPath: 'waypoint-previous-save.json',
      filters: [{ name: 'Campaign backup', extensions: ['json'] }],
    });
    if (!result.canceled && result.filePath)
      fs.writeFileSync(result.filePath, JSON.stringify(previous, null, 2));
    return { status: 200, body: { saved: !result.canceled } };
  }
  if (req.path.startsWith('/api/restore-points')) {
    if (!store) throw new Error(state.storeError || 'Campaign store unavailable');
    if (req.path === '/api/restore-points' && req.method === 'GET')
      return { status: 200, body: { points: store.restorePoints() } };
    if (req.path === '/api/restore-points/keep' && req.method === 'POST')
      return { status: 200, body: { kept: store.keepPoint('update') } };
    const id = Number((JSON.parse(req.body || '{}') as { id?: unknown }).id);
    if (req.method !== 'POST' || !Number.isInteger(id))
      return { status: 400, body: { error: 'Choose a restore point.' } };
    if (req.path === '/api/restore-points/read')
      return { status: 200, body: store.restorePoint(id) };
    if (req.path === '/api/restore-points/export') {
      const point = store.restorePoint(id),
        created = store.restorePoints().find((p) => p.id === id)?.created || Date.now();
      const result = await dialog.showSaveDialog({
        title: 'Export restore point',
        defaultPath:
          'waypoint-restore-point-' +
          new Date(created).toISOString().slice(0, 16).replace(/[T:]/g, '-') +
          '.json',
        filters: [{ name: 'Campaign backup', extensions: ['json'] }],
      });
      if (!result.canceled && result.filePath)
        fs.writeFileSync(result.filePath, JSON.stringify(point, null, 2));
      return { status: 200, body: { saved: !result.canceled } };
    }
  }
  // Full-text search over the saved campaigns, for matches in campaigns other than the open one.
  if (req.path === '/api/campaigns/search' && req.method === 'POST') {
    if (!store) throw new Error(state.storeError || 'Campaign store unavailable');
    const { query, exclude } = JSON.parse(req.body || '{}') as {
      query?: unknown;
      exclude?: unknown;
    };
    return {
      status: 200,
      body: {
        hits: store.search(typeof query === 'string' ? query : '', {
          exclude: typeof exclude === 'string' ? exclude : '',
          limit: 8,
        }),
      },
    };
  }
  if (req.path === '/api/campaigns') {
    if (!store) throw new Error(state.storeError || 'Campaign store unavailable');
    if (req.method === 'POST') {
      store.save(JSON.parse(req.body || '{}'));
      return { status: 200, body: { saved: true } };
    }
    return { status: 200, body: store.read() };
  }
};
