// Claude settings and generation: the chosen model in ai.json, and the Anthropic API key encrypted by the operating system
// for this account in ai-key.bin. The key never leaves the main process: the renderer sends it once to save it and
// afterwards only learns whether one is saved.
import { safeStorage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import {
  DEFAULT_MODEL,
  MODELS,
  generateCloud,
  testKey,
  validKey,
  validSettings,
  type Settings,
} from '../cloud-engine';
import { atomicWrite, dataDir, state, type Route } from '../runtime';

const aiFile = path.join(dataDir, 'ai.json'),
  keyFile = path.join(dataDir, 'ai-key.bin');
let cachedKey: string | undefined,
  controller: AbortController | null = null;
function readAI(): Settings {
  try {
    return validSettings(JSON.parse(fs.readFileSync(aiFile, 'utf8')));
  } catch {
    return { model: DEFAULT_MODEL };
  }
}
function readKey() {
  if (cachedKey === undefined) {
    try {
      cachedKey = safeStorage.isEncryptionAvailable()
        ? safeStorage.decryptString(fs.readFileSync(keyFile))
        : '';
    } catch {
      cachedKey = '';
    }
  }
  return cachedKey;
}
function writeKey(key: string | null) {
  if (key === null) {
    fs.rmSync(keyFile, { force: true });
    cachedKey = '';
    return;
  }
  if (!safeStorage.isEncryptionAvailable())
    throw new Error('This computer cannot encrypt the key for your account, so it was not saved.');
  const tmp = keyFile + '.tmp';
  fs.writeFileSync(tmp, safeStorage.encryptString(key));
  fs.renameSync(tmp, keyFile);
  cachedKey = key;
}
// Stops a running generation: the Stop waiting button, and quitting.
export function cancelGeneration() {
  controller?.abort();
}

export const aiRoute: Route = async (req) => {
  // Ready means a key is saved. Whether Anthropic accepts it is checked on demand (/api/ai-test) and on the first generation, never in the background.
  if (req.path === '/api/generate' && req.method === 'GET')
    return {
      status: 200,
      body: {
        ready: Boolean(readKey()),
        desktop: true,
        provider: 'anthropic',
        model: readAI().model,
      },
    };
  if (req.path === '/api/ai-settings') {
    if (req.method === 'POST') {
      const value = JSON.parse(req.body || '{}') as { model?: unknown; apiKey?: unknown };
      if (value.model !== undefined) atomicWrite(aiFile, validSettings({ model: value.model }));
      if (value.apiKey === null) writeKey(null);
      else if (value.apiKey !== undefined) writeKey(validKey(value.apiKey));
    }
    return {
      status: 200,
      body: {
        provider: 'anthropic',
        model: readAI().model,
        models: MODELS,
        hasKey: Boolean(readKey()),
        canStoreKey: safeStorage.isEncryptionAvailable(),
      },
    };
  }
  if (req.path === '/api/ai-test' && req.method === 'POST') {
    const key = readKey();
    if (!key) throw new Error('Save your Anthropic API key first.');
    return { status: 200, body: await testKey(readAI(), key) };
  }
  if (req.path === '/api/generate' && req.method === 'POST') {
    if (controller) return { status: 409, body: { error: 'A generation is already running.' } };
    if ((req.body?.length || 0) > 180000)
      return { status: 413, body: { error: 'Shorten older campaign notes before generating.' } };
    const key = readKey();
    if (!key)
      return {
        status: 503,
        body: { error: 'Add your Anthropic API key in AI & backups to generate.' },
      };
    controller = new AbortController();
    const timer = setTimeout(() => controller?.abort(), 600000);
    try {
      // Progress goes to the app window as it streams; the finished result is still this request's reply.
      const body = await generateCloud(
        readAI(),
        key,
        JSON.parse(req.body || '{}'),
        controller.signal,
        (label) => state.win?.webContents.send('waypoint:progress', { label }),
      );
      return { status: 200, body };
    } finally {
      clearTimeout(timer);
      controller = null;
    }
  }
};
