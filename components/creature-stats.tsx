'use client';
import { useEffect, useState } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import BookText from './book-text';
import RuleBody from './rule-body';
import { appFetch, isDesktop } from '../lib/transport';
import type { RuleEntry } from '../lib/rules';
import { isHomebrew, type Bestiary } from '../lib/homebrew';
import type { EncounterCreature } from '../lib/combat';
import { influenceDc, intelligenceOf } from '../lib/influence';

type Loaded = { name: string; entry?: RuleEntry; error?: string };
async function loadBase(name: string): Promise<RuleEntry> {
  const response = await appFetch('/api/rules/search', {
    method: 'POST',
    body: JSON.stringify({ query: name, kind: 'Creature', edition: 'All', source: 'All' }),
  });
  if (!response.ok) throw Error('The offline creature library could not be searched.');
  const results = (await response.json()) as { entries: RuleEntry[] };
  const exact = results.entries.filter((entry) => entry.name.toLowerCase() === name.toLowerCase());
  const entry =
    exact.find((entry) => entry.edition === '2024' && /^X/.test(entry.source)) ||
    exact.find((entry) => entry.edition === '2024') ||
    exact[0];
  if (!entry)
    throw Error(
      'No exact stat block for “' + name + '” is installed. Import its source in Library → Rules.',
    );
  const detail = await appFetch('/api/rules/entry', {
    method: 'POST',
    body: JSON.stringify({ id: entry.id }),
  });
  if (!detail.ok) throw Error('The ' + name + ' stat block could not be opened.');
  return detail.json() as Promise<RuleEntry>;
}

export default function CreatureStats({
  creature,
  pb,
  onBrowse,
}: {
  creature: EncounterCreature;
  pb?: Bestiary;
  onBrowse?: (name: string) => void;
}) {
  const custom = pb?.statblocks.find((block) => block.id === creature.statblock);
  const [loaded, setLoaded] = useState<{ base: string; entries: Loaded[] }>({
      base: '',
      entries: [],
    }),
    [revision, setRevision] = useState(0);
  const bases = creature.base
    .split('+')
    .map((name) => name.trim())
    .filter(Boolean);
  useEffect(() => {
    if (!isDesktop()) return;
    let current = true;
    void Promise.all(
      creature.base
        .split('+')
        .map((name) => name.trim())
        .filter(Boolean)
        .map(async (name) => {
          try {
            return { name, entry: await loadBase(name) };
          } catch (error) {
            return {
              name,
              error: error instanceof Error ? error.message : 'Stat block unavailable.',
            };
          }
        }),
    ).then((entries) => {
      if (current) setLoaded({ base: creature.base, entries });
    });
    return () => {
      current = false;
    };
  }, [creature.base, revision]);
  const shorthand = custom
    ? [...custom.body.matchAll(/As (?:the )?([^.\n]+)\./gi)].map((match) => match[1])
    : [];
  const related = (pb?.statblocks || []).filter(
    (block) =>
      block.id !== custom?.id &&
      shorthand.some((name) => name.toLowerCase() === block.name.toLowerCase()),
  );
  const inherited = shorthand.length > 0;
  // The campaign's own block decides; otherwise the first base creature the library opened.
  const intelligence =
    (custom && intelligenceOf(custom.body)) ??
    (loaded.base === creature.base
      ? loaded.entries.map((e) => e.entry && intelligenceOf(e.entry.body)).find((n) => n)
      : undefined);
  return (
    <div className="creature-stats">
      {intelligence !== undefined && (
        <p className="rule-summary influence-dc">
          <strong>Influence DC {influenceDc(intelligence)}</strong> (15 or its Intelligence of{' '}
          {intelligence}, whichever is higher). Roll only if it&apos;s hesitant: Friendly gives
          Advantage, Hostile Disadvantage. After a failure, the same ask waits a day.
        </p>
      )}
      {custom && (
        <section className="campaign-statblock">
          {isHomebrew(custom) ? (
            <>
              <span className="eyebrow">HOMEBREW · CR {custom.cr}</span>
              <RuleBody body={custom.body} />
            </>
          ) : (
            <>
              <span className="eyebrow">CAMPAIGN STAT BLOCK · CR {custom.cr}</span>
              <BookText text={custom.body} />
            </>
          )}
        </section>
      )}
      {related.map((block) => (
        <details key={block.id} open className="inherited-statblock">
          <summary>Referenced campaign abilities · {block.name}</summary>
          <BookText text={block.body} />
        </details>
      ))}
      {isDesktop()
        ? bases.map((name) => {
            const result =
              loaded.base === creature.base
                ? loaded.entries.find((entry) => entry.name === name)
                : undefined;
            const body = result?.entry ? (
              <>
                <p className="rule-source">
                  {result.entry.name} · {result.entry.edition} · {result.entry.source}
                  {result.entry.page ? ' · page ' + result.entry.page : ''}
                </p>
                {result.entry.summary && <p className="rule-summary">{result.entry.summary}</p>}
                {result.entry.warnings.map((warning) => (
                  <p className="rule-warning" key={warning}>
                    {warning}
                  </p>
                ))}
                <RuleBody body={result.entry.body} />
              </>
            ) : result?.error ? (
              <div className="info-box">
                <p role="status">{result.error}</p>
                <div className="flow-actions">
                  <button
                    className="button small"
                    onClick={() => setRevision((value) => value + 1)}
                  >
                    <RefreshCw size={13} />
                    Retry
                  </button>
                  {onBrowse && (
                    <button className="button small" onClick={() => onBrowse(name)}>
                      <BookOpen size={13} />
                      Find in library
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p role="status">Loading {name} stat block…</p>
            );
            return custom ? (
              <details
                key={name}
                open={inherited && related.length === 0}
                className="base-statblock"
              >
                <summary>Base reference · {name}</summary>
                {body}
              </details>
            ) : (
              <section key={name} className="base-statblock">
                {body}
              </section>
            );
          })
        : !custom && (
            <p className="info-box">
              Open the desktop app to read the offline {creature.base} stat block.
            </p>
          )}
      {!custom && creature.statblock && (
        <p className="tiny muted">
          The campaign’s custom profile is unavailable. The installed base creature is shown above.
        </p>
      )}
    </div>
  );
}
