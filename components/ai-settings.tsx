'use client';
import {useEffect, useState} from 'react';
import {ArrowUpRight, Check, KeyRound, RefreshCw, Trash2} from 'lucide-react';
import {appFetch} from '../lib/transport';

type Model = {id: string; label: string; note: string};
type Config = {model: string; models: Model[]; hasKey: boolean; canStoreKey: boolean};

// Reads the settings, or saves a change and reads them back. The reply never contains the key.
async function request(body?: unknown): Promise<Config> {
  const response = await appFetch('/api/ai-settings', body === undefined ? {} : {method: 'POST', body: JSON.stringify(body)});
  const data = await response.json() as Partial<Config> & {error?: string};
  if (!response.ok) throw new Error(data.error || 'AI settings are unavailable.');
  return {model: data.model || '', models: Array.isArray(data.models) ? data.models : [], hasKey: Boolean(data.hasKey), canStoreKey: data.canStoreKey !== false};
}

// The Claude connection: the Anthropic API key (sent to the main process once, stored encrypted, never shown again) and the model.
export default function AISettings({onChanged}: {onChanged: () => void}) {
  const [config, setConfig] = useState<Config | null>(null);
  const [key, setKey] = useState(''), [busy, setBusy] = useState(''), [message, setMessage] = useState(''), [error, setError] = useState('');

  const send = async (body: unknown) => setConfig(await request(body));
  useEffect(() => {
    let live = true;
    request().then(loaded => {
      if (live) setConfig(loaded);
    }).catch(() => {
      if (live) setError('Could not read the AI settings.');
    });
    return () => {
      live = false;
    };
  }, []);

  async function act(name: string, work: () => Promise<string>) {
    setBusy(name);
    setError('');
    setMessage('');
    try {
      setMessage(await work());
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work. Try again.');
    } finally {
      setBusy('');
    }
  }
  const saveKey = () => act('key', async () => {
    await send({apiKey: key});
    setKey('');
    return 'Key saved and encrypted on this computer. Test the connection to confirm Anthropic accepts it.';
  });
  const removeKey = () => act('remove', async () => {
    await send({apiKey: null});
    return 'Key removed from this computer.';
  });
  const chooseModel = (model: string) => act('model', async () => {
    await send({model});
    return 'Model saved.';
  });
  const test = () => act('test', async () => {
    const response = await appFetch('/api/ai-test', {method: 'POST'});
    const data = await response.json() as {message?: string; error?: string};
    if (!response.ok) throw new Error(data.error || 'The connection test failed.');
    return data.message || 'Connected.';
  });

  const loaded = !!config, hasKey = !!config?.hasKey, chosen = config?.models.find(m => m.id === config.model);
  return <section className="ai-settings">
    <div className="section-title"><h3><KeyRound size={17}/> Claude</h3><span className="pill neutral">ANTHROPIC API</span></div>
    <p>Waypoint drafts paths, cards and recaps with Claude, using your own Anthropic API key. Anthropic bills that key for each generation, separately from any Claude subscription.</p>
    <div className="info-box">
      <strong>{!loaded ? 'Checking…' : hasKey ? 'A key is saved on this computer' : 'No key yet'}</strong>
      <p>{hasKey ? 'It is encrypted for your Windows account and Waypoint does not show it again. Paste a new key to replace it.' : 'Create a key in the Anthropic Console, add credits there, then paste the key below.'}</p>
      <a className="text-button" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">Open the Anthropic Console <ArrowUpRight size={13}/></a>
    </div>
    {config && !config.canStoreKey && <p className="error-text" role="alert">This computer cannot encrypt a key for your account, so Waypoint will not store one.</p>}
    <label>Anthropic API key<input type="password" autoComplete="off" spellCheck={false} disabled={!loaded || !!busy} value={key} onChange={e => setKey(e.target.value)} placeholder={hasKey ? 'Paste a new key to replace the saved one' : 'sk-ant-…'}/></label>
    <label>Model<select aria-label="Claude model" disabled={!loaded || !!busy} value={config?.model || ''} onChange={e => void chooseModel(e.target.value)}>{(config?.models || []).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
    {chosen && <p className="tiny muted">{chosen.note}</p>}
    <div className="modal-actions">
      <button className="button primary" disabled={!loaded || !!busy || !key.trim()} onClick={() => void saveKey()}><Check size={14}/> {busy === 'key' ? 'Saving…' : 'Save key'}</button>
      <button className="button" disabled={!loaded || !!busy || !hasKey} onClick={() => void test()}><RefreshCw size={14} className={busy === 'test' ? 'spin' : ''}/>{busy === 'test' ? 'Testing…' : 'Test connection'}</button>
      {hasKey && <button className="button" disabled={!!busy} onClick={() => void removeKey()}><Trash2 size={14}/> Remove key</button>}
    </div>
    {message && <p className="connection-ok" role="status">{message}</p>}
    {error && <p className="error-text" role="alert">{error}</p>}
    <p className="tiny muted">When you press a generate button, Waypoint sends your campaign details, the current session, confirmed events, matching wiki notes and saved ideas to Anthropic. Nothing is sent at any other time, and nothing generated is canon until you record it.</p>
    <button className="text-button" onClick={() => void appFetch('/api/open-data', {method: 'POST'})}>Open app data folder</button>
  </section>;
}
