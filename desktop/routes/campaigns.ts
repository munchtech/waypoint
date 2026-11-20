// Campaign data: the saved campaigns, the previous save, restore points, recordings, and opening the data folder.
import { dialog, shell } from 'electron';
import fs from 'node:fs';
import { dataDir, state, type Route } from '../runtime';

export const campaignsRoute: Route = async (req) => {
  const { store, library } = state;
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
  if (req.path === '/api/campaigns') {
    if (!store) throw new Error(state.storeError || 'Campaign store unavailable');
    if (req.method === 'POST') {
      store.save(JSON.parse(req.body || '{}'));
      return { status: 200, body: { saved: true } };
    }
    return { status: 200, body: store.read() };
  }
};
