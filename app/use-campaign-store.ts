import { useEffect, useRef, useState } from 'react';
import { type Campaign, type Session, demo, uid, campaignsProblem } from '../lib/campaign';
import { SaveQueue } from '../lib/save-queue';
import { appFetch, isDesktop } from '../lib/transport';

type SaveSnapshot = { campaigns: Campaign[]; active: string; sessionId: string };
const storageKey = 'waypoint-campaigns-v1';

// The campaign state store: the campaigns, which campaign and session are open, loading them on start, saving every change,
// and the save status the shell shows. `onError` must keep one identity (a state setter), because the load runs once.
export function useCampaignStore(onError: (message: string) => void) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([demo]);
  const [active, setActive] = useState('demo');
  const [sessionId, setSessionId] = useState('session-demo');
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const saveQueue = useRef(new SaveQueue()),
    saveRevision = useRef(0);
  const [lastSave, setLastSave] = useState<{ snapshot: SaveSnapshot; failed: boolean } | null>(
    null,
  );
  // Save status is derived from the last finished write: it counts only when it saved exactly what is on screen now.
  const finishedSave =
    lastSave &&
    lastSave.snapshot.campaigns === campaigns &&
    lastSave.snapshot.active === active &&
    lastSave.snapshot.sessionId === sessionId
      ? lastSave
      : null;
  const saving = ready && !finishedSave,
    autoSaved = loadFailed ? false : !ready || (!!finishedSave && !finishedSave.failed);
  const campaign = campaigns.find((c) => c.id === active) || campaigns[0];
  const session =
    campaign.sessions.find((s) => s.id === sessionId) ||
    campaign.sessions[campaign.sessions.length - 1];
  useEffect(() => {
    (async () => {
      try {
        let saved: unknown = null;
        if (isDesktop()) {
          const r = await appFetch('/api/campaigns');
          if (!r.ok)
            throw new Error(
              'Campaign file could not be loaded. Restore a backup from app data before continuing.',
            );
          saved = await r.json();
        } else {
          const raw = localStorage.getItem(storageKey);
          if (raw) saved = JSON.parse(raw);
        }
        if (saved) {
          const data = saved as { campaigns: Campaign[]; active: string; sessionId: string };
          const problem = campaignsProblem(data.campaigns);
          if (problem)
            throw new Error(
              `Saved data is invalid (${problem}). Import a valid backup before making changes.`,
            );
          setCampaigns(data.campaigns);
          setActive(data.active || data.campaigns[0].id);
          setSessionId(data.sessionId || '');
        }
        setReady(true);
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Could not load your campaigns.');
        setLoadFailed(true);
      }
    })();
  }, [onError]);
  useEffect(() => {
    if (!ready) return;
    const snapshot: SaveSnapshot = { campaigns, active, sessionId },
      payload = JSON.stringify({ version: 2, ...snapshot }),
      revision = ++saveRevision.current;
    saveQueue.current
      .enqueue(async () => {
        if (isDesktop()) {
          const r = await appFetch('/api/campaigns', { method: 'POST', body: payload });
          if (!r.ok) throw new Error('Save failed');
        } else localStorage.setItem(storageKey, payload);
      })
      .then(() => setLastSave({ snapshot, failed: false }))
      .catch(() => {
        setLastSave({ snapshot, failed: true });
        if (revision === saveRevision.current)
          onError('Could not save your campaign. Export a backup before closing.');
      });
  }, [campaigns, active, sessionId, ready, onError]);
  // Saves happen on every edit, so "saved" is announced once the writing has settled rather than after each keystroke.
  const [saveAnnouncement, setSaveAnnouncement] = useState('');
  useEffect(() => {
    if (!ready || (!saving && !autoSaved)) return;
    const timer = setTimeout(
      () => setSaveAnnouncement(saving ? '' : 'All changes saved'),
      saving ? 0 : 1200,
    );
    return () => clearTimeout(timer);
  }, [ready, saving, autoSaved]);
  useEffect(() => {
    if (!ready || autoSaved) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [ready, autoSaved]);
  const update = (fn: (c: Campaign) => Campaign) =>
    setCampaigns((cs) => cs.map((c) => (c.id === campaign.id ? fn(c) : c)));
  const updateSession = (fn: (s: Session) => Session) =>
    update((c) => ({ ...c, sessions: c.sessions.map((s) => (s.id === session.id ? fn(s) : s)) }));
  // Backups and restore points are added as copies, so existing campaigns are never replaced.
  function addCopies(data: { campaigns?: unknown } | null, label: string) {
    const list = data?.campaigns;
    const problem = campaignsProblem(list);
    if (problem) throw new Error(`This is not a valid Waypoint backup (${problem}).`);
    const restored: Campaign[] = (list as Campaign[]).map((c) => ({
      ...c,
      id: uid(),
      name: c.name + ' (' + label + ')',
    }));
    setCampaigns((cs) => [...cs, ...restored]);
    setActive(restored[0].id);
    setSessionId(restored[0].sessions[0]?.id || '');
    setReady(true);
    return restored.length;
  }
  return {
    campaigns,
    setCampaigns,
    active,
    setActive,
    sessionId,
    setSessionId,
    ready,
    campaign,
    session,
    saving,
    autoSaved,
    saveAnnouncement,
    update,
    updateSession,
    addCopies,
  };
}
