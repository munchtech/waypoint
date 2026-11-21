'use client';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { updateLine, useUpdate } from './use-update';

// The Updates section of AI & backups: the running version, the update status and the buttons that act on it.
export default function UpdateSettings() {
  const { status, check, restart } = useUpdate();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (!status) return null;
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work. Try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="update-settings" aria-label="Updates">
      <div className="section-title">
        <h3>
          <RefreshCw size={17} /> Updates
        </h3>
        <span className="pill neutral">VERSION {status.version}</span>
      </div>
      <p className="update-line" role="status">
        {updateLine(status)}
      </p>
      {['ready', 'current', 'error'].includes(status.state) && (
        <div className="modal-actions">
          {status.state === 'ready' && (
            <button className="button primary" disabled={busy} onClick={() => run(restart)}>
              Restart to update
            </button>
          )}
          {(status.state === 'current' || status.state === 'error') && (
            <button className="button" disabled={busy} onClick={() => run(check)}>
              {busy ? 'Checking…' : 'Check for updates'}
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
    </section>
  );
}
