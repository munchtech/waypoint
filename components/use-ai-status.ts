'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {appFetch} from '../lib/transport';

// Whether generation can run: on the desktop that means an Anthropic API key is saved.
type Status = {ready: boolean; provider: string; model: string; state: 'checking' | 'ready' | 'no-key' | 'unreachable'};

export function useAIStatus() {
  const [status, setStatus] = useState<Status>({ready: false, provider: '', model: '', state: 'checking'});
  const pending = useRef<Promise<boolean> | null>(null), mounted = useRef(true);
  const refresh = useCallback(() => {
    if (pending.current) return pending.current;
    const task = (async () => {
      try {
        const response = await appFetch('/api/generate');
        if (!response.ok) throw new Error('Could not check the AI connection.');
        const health = await response.json() as {ready?: boolean; provider?: string; model?: string};
        const ready = Boolean(health.ready);
        if (mounted.current) setStatus({ready, provider: health.provider || '', model: health.model || '', state: ready ? 'ready' : 'no-key'});
        return ready;
      } catch {
        if (mounted.current) setStatus(s => ({...s, ready: false, state: 'unreachable'}));
        return false;
      } finally {
        pending.current = null;
      }
    })();
    pending.current = task;
    return task;
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refresh]);
  return {...status, refresh};
}
