'use client';
import { useMemo, useState } from 'react';
import { Castle, Copy, FileDown } from 'lucide-react';
import type { Campaign } from '../lib/campaign';
import { appFetch, isDesktop } from '../lib/transport';
import {
  foundryBundle,
  foundryFileName,
  foundryPartLabels,
  foundryParts,
  foundrySummary,
  type FoundryPart,
} from '../lib/foundry-export';
import { foundryMacro } from '../lib/foundry-macro';

// Foundry VTT export: a file of journal entries, roll tables and creatures, and the macro that imports it into Foundry.
export default function FoundryExportPanel({ campaign }: { campaign: Campaign }) {
  const [parts, setParts] = useState<FoundryPart[]>([...foundryParts]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const summary = useMemo(() => foundrySummary(campaign, parts), [campaign, parts]);
  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const bundle = foundryBundle(campaign, parts),
        fileName = foundryFileName(campaign.name);
      if (isDesktop()) {
        const response = await appFetch('/api/foundry-export', {
          method: 'POST',
          body: JSON.stringify({ fileName, bundle }),
        });
        const result = (await response.json()) as {
          saved?: boolean;
          path?: string;
          error?: string;
        };
        if (!response.ok) throw Error(result.error || 'The file could not be saved.');
        if (result.saved && result.path) setMessage('Saved to ' + result.path);
      } else {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(bundle)], { type: 'application/json' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage('Downloaded ' + fileName);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'The file could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="paper campaign-book-panel foundry-panel">
      <h3>
        <Castle size={17} /> Foundry VTT export
      </h3>
      <p className="muted">
        Take the campaign to Foundry VTT: wiki pages and handouts become journal entries, with
        players able to open only what the party knows and your handouts. Session plans and stat
        blocks stay for the GM, and roll tables roll in Foundry.
      </p>
      <div className="book-options">
        <fieldset>
          <legend>Include</legend>
          {foundryParts.map((part) => (
            <label key={part}>
              <input
                type="checkbox"
                checked={parts.includes(part)}
                onChange={(e) =>
                  setParts((now) =>
                    e.target.checked ? [...now, part] : now.filter((p) => p !== part),
                  )
                }
              />
              {foundryPartLabels[part]}
            </label>
          ))}
        </fieldset>
        <ol className="foundry-steps">
          <li>Save the file.</li>
          <li>
            In Foundry, as the GM, make a new macro, set its type to Script and paste the import
            macro.
          </li>
          <li>
            Run the macro and choose the file. Importing again later updates the same entries; pages
            and items you add in Foundry stay.
          </li>
        </ol>
      </div>
      <div className="book-actions">
        <button
          className="button primary"
          onClick={() => void save()}
          disabled={busy || !summary.length}
        >
          <FileDown size={15} />
          {busy ? 'Saving…' : isDesktop() ? 'Save for Foundry' : 'Download for Foundry'}
        </button>
        <button
          className="button"
          onClick={() =>
            void navigator.clipboard.writeText(foundryMacro).then(
              () => setMessage('Import macro copied. Paste it into a Script macro in Foundry.'),
              () => setMessage('The macro could not be copied. Select it below and copy it.'),
            )
          }
        >
          <Copy size={15} /> Copy import macro
        </button>
        <span className="muted">
          {summary.length ? summary.join(' · ') : 'Nothing to export with these choices.'}
        </span>
      </div>
      {message && (
        <p className="book-message" role="status">
          {message}
        </p>
      )}
      <p className="tiny muted">
        Creatures become actors in a dnd5e world; in other systems their stat blocks are journal
        pages. Who can see each page follows its Party knows setting in Waypoint.
      </p>
      <details className="foundry-macro">
        <summary>Show the import macro</summary>
        <textarea
          readOnly
          rows={10}
          value={foundryMacro}
          aria-label="Import macro"
          onFocus={(e) => e.target.select()}
        />
      </details>
    </section>
  );
}
