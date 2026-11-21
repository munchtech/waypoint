'use client';
import { useCallback, useEffect, useState } from 'react';
import { appFetch, isDesktop } from '../lib/transport';

// The installed app's update status, from the main process (desktop/updater.ts). It is asked again every minute,
// which is enough to show a finished download soon after it lands.
export type UpdateStatus = {
  version: string;
  state: 'off' | 'checking' | 'current' | 'downloading' | 'ready' | 'error';
  available?: string;
  percent?: number;
  error?: string;
  reason?: string;
};

async function send(action?: 'check' | 'restart') {
  const r = await appFetch(
    '/api/update',
    action ? { method: 'POST', body: JSON.stringify({ action }) } : undefined,
  );
  const data = (await r.json()) as UpdateStatus & { error?: string };
  if (!r.ok) throw new Error(data.error || 'The update could not start.');
  return data;
}

export function useUpdate() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const refresh = useCallback(
    () =>
      send()
        .then(setStatus)
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    if (!isDesktop()) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    return () => clearInterval(timer);
  }, [refresh]);
  const check = useCallback(async () => setStatus(await send('check')), []);
  const restart = useCallback(async () => setStatus(await send('restart')), []);
  return { status, refresh, check, restart };
}

export function updateLine(status: UpdateStatus) {
  switch (status.state) {
    case 'off':
      return status.reason || 'Updates are off.';
    case 'checking':
      return 'Checking for updates…';
    case 'current':
      return 'Up to date.';
    case 'downloading':
      return `Downloading version ${status.available} · ${status.percent ?? 0}%`;
    case 'ready':
      return `Version ${status.available} is ready. It installs when Waypoint closes, or restart now.`;
    case 'error':
      return 'Could not check for updates. ' + (status.error || '');
  }
}
