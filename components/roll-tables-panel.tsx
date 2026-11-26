'use client';
import { useMemo, useState } from 'react';
import { Dices } from 'lucide-react';
import type { Campaign } from '../lib/campaign';
import { campaignTables, type FoundTable } from '../lib/roll-tables';
import { RollButton, useRoll } from './roll-table';

function TableRow({ found }: { found: FoundTable }) {
  const { result, roll } = useRoll(found.table);
  return (
    <li className="random-table">
      <div>
        <strong>{found.title}</strong>
        <small>
          d{found.table.sides} · {found.table.entries.length} rows · {found.source}
        </small>
      </div>
      <RollButton table={found.table} result={result} roll={roll} />
    </li>
  );
}
// Every rollable table in the campaign in one place, to roll during play without finding the page it lives on.
export default function RollTablesPanel({ campaign }: { campaign: Campaign }) {
  const tables = useMemo(() => campaignTables(campaign), [campaign]);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase(),
    shown = tables.filter((t) => (t.title + ' ' + t.source).toLowerCase().includes(q));
  return (
    <section className="paper random-tables-panel">
      <h3>
        <Dices size={18} /> Random tables
      </h3>
      <p className="muted">
        Tables whose first column is a die, and numbered lists after a line like “Rumours (d6):”,
        roll here and wherever they appear. Add one with New loot table in the World wiki.
      </p>
      {tables.length > 6 && (
        <input
          type="search"
          aria-label="Find a table"
          placeholder="Find a table"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      {tables.length ? (
        <ul className="random-table-list">
          {shown.map((t) => (
            <TableRow key={t.id} found={t} />
          ))}
        </ul>
      ) : (
        <p>No rollable tables yet.</p>
      )}
    </section>
  );
}
