// Update packs: which ones are available, one pack's content, and opening the folder the DM can drop new packs into.
import { shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { dataDir, type Route } from '../runtime';
import { PackFolders } from '../packs';

const packs = new PackFolders(path.join(__dirname, 'data', 'packs'), path.join(dataDir, 'packs'));

export const packsRoute: Route = async (req) => {
  if (req.path === '/api/packs' && req.method === 'GET')
    return { status: 200, body: { packs: packs.list() } };
  if (req.path === '/api/packs/read' && req.method === 'POST') {
    const { id } = JSON.parse(req.body || '{}') as { id?: unknown };
    const pack = typeof id === 'string' ? packs.get(id) : null;
    return pack
      ? { status: 200, body: pack }
      : { status: 404, body: { error: 'That update pack is no longer available.' } };
  }
  if (req.path === '/api/packs/open-folder' && req.method === 'POST') {
    fs.mkdirSync(packs.user, { recursive: true });
    await shell.openPath(packs.user);
    return { status: 200, body: { ok: true } };
  }
};
