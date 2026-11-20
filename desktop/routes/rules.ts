// The rules library: search, one entry, and importing JSON collections.
import { dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { rules, state, type Route } from '../runtime';

let rulesImporting = false;

export const rulesRoute: Route = async (req) => {
  if (req.path === '/api/rules/search' && req.method === 'POST')
    return { status: 200, body: rules().search(JSON.parse(req.body || '{}')) };
  if (req.path === '/api/rules/entry' && req.method === 'POST') {
    const { id } = JSON.parse(req.body || '{}');
    if (typeof id !== 'string' || id.length > 2000) throw new Error('Invalid reference.');
    return { status: 200, body: rules().get(id) };
  }
  if (req.path === '/api/rules/import' && req.method === 'POST') {
    if (rulesImporting) return { status: 409, body: { error: 'An import is already open.' } };
    rulesImporting = true;
    try {
      const result = await dialog.showOpenDialog(state.win!, {
        title: 'Import JSON collections',
        filters: [{ name: 'JSON reference data', extensions: ['json'] }],
        properties: ['openFile', 'multiSelections'],
      });
      if (result.canceled) return { status: 200, body: { canceled: true } };
      if (result.filePaths.length > 50) throw new Error('Choose at most 50 JSON files at a time.');
      const packs: unknown[] = [];
      let bytes = 0;
      for (const file of result.filePaths) {
        const size = (await fs.promises.stat(file)).size;
        bytes += size;
        if (size > 40000000 || bytes > 100000000)
          throw new Error('Use files under 40 MB and an import under 100 MB.');
        try {
          packs.push(JSON.parse(await fs.promises.readFile(file, 'utf8')));
        } catch {
          throw new Error('Could not read ' + path.basename(file) + '. No entries were imported.');
        }
      }
      return { status: 200, body: rules().importData(packs) };
    } finally {
      rulesImporting = false;
    }
  }
};
