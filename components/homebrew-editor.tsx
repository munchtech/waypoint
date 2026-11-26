'use client';
import { useState } from 'react';
import { BookOpen, Pin, Trash2 } from 'lucide-react';
import RuleBody from './rule-body';
import { HOMEBREW_BODY, type HomebrewBlock } from '../lib/homebrew';

// A homebrew copy of a library creature, edited in the Rules library's detail pane. Every change saves at once.
export default function HomebrewEditor({
  block,
  pinState,
  onChange,
  onRemove,
  onPin,
  onPrompt,
  onOriginal,
}: {
  block: HomebrewBlock;
  pinState: 'pinned' | 'full' | 'free';
  onChange: (next: HomebrewBlock) => void;
  onRemove: () => void;
  onPin: () => void;
  onPrompt: () => void;
  onOriginal?: () => void;
}) {
  // The name field keeps its own text, so clearing it to retype never saves a nameless creature.
  const [name, setName] = useState(block.name),
    [removing, setRemoving] = useState(false);
  const set = (patch: Partial<HomebrewBlock>) =>
    onChange({ ...block, ...patch, updated: new Date().toISOString() });
  return (
    <div className="homebrew-editor">
      <span className="eyebrow">Homebrew creature · CR {block.cr || '?'}</span>
      <h2>{block.name}</h2>
      <p className="rule-source">
        Copied from {block.base}
        {block.source ? ' · ' + block.source : ''}
        {block.edition ? ' · ' + block.edition : ''}. Kept with this campaign; update packs leave it
        alone.
      </p>
      <div className="rule-actions">
        <button className="button primary" disabled={pinState !== 'free'} onClick={onPin}>
          <Pin size={14} />
          {pinState === 'pinned'
            ? 'On this session’s desk'
            : pinState === 'full'
              ? 'Six references pinned'
              : 'Pin to session'}
        </button>
        <button className="button" onClick={onPrompt}>
          Use in a prompt
        </button>
        {onOriginal && (
          <button className="button" onClick={onOriginal}>
            <BookOpen size={14} />
            Open the original
          </button>
        )}
      </div>
      <div className="homebrew-fields">
        <label>
          Name
          <input
            value={name}
            maxLength={160}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) set({ name: e.target.value });
            }}
            onBlur={() => setName(block.name)}
          />
        </label>
        <label>
          CR
          <input value={block.cr} maxLength={8} onChange={(e) => set({ cr: e.target.value })} />
        </label>
      </div>
      <label className="homebrew-body">
        Stat block
        <textarea
          rows={16}
          value={block.body}
          maxLength={HOMEBREW_BODY}
          onChange={(e) => set({ body: e.target.value })}
        />
      </label>
      <p className="tiny muted">
        Blank lines separate sections. A section whose first line is a heading such as Armor class,
        Hit points, Traits or Actions shows under that heading.
      </p>
      <details className="homebrew-preview" open>
        <summary>Preview</summary>
        <RuleBody body={block.body} />
      </details>
      <div className="map-remove">
        {removing ? (
          <>
            <p>
              Remove {block.name}? Sessions that pinned it keep their snapshot. A restore point can
              bring it back.
            </p>
            <button className="button" onClick={onRemove}>
              Remove copy
            </button>
            <button className="button" onClick={() => setRemoving(false)}>
              Keep it
            </button>
          </>
        ) : (
          <button className="text-button" onClick={() => setRemoving(true)}>
            <Trash2 size={13} />
            Remove this homebrew copy
          </button>
        )}
      </div>
    </div>
  );
}
